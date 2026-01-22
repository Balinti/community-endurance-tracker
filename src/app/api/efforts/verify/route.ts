import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySubmission, computeScore } from "@/lib/scoring";

const SHARED_SUPABASE_URL = "https://qdrtpwpnbzvkpqjilyfh.supabase.co";
const SHARED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4";

export async function POST(request: NextRequest) {
  try {
    const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

    const { data: sessionData } = await sharedSupabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get submission with effort
    const { data: submission, error: subError } = await appSupabase
      .from("submissions")
      .select(`
        *,
        efforts!inner(*)
      `)
      .eq("id", submissionId)
      .eq("user_id", currentUser.id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Get entitlements
    const { data: entitlement } = await appSupabase
      .from("entitlements")
      .select("*")
      .eq("user_id", currentUser.id)
      .single();

    const isPro = entitlement?.plan === "pro";

    // Check credits (if not pro)
    if (!isPro) {
      const { data: ledger } = await appSupabase
        .from("verification_credits_ledger")
        .select("delta")
        .eq("user_id", currentUser.id)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const usedCredits = (ledger || []).reduce((sum, l) => sum + Math.abs(l.delta), 0);
      const monthlyLimit = entitlement?.verification_credits_monthly || 4;

      if (usedCredits >= monthlyLimit) {
        return NextResponse.json({
          error: "No verification credits remaining. Upgrade to Pro for unlimited verifications.",
        }, { status: 402 });
      }

      // Deduct credit
      await appSupabase.from("verification_credits_ledger").insert({
        id: crypto.randomUUID(),
        user_id: currentUser.id,
        delta: -1,
        reason: "verification_request",
      });
    }

    // Run verification
    const effort = submission.efforts as { duration_seconds: number; avg_hr: number | null };
    const result = verifySubmission(effort.duration_seconds, effort.avg_hr);

    // Get baseline for scoring
    const { data: firstSubmission } = await appSupabase
      .from("submissions")
      .select("efforts!inner(duration_seconds)")
      .eq("user_id", currentUser.id)
      .eq("status", "verified")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const firstEffort = firstSubmission?.efforts as unknown as { duration_seconds: number } | null;
    const baseline = firstEffort?.duration_seconds || effort.duration_seconds;

    // Calculate score
    let score = 0;
    if (result.status === "verified") {
      const scoreResult = computeScore(baseline, effort.duration_seconds);
      score = scoreResult.score;
    }

    // Update submission
    const { error: updateError } = await appSupabase
      .from("submissions")
      .update({
        status: result.status,
        score,
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Error updating submission:", updateError);
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }

    // Create verification result
    await appSupabase.from("verification_results").insert({
      id: crypto.randomUUID(),
      submission_id: submissionId,
      confidence: result.confidence,
      reasons: result.reasons,
      verified_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      score,
      confidence: result.confidence,
      reasons: result.reasons,
    });
  } catch (error) {
    console.error("Error in verify effort:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

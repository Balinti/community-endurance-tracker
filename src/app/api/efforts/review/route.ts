import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeScore } from "@/lib/scoring";

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
    const { submissionId, action } = body;

    if (!submissionId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get submission with round info
    const { data: submission, error: subError } = await appSupabase
      .from("submissions")
      .select(`
        *,
        efforts!inner(*),
        rounds!inner(
          season_id,
          seasons!inner(
            league_id,
            leagues!inner(commissioner_id)
          )
        )
      `)
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify commissioner
    const rounds = submission.rounds as {
      seasons: { leagues: { commissioner_id: string } }
    };
    const commissionerId = rounds.seasons.leagues.commissioner_id;

    if (commissionerId !== currentUser.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const newStatus = action === "approve" ? "verified" : "rejected";
    let score = 0;

    if (action === "approve") {
      const effort = submission.efforts as { duration_seconds: number };

      // Get baseline
      const { data: firstSubmission } = await appSupabase
        .from("submissions")
        .select("efforts!inner(duration_seconds)")
        .eq("user_id", submission.user_id)
        .eq("status", "verified")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      const firstEffort = firstSubmission?.efforts as unknown as { duration_seconds: number } | null;
      const baseline = firstEffort?.duration_seconds || effort.duration_seconds;

      const scoreResult = computeScore(baseline, effort.duration_seconds);
      score = scoreResult.score;
    }

    // Update submission
    const { error: updateError } = await appSupabase
      .from("submissions")
      .update({
        status: newStatus,
        score,
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Error updating submission:", updateError);
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      score,
    });
  } catch (error) {
    console.error("Error in review effort:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

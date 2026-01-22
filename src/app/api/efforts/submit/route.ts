import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { leagueId, roundId, durationSeconds, avgHR, notes } = body;

    if (!leagueId || !roundId || !durationSeconds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (durationSeconds < 600 || durationSeconds > 3600) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify membership
    const { data: membership, error: memberError } = await appSupabase
      .from("memberships")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", currentUser.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Not a member of this league" }, { status: 403 });
    }

    // Create effort
    const effortId = crypto.randomUUID();
    const { error: effortError } = await appSupabase.from("efforts").insert({
      id: effortId,
      user_id: currentUser.id,
      occurred_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      avg_hr: avgHR || null,
      notes: notes || null,
      source: "manual",
    });

    if (effortError) {
      console.error("Error creating effort:", effortError);
      return NextResponse.json({ error: "Failed to create effort" }, { status: 500 });
    }

    // Create submission (pending verification)
    const submissionId = crypto.randomUUID();
    const { error: submissionError } = await appSupabase.from("submissions").insert({
      id: submissionId,
      round_id: roundId,
      effort_id: effortId,
      user_id: currentUser.id,
      status: "pending",
      score: 0,
    });

    if (submissionError) {
      console.error("Error creating submission:", submissionError);
      return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      effortId,
      submissionId,
    });
  } catch (error) {
    console.error("Error in submit effort:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

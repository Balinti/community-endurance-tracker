import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SHARED_SUPABASE_URL = "https://qdrtpwpnbzvkpqjilyfh.supabase.co";
const SHARED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leagueId = searchParams.get("leagueId");

    if (!leagueId) {
      return NextResponse.json({ error: "League ID is required" }, { status: 400 });
    }

    const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

    const { data: sessionData } = await sharedSupabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify commissioner
    const { data: league, error: leagueError } = await appSupabase
      .from("leagues")
      .select("*")
      .eq("id", leagueId)
      .eq("commissioner_id", currentUser.id)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Get current season
    const { data: season } = await appSupabase
      .from("seasons")
      .select("id")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!season) {
      return NextResponse.json({
        league,
        flaggedSubmissions: [],
      });
    }

    // Get flagged submissions
    const { data: rounds } = await appSupabase
      .from("rounds")
      .select("id")
      .eq("season_id", season.id);

    const roundIds = (rounds || []).map(r => r.id);

    const { data: flaggedSubmissions } = await appSupabase
      .from("submissions")
      .select(`
        id,
        user_id,
        status,
        created_at,
        efforts!inner(duration_seconds, avg_hr),
        verification_results(confidence, reasons)
      `)
      .in("round_id", roundIds)
      .eq("status", "flagged")
      .order("created_at", { ascending: false });

    const formatted = (flaggedSubmissions || []).map(sub => {
      const effort = sub.efforts as unknown as { duration_seconds: number; avg_hr: number | null };
      const result = Array.isArray(sub.verification_results)
        ? sub.verification_results[0]
        : sub.verification_results as unknown as { confidence: number; reasons: string[] } | null;

      return {
        id: sub.id,
        user_email: `User ${sub.user_id.slice(0, 8)}`,
        duration_seconds: effort.duration_seconds,
        avg_hr: effort.avg_hr,
        status: sub.status,
        reasons: result?.reasons || [],
        confidence: result?.confidence || 0,
        submitted_at: sub.created_at,
      };
    });

    return NextResponse.json({
      league,
      flaggedSubmissions: formatted,
    });
  } catch (error) {
    console.error("Error in commissioner data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

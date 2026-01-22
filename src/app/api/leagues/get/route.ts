import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SHARED_SUPABASE_URL = "https://qdrtpwpnbzvkpqjilyfh.supabase.co";
const SHARED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "League code is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

    // Get current user
    const { data: sessionData } = await sharedSupabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    // Get league
    const { data: league, error: leagueError } = await appSupabase
      .from("leagues")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Get current season
    const { data: season } = await appSupabase
      .from("seasons")
      .select("*")
      .eq("league_id", league.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get current round
    const now = new Date().toISOString();
    let currentRound = null;
    if (season) {
      const { data: round } = await appSupabase
        .from("rounds")
        .select("*")
        .eq("season_id", season.id)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .single();
      currentRound = round;
    }

    // Check membership
    let isMember = false;
    let isCommissioner = false;
    if (currentUser) {
      const { data: membership } = await appSupabase
        .from("memberships")
        .select("role")
        .eq("league_id", league.id)
        .eq("user_id", currentUser.id)
        .single();

      if (membership) {
        isMember = true;
        isCommissioner = membership.role === "commissioner";
      }
    }

    // Get standings
    const standings: Array<{
      rank: number;
      name: string;
      isUser: boolean;
      weeklyScore: number;
      seasonScore: number;
      bestTime: number;
      improvement: string;
    }> = [];

    if (season) {
      // Get all verified submissions for this season
      const { data: submissions } = await appSupabase
        .from("submissions")
        .select(`
          id,
          user_id,
          score,
          status,
          round_id,
          efforts!inner(duration_seconds)
        `)
        .eq("status", "verified")
        .in("round_id", await appSupabase
          .from("rounds")
          .select("id")
          .eq("season_id", season.id)
          .then(r => (r.data || []).map(round => round.id))
        );

      if (submissions && submissions.length > 0) {
        // Group by user
        const userScores: Record<string, {
          weeklyScore: number;
          seasonScore: number;
          bestTime: number;
        }> = {};

        const currentRoundId = currentRound?.id;

        for (const sub of submissions) {
          const userId = sub.user_id;
          if (!userScores[userId]) {
            userScores[userId] = { weeklyScore: 0, seasonScore: 0, bestTime: Infinity };
          }

          userScores[userId].seasonScore += sub.score || 0;

          const effort = sub.efforts as unknown as { duration_seconds: number };
          if (effort?.duration_seconds && effort.duration_seconds < userScores[userId].bestTime) {
            userScores[userId].bestTime = effort.duration_seconds;
          }

          if (sub.round_id === currentRoundId) {
            userScores[userId].weeklyScore = sub.score || 0;
          }
        }

        // Get user profiles
        const { data: memberships } = await appSupabase
          .from("memberships")
          .select("user_id")
          .eq("league_id", league.id);

        const memberIds = (memberships || []).map(m => m.user_id);

        // Create standings entries
        for (const userId of memberIds) {
          const scores = userScores[userId] || { weeklyScore: 0, seasonScore: 0, bestTime: 1200 };
          const baseline = 1200; // Default baseline
          const improvement = scores.bestTime < Infinity
            ? ((baseline - scores.bestTime) / baseline * 100).toFixed(1)
            : "0.0";

          standings.push({
            rank: 0,
            name: userId === currentUser?.id ? "You" : `User ${userId.slice(0, 8)}`,
            isUser: userId === currentUser?.id,
            weeklyScore: scores.weeklyScore,
            seasonScore: scores.seasonScore,
            bestTime: scores.bestTime < Infinity ? scores.bestTime : 1200,
            improvement: improvement + "%",
          });
        }

        // Sort and assign ranks
        standings.sort((a, b) => b.seasonScore - a.seasonScore);
        standings.forEach((s, i) => { s.rank = i + 1; });
      }
    }

    return NextResponse.json({
      league,
      season,
      currentRound,
      standings,
      isMember,
      isCommissioner,
    });
  } catch (error) {
    console.error("Error in get league:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

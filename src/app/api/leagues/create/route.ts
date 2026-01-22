import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCode, getWeekStart } from "@/lib/utils";

const SHARED_SUPABASE_URL = "https://qdrtpwpnbzvkpqjilyfh.supabase.co";
const SHARED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

    const { data: { user } } = await sharedSupabase.auth.getUser(
      authHeader?.replace("Bearer ", "") || ""
    );

    // Try to get user from cookie/session
    // const cookieHeader = request.headers.get("cookie") || "";
    let currentUser = user;

    if (!currentUser) {
      const { data: sessionData } = await sharedSupabase.auth.getSession();
      currentUser = sessionData.session?.user || null;
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, sport = "running", isPublic = true } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "League name is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const leagueCode = generateCode(8);
    const leagueId = crypto.randomUUID();
    const seasonId = crypto.randomUUID();

    // Create league
    const { error: leagueError } = await appSupabase.from("leagues").insert({
      id: leagueId,
      code: leagueCode,
      name: name.trim(),
      sport,
      is_public: isPublic,
      commissioner_id: currentUser.id,
      timezone: "UTC",
    });

    if (leagueError) {
      console.error("Error creating league:", leagueError);
      return NextResponse.json({ error: "Failed to create league" }, { status: 500 });
    }

    // Create season
    const seasonStart = getWeekStart();
    const seasonEnd = new Date(seasonStart);
    seasonEnd.setDate(seasonEnd.getDate() + 84); // 12 weeks

    const { error: seasonError } = await appSupabase.from("seasons").insert({
      id: seasonId,
      league_id: leagueId,
      name: `Season ${new Date().getFullYear()}`,
      starts_on: seasonStart.toISOString().split("T")[0],
      ends_on: seasonEnd.toISOString().split("T")[0],
    });

    if (seasonError) {
      console.error("Error creating season:", seasonError);
    }

    // Create rounds (12 weeks)
    const rounds = [];
    for (let i = 0; i < 12; i++) {
      const roundStart = new Date(seasonStart);
      roundStart.setDate(roundStart.getDate() + i * 7);
      const roundEnd = new Date(roundStart);
      roundEnd.setDate(roundEnd.getDate() + 6);
      roundEnd.setHours(23, 59, 59, 999);

      rounds.push({
        id: crypto.randomUUID(),
        season_id: seasonId,
        week_index: i,
        starts_at: roundStart.toISOString(),
        ends_at: roundEnd.toISOString(),
      });
    }

    const { error: roundsError } = await appSupabase.from("rounds").insert(rounds);
    if (roundsError) {
      console.error("Error creating rounds:", roundsError);
    }

    // Add commissioner as member
    const { error: memberError } = await appSupabase.from("memberships").insert({
      league_id: leagueId,
      user_id: currentUser.id,
      role: "commissioner",
    });

    if (memberError) {
      console.error("Error adding commissioner:", memberError);
    }

    // Create entitlements if not exists
    await appSupabase.from("entitlements").upsert({
      user_id: currentUser.id,
      plan: "free",
      verification_credits_monthly: 4,
    }, { onConflict: "user_id" });

    return NextResponse.json({
      success: true,
      code: leagueCode,
      leagueId,
    });
  } catch (error) {
    console.error("Error in create league:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

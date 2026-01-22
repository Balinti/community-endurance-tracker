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
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "League code is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find league
    const { data: league, error: leagueError } = await appSupabase
      .from("leagues")
      .select("id, code, name")
      .eq("code", code.toUpperCase())
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Check if already a member
    const { data: existingMembership } = await appSupabase
      .from("memberships")
      .select("league_id")
      .eq("league_id", league.id)
      .eq("user_id", currentUser.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({
        success: true,
        code: league.code,
        message: "Already a member",
      });
    }

    // Add as member
    const { error: memberError } = await appSupabase.from("memberships").insert({
      league_id: league.id,
      user_id: currentUser.id,
      role: "member",
    });

    if (memberError) {
      console.error("Error joining league:", memberError);
      return NextResponse.json({ error: "Failed to join league" }, { status: 500 });
    }

    // Create entitlements if not exists
    await appSupabase.from("entitlements").upsert({
      user_id: currentUser.id,
      plan: "free",
      verification_credits_monthly: 4,
    }, { onConflict: "user_id" });

    return NextResponse.json({
      success: true,
      code: league.code,
    });
  } catch (error) {
    console.error("Error in join league:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

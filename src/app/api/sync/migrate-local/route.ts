import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/utils";

const SHARED_SUPABASE_URL = "https://qdrtpwpnbzvkpqjilyfh.supabase.co";
const SHARED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4";

interface LocalEffort {
  id: string;
  durationSeconds: number;
  avgHR?: number;
  notes?: string;
  occurredAt: string;
  weekIndex: number;
}

interface LocalLeague {
  id: string;
  name: string;
  code: string;
  isDemo: boolean;
  seasonName: string;
  seasonStart: string;
  seasonEnd: string;
}

interface LocalData {
  version: number;
  migrated: boolean;
  baseline?: number;
  efforts: LocalEffort[];
  league: LocalLeague;
}

export async function POST(request: NextRequest) {
  try {
    const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

    const { data: sessionData } = await sharedSupabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: LocalData = await request.json();
    const { efforts, league } = body;

    if (!efforts || efforts.length === 0) {
      return NextResponse.json({ success: true, message: "No efforts to migrate" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create or get a personal league for the user
    let leagueId: string;
    let seasonId: string;

    // Check if user has a personal league
    const { data: existingLeague } = await appSupabase
      .from("leagues")
      .select("id")
      .eq("commissioner_id", currentUser.id)
      .eq("name", "My Personal League")
      .single();

    if (existingLeague) {
      leagueId = existingLeague.id;

      // Get season
      const { data: existingSeason } = await appSupabase
        .from("seasons")
        .select("id")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      seasonId = existingSeason?.id || crypto.randomUUID();
    } else {
      // Create personal league
      leagueId = crypto.randomUUID();
      seasonId = crypto.randomUUID();

      await appSupabase.from("leagues").insert({
        id: leagueId,
        code: `PERSONAL${currentUser.id.slice(0, 4).toUpperCase()}`,
        name: "My Personal League",
        sport: "running",
        is_public: false,
        commissioner_id: currentUser.id,
        timezone: "UTC",
      });

      // Create season
      const seasonStart = getWeekStart(new Date(league.seasonStart));
      const seasonEnd = new Date(league.seasonEnd);

      await appSupabase.from("seasons").insert({
        id: seasonId,
        league_id: leagueId,
        name: league.seasonName || "Migrated Season",
        starts_on: seasonStart.toISOString().split("T")[0],
        ends_on: seasonEnd.toISOString().split("T")[0],
      });

      // Create rounds
      const rounds = [];
      const weekCount = Math.ceil((seasonEnd.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      for (let i = 0; i < Math.min(weekCount, 12); i++) {
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

      if (rounds.length > 0) {
        await appSupabase.from("rounds").insert(rounds);
      }

      // Add membership
      await appSupabase.from("memberships").insert({
        league_id: leagueId,
        user_id: currentUser.id,
        role: "commissioner",
      });
    }

    // Get rounds for this season
    const { data: rounds } = await appSupabase
      .from("rounds")
      .select("id, week_index")
      .eq("season_id", seasonId)
      .order("week_index");

    const roundMap = new Map((rounds || []).map(r => [r.week_index, r.id]));

    // Migrate efforts
    let migratedCount = 0;
    for (const effort of efforts) {
      const roundId = roundMap.get(effort.weekIndex);
      if (!roundId) continue;

      // Check if effort already exists (idempotent)
      const { data: existing } = await appSupabase
        .from("efforts")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("duration_seconds", effort.durationSeconds)
        .eq("occurred_at", effort.occurredAt)
        .single();

      if (existing) continue;

      // Create effort
      const effortId = crypto.randomUUID();
      await appSupabase.from("efforts").insert({
        id: effortId,
        user_id: currentUser.id,
        occurred_at: effort.occurredAt,
        duration_seconds: effort.durationSeconds,
        avg_hr: effort.avgHR || null,
        notes: effort.notes || null,
        source: "local_migration",
      });

      // Create submission
      await appSupabase.from("submissions").insert({
        id: crypto.randomUUID(),
        round_id: roundId,
        effort_id: effortId,
        user_id: currentUser.id,
        status: "pending",
        score: 0,
      });

      migratedCount++;
    }

    // Create entitlements if not exists
    await appSupabase.from("entitlements").upsert({
      user_id: currentUser.id,
      plan: "free",
      verification_credits_monthly: 4,
    }, { onConflict: "user_id" });

    return NextResponse.json({
      success: true,
      migratedCount,
      leagueId,
    });
  } catch (error) {
    console.error("Error in migrate local:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

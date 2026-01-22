import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseApp/client";

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data: leagues, error } = await supabase
      .from("leagues")
      .select(`
        id,
        code,
        name,
        sport,
        is_public,
        memberships(count)
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching leagues:", error);
      return NextResponse.json({ leagues: [] });
    }

    const formattedLeagues = (leagues || []).map((league: Record<string, unknown>) => ({
      id: league.id,
      code: league.code,
      name: league.name,
      sport: league.sport,
      is_public: league.is_public,
      member_count: Array.isArray(league.memberships)
        ? league.memberships.length
        : (league.memberships as { count?: number })?.count || 0,
    }));

    return NextResponse.json({ leagues: formattedLeagues });
  } catch (error) {
    console.error("Error in leagues list:", error);
    return NextResponse.json({ leagues: [] });
  }
}

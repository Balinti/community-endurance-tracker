import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isStripeConfigured, getProPriceIds, hasPriceIds } from "@/lib/stripe";

const SHARED_SUPABASE_URL = "https://qdrtpwpnbzvkpqjilyfh.supabase.co";
const SHARED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4";

export async function GET(_request: NextRequest) {
  try {
    const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

    const { data: sessionData } = await sharedSupabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        entitlement: { plan: "free", verification_credits_monthly: 4, credits_used: 0 },
        subscription: null,
        stripeConfigured: false,
        priceIds: {},
      });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get entitlement
    let entitlement = null;
    const { data: entitlementData } = await appSupabase
      .from("entitlements")
      .select("*")
      .eq("user_id", currentUser.id)
      .single();

    if (entitlementData) {
      // Get credits used this month
      const { data: ledger } = await appSupabase
        .from("verification_credits_ledger")
        .select("delta")
        .eq("user_id", currentUser.id)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const creditsUsed = (ledger || []).reduce((sum, l) => sum + Math.abs(l.delta), 0);

      entitlement = {
        ...entitlementData,
        credits_used: creditsUsed,
      };
    } else {
      entitlement = {
        plan: "free",
        verification_credits_monthly: 4,
        credits_used: 0,
      };
    }

    // Get subscription
    const { data: subscription } = await appSupabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("status", "active")
      .single();

    return NextResponse.json({
      entitlement,
      subscription,
      stripeConfigured: isStripeConfigured() && hasPriceIds(),
      priceIds: getProPriceIds(),
    });
  } catch (error) {
    console.error("Error in account status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

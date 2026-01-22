import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const SHARED_SUPABASE_URL = "https://qdrtpwpnbzvkpqjilyfh.supabase.co";
const SHARED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4";

export async function POST(_request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not available" }, { status: 503 });
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

    // Get subscription
    const { data: subscription } = await appSupabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", currentUser.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community-endurance-tracker.vercel.app";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error in portal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

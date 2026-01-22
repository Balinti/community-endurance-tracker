import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ received: true, message: "Stripe not configured" });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ received: true, message: "Stripe not available" });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify signature if webhook secret is configured
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      // Parse without verification (not recommended for production)
      event = JSON.parse(body) as Stripe.Event;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Database not configured for webhook");
      return NextResponse.json({ received: true });
    }

    const appSupabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") break;

        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error("No user_id in session metadata");
          break;
        }

        // Get subscription details
        const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId);
        const subObj = subscriptionData as unknown as { status: string; items: { data: Array<{ price: { id: string } }> }; current_period_end: number };

        // Upsert subscription record
        await appSupabase.from("subscriptions").upsert({
          id: crypto.randomUUID(),
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: subObj.status,
          price_id: subObj.items.data[0]?.price.id,
          current_period_end: new Date(subObj.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        // Update entitlements
        await appSupabase.from("entitlements").upsert({
          user_id: userId,
          plan: "pro",
          verification_credits_monthly: 999999,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        break;
      }

      case "customer.subscription.updated": {
        const subUpdate = event.data.object as unknown as { metadata?: { user_id?: string }; status: string; items: { data: Array<{ price: { id: string } }> }; current_period_end: number };
        const userId = subUpdate.metadata?.user_id;

        if (!userId) break;

        const isActive = ["active", "trialing"].includes(subUpdate.status);

        // Update subscription
        await appSupabase
          .from("subscriptions")
          .update({
            status: subUpdate.status,
            price_id: subUpdate.items.data[0]?.price.id,
            current_period_end: new Date(subUpdate.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Update entitlements
        await appSupabase.from("entitlements").upsert({
          user_id: userId,
          plan: isActive ? "pro" : "free",
          verification_credits_monthly: isActive ? 999999 : 4,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        break;
      }

      case "customer.subscription.deleted": {
        const subDelete = event.data.object as unknown as { metadata?: { user_id?: string } };
        const userId = subDelete.metadata?.user_id;

        if (!userId) break;

        // Update subscription
        await appSupabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Downgrade entitlements
        await appSupabase.from("entitlements").upsert({
          user_id: userId,
          plan: "free",
          verification_credits_monthly: 4,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error in webhook:", error);
    // Always return 200 for webhooks to avoid retries
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

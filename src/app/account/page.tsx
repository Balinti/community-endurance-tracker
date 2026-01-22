"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/components/GoogleAuth";

interface Entitlement {
  plan: string;
  verification_credits_monthly: number;
  credits_used: number;
}

interface Subscription {
  status: string;
  current_period_end: string;
  price_id: string;
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [priceIds, setPriceIds] = useState<{ monthly?: string; annual?: string }>({});

  useEffect(() => {
    if (user) {
      loadAccountData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadAccountData = async () => {
    try {
      const response = await fetch("/api/account/status");
      if (response.ok) {
        const data = await response.json();
        setEntitlement(data.entitlement);
        setSubscription(data.subscription);
        setStripeConfigured(data.stripeConfigured);
        setPriceIds(data.priceIds || {});
      }
    } catch (err) {
      console.error("Failed to load account data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to create checkout session:", err);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to create portal session:", err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
              <p className="text-gray-500">
                Sign in with Google to view your account details.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isPro = entitlement?.plan === "pro";
  const creditsRemaining = (entitlement?.verification_credits_monthly || 4) - (entitlement?.credits_used || 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Account</h1>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.email}</p>
                <p className="text-sm text-gray-500">
                  Signed in with Google
                </p>
              </div>
            </div>
          </div>

          {/* Plan Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Plan</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPro
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}>
                {isPro ? "Pro" : "Free"}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Verification Credits</span>
                <span className="font-medium text-gray-900">
                  {isPro ? "Unlimited" : `${creditsRemaining} / ${entitlement?.verification_credits_monthly || 4}`}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">League Creation</span>
                <span className="font-medium text-gray-900">
                  {isPro ? "Unlimited" : "3 leagues"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Verified Scoring</span>
                <span className="font-medium text-gray-900">
                  {isPro ? "Enabled" : "Limited"}
                </span>
              </div>
            </div>

            {subscription?.status === "active" && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Your subscription renews on{" "}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Upgrade/Manage Section */}
          {stripeConfigured && (priceIds.monthly || priceIds.annual) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {isPro ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Subscription</h2>
                  <button
                    onClick={handleManageBilling}
                    className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Manage Billing
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Upgrade to Pro</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Get unlimited verification credits, create more leagues, and unlock all features.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {priceIds.monthly && (
                      <button
                        onClick={() => handleUpgrade(priceIds.monthly!)}
                        className="py-3 px-4 bg-white border-2 border-orange-500 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        Monthly Plan
                      </button>
                    )}
                    {priceIds.annual && (
                      <button
                        onClick={() => handleUpgrade(priceIds.annual!)}
                        className="py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 transition-all"
                      >
                        Annual Plan (Save 20%)
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {!stripeConfigured && !isPro && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500 text-sm">
                Billing is not configured. Contact support to upgrade.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

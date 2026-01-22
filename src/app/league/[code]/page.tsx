"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import EffortForm from "@/components/EffortForm";
import StandingsTable, { StandingsEntry } from "@/components/StandingsTable";
import { useAuth } from "@/components/GoogleAuth";
import { formatDuration } from "@/lib/utils";

interface League {
  id: string;
  code: string;
  name: string;
  sport: string;
  commissioner_id: string;
}

interface Season {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
}

interface Round {
  id: string;
  week_index: number;
  starts_at: string;
  ends_at: string;
}

export default function LeaguePage() {
  const params = useParams();
  const code = params.code as string;
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"standings" | "submit">("standings");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const loadLeagueData = useCallback(async () => {
    try {
      const response = await fetch(`/api/leagues/get?code=${code}`);
      if (response.ok) {
        const data = await response.json();
        setLeague(data.league);
        setSeason(data.season);
        setCurrentRound(data.currentRound);
        setStandings(data.standings || []);
        setIsMember(data.isMember);
        setIsCommissioner(data.isCommissioner);
      } else {
        setError("League not found");
      }
    } catch {
      console.error("Failed to load league");
      setError("Failed to load league");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadLeagueData();
  }, [loadLeagueData]);

  const handleJoin = async () => {
    if (!user) {
      setError("Please sign in to join the league");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        setIsMember(true);
        setSuccessMessage("Successfully joined the league!");
        loadLeagueData();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to join league");
      }
    } catch {
      setError("Failed to join league");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEffortSubmit = async (durationSeconds: number, avgHR?: number, notes?: string) => {
    if (!user) {
      setError("Please sign in to submit efforts");
      return;
    }

    if (!currentRound) {
      setError("No active round");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/efforts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: league?.id,
          roundId: currentRound.id,
          durationSeconds,
          avgHR,
          notes,
        }),
      });

      if (response.ok) {
        setSuccessMessage(`Effort logged: ${formatDuration(durationSeconds)}`);
        setActiveTab("standings");
        loadLeagueData();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to submit effort");
      }
    } catch {
      setError("Failed to submit effort");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading league...</div>
        </main>
      </div>
    );
  }

  if (error && !league) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">League Not Found</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Link
              href="/leagues"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Browse Leagues
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* League Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{league?.name}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {season?.name} • Week {(currentRound?.week_index ?? 0) + 1}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-mono rounded">
                  {league?.code}
                </span>
                {isCommissioner && (
                  <Link
                    href={`/commissioner/${league?.id}`}
                    className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded hover:bg-purple-200 transition-colors"
                  >
                    Manage
                  </Link>
                )}
              </div>
            </div>

            {!isMember && user && (
              <button
                onClick={handleJoin}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? "Joining..." : "Join League"}
              </button>
            )}

            {!user && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  Sign in with Google to join this league and submit efforts.
                </p>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">{successMessage}</span>
            </div>
          )}

          {/* Tabs (only for members) */}
          {isMember && (
            <>
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab("standings")}
                  className={`py-3 px-6 font-medium transition-colors ${
                    activeTab === "standings"
                      ? "text-orange-600 border-b-2 border-orange-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Standings
                </button>
                <button
                  onClick={() => setActiveTab("submit")}
                  className={`py-3 px-6 font-medium transition-colors ${
                    activeTab === "submit"
                      ? "text-orange-600 border-b-2 border-orange-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Submit Effort
                </button>
              </div>

              {activeTab === "submit" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Submit Your Effort
                  </h2>
                  <EffortForm onSubmit={handleEffortSubmit} isSubmitting={isSubmitting} />
                </div>
              )}
            </>
          )}

          {/* Standings (always visible) */}
          {(activeTab === "standings" || !isMember) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Season Standings</h2>
                <p className="text-gray-500 text-sm">
                  Rankings based on cumulative improvement score
                </p>
              </div>
              {standings.length > 0 ? (
                <StandingsTable entries={standings} />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No standings yet. Be the first to submit an effort!
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

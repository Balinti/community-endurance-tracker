"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/components/GoogleAuth";
import { formatDuration } from "@/lib/utils";

interface FlaggedSubmission {
  id: string;
  user_email: string;
  duration_seconds: number;
  avg_hr: number | null;
  status: string;
  reasons: string[];
  confidence: number;
  submitted_at: string;
}

interface League {
  id: string;
  code: string;
  name: string;
}

export default function CommissionerPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const { user, loading: authLoading } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [flaggedSubmissions, setFlaggedSubmissions] = useState<FlaggedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch(`/api/commissioner/data?leagueId=${leagueId}`);
      if (response.ok) {
        const data = await response.json();
        setLeague(data.league);
        setFlaggedSubmissions(data.flaggedSubmissions || []);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to load data");
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    if (user) {
      loadData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, loadData]);

  const handleReview = async (submissionId: string, action: "approve" | "reject") => {
    setProcessing(submissionId);

    try {
      const response = await fetch("/api/efforts/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action }),
      });

      if (response.ok) {
        setFlaggedSubmissions((prev) =>
          prev.filter((s) => s.id !== submissionId)
        );
      } else {
        const data = await response.json();
        setError(data.error || "Failed to process review");
      }
    } catch {
      setError("Failed to process review");
    } finally {
      setProcessing(null);
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
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-500">
              Sign in with Google to access commissioner tools.
            </p>
          </div>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Link href="/leagues" className="text-orange-600 hover:text-orange-700 font-medium">
              Back to Leagues
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Commissioner Dashboard</h1>
              <p className="text-gray-500">
                {league?.name} ({league?.code})
              </p>
            </div>
            <Link
              href={`/league/${league?.code}`}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              View League
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          {/* Flagged Submissions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Review Queue</h2>
              <p className="text-gray-500 text-sm">
                Flagged submissions requiring manual review
              </p>
            </div>

            {flaggedSubmissions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No flagged submissions to review</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {flaggedSubmissions.map((submission) => (
                  <div key={submission.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-gray-900">
                            {submission.user_email}
                          </span>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                            Flagged
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                          <span>
                            Time: <span className="font-mono font-medium">{formatDuration(submission.duration_seconds)}</span>
                          </span>
                          {submission.avg_hr && (
                            <span>
                              Avg HR: <span className="font-medium">{submission.avg_hr} bpm</span>
                            </span>
                          )}
                          <span>
                            Confidence: <span className="font-medium">{submission.confidence}%</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {submission.reasons.map((reason, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(submission.id, "approve")}
                          disabled={processing === submission.id}
                          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(submission.id, "reject")}
                          disabled={processing === submission.id}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

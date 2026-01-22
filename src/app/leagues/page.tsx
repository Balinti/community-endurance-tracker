"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/components/GoogleAuth";

interface League {
  id: string;
  code: string;
  name: string;
  sport: string;
  is_public: boolean;
  member_count?: number;
}

export default function LeaguesPage() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newLeague, setNewLeague] = useState({ name: "", sport: "running", isPublic: true });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      const response = await fetch("/api/leagues/list");
      if (response.ok) {
        const data = await response.json();
        setLeagues(data.leagues || []);
      }
    } catch {
      console.error("Failed to load leagues");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please sign in to create a league");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/leagues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeague),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreate(false);
        setNewLeague({ name: "", sport: "running", isPublic: true });
        window.location.href = `/league/${data.code}`;
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create league");
      }
    } catch {
      setError("Failed to create league");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please sign in to join a league");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.toUpperCase() }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = `/league/${data.code}`;
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leagues</h1>
              <p className="text-gray-500">Join a league or create your own</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoin(true)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Join League
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:from-orange-600 hover:to-red-700 transition-colors font-medium"
              >
                Create League
              </button>
            </div>
          </div>

          {/* Join Modal */}
          {showJoin && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Join League</h3>
                <form onSubmit={handleJoinLeague}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invite Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="e.g., ABC123XY"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase"
                      required
                    />
                  </div>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? "Joining..." : "Join"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowJoin(false); setError(""); }}
                      className="py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create League</h3>
                <form onSubmit={handleCreateLeague}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      League Name
                    </label>
                    <input
                      type="text"
                      value={newLeague.name}
                      onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                      placeholder="e.g., Running Crew 2024"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sport
                    </label>
                    <select
                      value={newLeague.sport}
                      onChange={(e) => setNewLeague({ ...newLeague, sport: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="running">Running</option>
                      <option value="cycling">Cycling</option>
                      <option value="rowing">Rowing</option>
                      <option value="swimming">Swimming</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newLeague.isPublic}
                        onChange={(e) => setNewLeague({ ...newLeague, isPublic: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">Make league public</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Public leagues are visible to everyone
                    </p>
                  </div>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? "Creating..." : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreate(false); setError(""); }}
                      className="py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Leagues List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading leagues...</div>
          ) : leagues.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Public Leagues Yet</h3>
              <p className="text-gray-500 mb-6">Be the first to create a public league!</p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-6 py-2 text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:from-orange-600 hover:to-red-700 transition-colors font-medium"
              >
                Create League
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/league/${league.code}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{league.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {league.sport.charAt(0).toUpperCase() + league.sport.slice(1)} •{" "}
                        {league.member_count || 0} members
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-mono rounded">
                        {league.code}
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

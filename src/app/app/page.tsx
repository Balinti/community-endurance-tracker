"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import EffortForm from "@/components/EffortForm";
import StandingsTable, { StandingsEntry } from "@/components/StandingsTable";
import SoftSavePrompt from "@/components/SoftSavePrompt";
import { useAuth } from "@/components/GoogleAuth";
import {
  getLocalData,
  addEffort,
  getStandings,
  getCurrentWeekIndex,
  shouldShowSavePrompt,
  dismissSavePrompt,
  getExportPayload,
  markAsMigrated,
} from "@/lib/localStore";
import { formatDuration } from "@/lib/utils";

export default function AppPage() {
  const { user } = useAuth();
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [localData, setLocalData] = useState<ReturnType<typeof getLocalData> | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<"log" | "standings">("log");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  const loadData = useCallback(() => {
    const data = getLocalData();
    setLocalData(data);
    const standingsData = getStandings();
    setStandings(standingsData);
    setShowPrompt(shouldShowSavePrompt());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (user && localData && !localData.migrated && localData.efforts.length > 0) {
      // User signed in and has local data to migrate
      setIsMigrating(true);
    }
  }, [user, localData]);

  const handleEffortSubmit = async (durationSeconds: number, avgHR?: number, notes?: string) => {
    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      addEffort(durationSeconds, avgHR, notes);
      loadData();
      setSuccessMessage(`Effort logged: ${formatDuration(durationSeconds)}`);
      setActiveTab("standings");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissPrompt = () => {
    dismissSavePrompt();
    setShowPrompt(false);
  };

  const handleMigrateData = async () => {
    try {
      const payload = getExportPayload();
      const response = await fetch("/api/sync/migrate-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        markAsMigrated();
        setMigrationComplete(true);
        setIsMigrating(false);
        loadData();
      }
    } catch (error) {
      console.error("Migration failed:", error);
    }
  };

  const handleSkipMigration = () => {
    setIsMigrating(false);
  };

  const weekIndex = getCurrentWeekIndex();
  const baseline = localData?.baseline;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Migration Modal */}
          {isMigrating && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Sync Your Progress
                </h3>
                <p className="text-gray-600 mb-6">
                  You have {localData?.efforts.length} effort(s) saved locally.
                  Would you like to sync them to the cloud?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleMigrateData}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 transition-all"
                  >
                    Sync to Cloud
                  </button>
                  <button
                    onClick={handleSkipMigration}
                    className="py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Migration Success */}
          {migrationComplete && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">Your progress has been synced to the cloud!</span>
              <button
                onClick={() => setMigrationComplete(false)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* League Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {localData?.league.name || "Demo League"}
                </h1>
                <p className="text-gray-500 text-sm">
                  {localData?.league.seasonName} • Week {weekIndex + 1}
                </p>
              </div>
              {!user && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">
                  Demo Mode
                </span>
              )}
              {user && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  Signed In
                </span>
              )}
            </div>

            {baseline && (
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Your Baseline:</span>
                  <span className="ml-2 font-semibold text-gray-900 font-mono">
                    {formatDuration(baseline)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Total Efforts:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {localData?.efforts.length || 0}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("log")}
              className={`py-3 px-6 font-medium transition-colors ${
                activeTab === "log"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Log Effort
            </button>
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
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">{successMessage}</span>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === "log" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Log Your 20-Minute Effort
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Record your best 20-minute effort for this week.
                Your improvement over your baseline determines your score.
              </p>
              <EffortForm onSubmit={handleEffortSubmit} isSubmitting={isSubmitting} />
            </div>
          )}

          {activeTab === "standings" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Season Standings
                </h2>
                <p className="text-gray-500 text-sm">
                  Rankings based on cumulative improvement score
                </p>
              </div>
              <StandingsTable entries={standings} />
            </div>
          )}

          {/* Verification Info */}
          {!user && localData?.hasLoggedEffort && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900">Demo Mode</h4>
                  <p className="text-blue-700 text-sm">
                    Your efforts are saved locally. Sign in with Google to sync to the cloud,
                    join real leagues, and unlock verified scoring.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Soft Save Prompt */}
      {showPrompt && !user && <SoftSavePrompt onDismiss={handleDismissPrompt} />}
    </div>
  );
}

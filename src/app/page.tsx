"use client";

import Link from "next/link";
import Header from "@/components/Header";
import TryNowButton from "@/components/TryNowButton";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-red-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100/50 via-transparent to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
                Fair-Play Endurance
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">
                  League Competition
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                Track your 20-minute efforts, compete in weekly challenges,
                and see how you stack up against others. No expensive gear required.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <TryNowButton />
                <Link
                  href="/leagues"
                  className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Explore Leagues
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Log Your Effort</h3>
                <p className="text-gray-600">
                  Complete a 20-minute all-out effort and record your time.
                  Optionally add heart rate data for better verification.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Improvement</h3>
                <p className="text-gray-600">
                  Your baseline is set from your first effort.
                  Earn points by improving on your personal best each week.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Compete in Leagues</h3>
                <p className="text-gray-600">
                  Join leagues with friends or compete publicly.
                  Season standings track your cumulative improvement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
                Fair Scoring System
              </h2>
              <p className="text-center text-gray-600 mb-12">
                Our scoring rewards improvement, not absolute speed.
                A beginner improving their time has the same opportunity to score as an elite athlete.
              </p>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Weekly Scoring Formula</h3>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm mb-4">
                  Score = clamp((baseline - current) / baseline, -5%, +10%) x 1000
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    Improve your time by 10% = earn 100 points (maximum)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    Improve by 5% = earn 50 points
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 font-bold">=</span>
                    Match your baseline = earn 0 points
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">-</span>
                    Slower by 5% = lose 50 points (minimum)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-r from-orange-500 to-red-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Start Tracking?
            </h2>
            <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
              Try it instantly with no signup required. Your progress is saved locally
              and you can sync to the cloud anytime.
            </p>
            <TryNowButton />
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            Community Endurance Tracker. Built for fair competition.
          </p>
        </div>
      </footer>
    </div>
  );
}

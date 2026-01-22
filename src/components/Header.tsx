'use client';

import Link from 'next/link';
import GoogleAuth from './GoogleAuth';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="font-bold text-gray-900 hidden sm:block">
                Endurance Tracker
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/app"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/leagues"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Leagues
              </Link>
              <Link
                href="/account"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Account
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <GoogleAuth />
          </div>
        </div>
      </div>
    </header>
  );
}

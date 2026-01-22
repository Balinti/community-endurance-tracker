'use client';

import { formatDuration } from '@/lib/utils';

export interface StandingsEntry {
  rank: number;
  name: string;
  isUser: boolean;
  weeklyScore: number;
  seasonScore: number;
  bestTime: number;
  improvement: string;
}

interface StandingsTableProps {
  entries: StandingsEntry[];
  showWeekly?: boolean;
}

export default function StandingsTable({ entries, showWeekly = true }: StandingsTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No standings yet. Log your first effort to see the leaderboard!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Athlete
            </th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Best Time
            </th>
            {showWeekly && (
              <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Weekly
              </th>
            )}
            <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Season
            </th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Improvement
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <tr
              key={entry.name}
              className={`${
                entry.isUser
                  ? 'bg-orange-50 hover:bg-orange-100'
                  : 'hover:bg-gray-50'
              } transition-colors`}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {entry.rank <= 3 ? (
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        entry.rank === 1
                          ? 'bg-yellow-400'
                          : entry.rank === 2
                          ? 'bg-gray-400'
                          : 'bg-orange-400'
                      }`}
                    >
                      {entry.rank}
                    </span>
                  ) : (
                    <span className="w-6 h-6 flex items-center justify-center text-sm text-gray-600">
                      {entry.rank}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`font-medium ${
                    entry.isUser ? 'text-orange-700' : 'text-gray-900'
                  }`}
                >
                  {entry.name}
                  {entry.isUser && (
                    <span className="ml-2 text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </span>
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm text-gray-700">
                {formatDuration(entry.bestTime)}
              </td>
              {showWeekly && (
                <td className="py-3 px-4 text-right">
                  <span
                    className={`font-semibold ${
                      entry.weeklyScore > 0
                        ? 'text-green-600'
                        : entry.weeklyScore < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {entry.weeklyScore > 0 ? '+' : ''}
                    {entry.weeklyScore}
                  </span>
                </td>
              )}
              <td className="py-3 px-4 text-right font-bold text-gray-900">
                {entry.seasonScore}
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={`text-sm ${
                    parseFloat(entry.improvement) > 0
                      ? 'text-green-600'
                      : parseFloat(entry.improvement) < 0
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {parseFloat(entry.improvement) > 0 ? '+' : ''}
                  {entry.improvement}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

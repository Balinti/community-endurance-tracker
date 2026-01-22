import { generateUUID, getWeekStart } from './utils';
import { computeScore, generateBotResults } from './scoring';

const STORAGE_KEY = 'community_endurance_tracker';

export interface LocalEffort {
  id: string;
  durationSeconds: number;
  avgHR?: number;
  notes?: string;
  occurredAt: string;
  weekIndex: number;
}

export interface LocalLeague {
  id: string;
  name: string;
  code: string;
  isDemo: boolean;
  seasonName: string;
  seasonStart: string;
  seasonEnd: string;
  createdAt: string;
}

export interface LocalData {
  version: number;
  migrated: boolean;
  baseline?: number;
  efforts: LocalEffort[];
  league: LocalLeague;
  hasViewedStandings: boolean;
  hasLoggedEffort: boolean;
  dismissedPrompt: boolean;
}

function getDefaultLeague(): LocalLeague {
  const now = new Date();
  const seasonStart = getWeekStart(now);
  const seasonEnd = new Date(seasonStart);
  seasonEnd.setDate(seasonEnd.getDate() + 84); // 12 weeks

  return {
    id: generateUUID(),
    name: 'Demo League',
    code: 'DEMO2024',
    isDemo: true,
    seasonName: 'Winter 2024',
    seasonStart: seasonStart.toISOString(),
    seasonEnd: seasonEnd.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function getDefaultData(): LocalData {
  return {
    version: 1,
    migrated: false,
    efforts: [],
    league: getDefaultLeague(),
    hasViewedStandings: false,
    hasLoggedEffort: false,
    dismissedPrompt: false,
  };
}

export function getLocalData(): LocalData {
  if (typeof window === 'undefined') {
    return getDefaultData();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultData();
    }
    return JSON.parse(stored) as LocalData;
  } catch {
    return getDefaultData();
  }
}

export function saveLocalData(data: LocalData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getCurrentWeekIndex(): number {
  const data = getLocalData();
  const seasonStart = new Date(data.league.seasonStart);
  const now = new Date();
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, diffWeeks);
}

export function addEffort(durationSeconds: number, avgHR?: number, notes?: string): LocalEffort {
  const data = getLocalData();
  const weekIndex = getCurrentWeekIndex();

  const effort: LocalEffort = {
    id: generateUUID(),
    durationSeconds,
    avgHR,
    notes,
    occurredAt: new Date().toISOString(),
    weekIndex,
  };

  data.efforts.push(effort);

  // Set baseline from first effort if not set
  if (!data.baseline) {
    data.baseline = durationSeconds;
  }

  data.hasLoggedEffort = true;
  saveLocalData(data);

  return effort;
}

export function getEffortsForWeek(weekIndex: number): LocalEffort[] {
  const data = getLocalData();
  return data.efforts.filter((e) => e.weekIndex === weekIndex);
}

export function getBestEffortForWeek(weekIndex: number): LocalEffort | null {
  const efforts = getEffortsForWeek(weekIndex);
  if (efforts.length === 0) return null;
  return efforts.reduce((best, e) =>
    e.durationSeconds < best.durationSeconds ? e : best
  );
}

export interface StandingsEntry {
  rank: number;
  name: string;
  isUser: boolean;
  weeklyScore: number;
  seasonScore: number;
  bestTime: number;
  improvement: string;
}

export function getStandings(): StandingsEntry[] {
  const data = getLocalData();
  const weekIndex = getCurrentWeekIndex();
  const baseline = data.baseline || 1200; // Default 20:00

  // Get user's best effort this week
  const userBestEffort = getBestEffortForWeek(weekIndex);
  const userDuration = userBestEffort?.durationSeconds || baseline;
  const userScore = computeScore(baseline, userDuration);

  // Calculate user's season score (sum of weekly scores)
  let userSeasonScore = 0;
  for (let w = 0; w <= weekIndex; w++) {
    const weekBest = getBestEffortForWeek(w);
    if (weekBest) {
      const weekScore = computeScore(baseline, weekBest.durationSeconds);
      userSeasonScore += weekScore.score;
    }
  }

  // Generate bot standings
  const bots = generateBotResults(baseline, weekIndex, 7);

  // Calculate bot season scores (simulated)
  const botSeasonScores = bots.map((bot, idx) => {
    let seasonScore = 0;
    for (let w = 0; w <= weekIndex; w++) {
      const weekBots = generateBotResults(baseline, w, 7);
      seasonScore += weekBots[idx]?.score || 0;
    }
    return seasonScore;
  });

  // Combine user and bots
  const entries: StandingsEntry[] = [
    {
      rank: 0,
      name: 'You',
      isUser: true,
      weeklyScore: userBestEffort ? userScore.score : 0,
      seasonScore: userSeasonScore,
      bestTime: userDuration,
      improvement: userScore.percentChange.toFixed(1) + '%',
    },
    ...bots.map((bot, idx) => ({
      rank: 0,
      name: bot.name,
      isUser: false,
      weeklyScore: bot.score,
      seasonScore: botSeasonScores[idx],
      bestTime: bot.duration,
      improvement: ((baseline - bot.duration) / baseline * 100).toFixed(1) + '%',
    })),
  ];

  // Sort by season score
  entries.sort((a, b) => b.seasonScore - a.seasonScore);

  // Assign ranks
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  // Mark standings as viewed
  data.hasViewedStandings = true;
  saveLocalData(data);

  return entries;
}

export function shouldShowSavePrompt(): boolean {
  const data = getLocalData();
  return data.hasLoggedEffort && data.hasViewedStandings && !data.dismissedPrompt && !data.migrated;
}

export function dismissSavePrompt(): void {
  const data = getLocalData();
  data.dismissedPrompt = true;
  saveLocalData(data);
}

export function markAsMigrated(): void {
  const data = getLocalData();
  data.migrated = true;
  saveLocalData(data);
}

export function getExportPayload(): LocalData {
  return getLocalData();
}

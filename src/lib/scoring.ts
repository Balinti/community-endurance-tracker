export interface ScoreResult {
  score: number;
  improvement: number;
  percentChange: number;
}

/**
 * Compute weekly score based on 20-minute effort improvement
 * Score = clamp((baseline - current) / baseline, -0.05, 0.10) * 1000
 *
 * Example:
 * - Baseline: 1200s (20:00), Current: 1140s (19:00) = 5% improvement = 50 points
 * - Baseline: 1200s (20:00), Current: 1080s (18:00) = 10% improvement = 100 points (max)
 * - Baseline: 1200s (20:00), Current: 1260s (21:00) = -5% = -50 points (min)
 */
export function computeScore(
  baselineDuration: number,
  currentDuration: number
): ScoreResult {
  if (baselineDuration <= 0) {
    return { score: 0, improvement: 0, percentChange: 0 };
  }

  const improvement = baselineDuration - currentDuration;
  const percentChange = improvement / baselineDuration;

  // Clamp between -5% and +10%
  const clampedPercent = Math.max(-0.05, Math.min(0.10, percentChange));
  const score = Math.round(clampedPercent * 1000);

  return {
    score,
    improvement,
    percentChange: percentChange * 100,
  };
}

/**
 * Check if an effort time is plausible for a 20-minute effort
 * Typical range: 15:00 - 30:00 for most athletes
 */
export function isTimePlausible(durationSeconds: number): { valid: boolean; reason?: string } {
  // Too fast (under 10 minutes for a 20-min effort is impossible)
  if (durationSeconds < 600) {
    return { valid: false, reason: 'Time too fast - under 10 minutes' };
  }

  // Very fast but possible (elite athletes can do ~16-18 min)
  if (durationSeconds < 900) {
    return { valid: true, reason: 'Exceptional time - may need verification' };
  }

  // Too slow (over 45 minutes suggests incomplete effort)
  if (durationSeconds > 2700) {
    return { valid: false, reason: 'Time exceeds 45 minutes' };
  }

  return { valid: true };
}

/**
 * Check if heart rate is plausible
 * Typical range: 140-200 bpm for hard effort
 */
export function isHRPlausible(avgHR: number): { valid: boolean; reason?: string } {
  if (avgHR < 100) {
    return { valid: false, reason: 'Average HR too low for effort' };
  }

  if (avgHR > 220) {
    return { valid: false, reason: 'Average HR exceeds physiological maximum' };
  }

  if (avgHR < 130) {
    return { valid: true, reason: 'Low HR for effort - may not be maximal' };
  }

  return { valid: true };
}

/**
 * Run verification checks on a submission
 */
export function verifySubmission(
  durationSeconds: number,
  avgHR?: number | null
): {
  status: 'verified' | 'unverified' | 'flagged';
  reasons: string[];
  confidence: number;
} {
  const reasons: string[] = [];
  let confidence = 100;

  const timeCheck = isTimePlausible(durationSeconds);
  if (!timeCheck.valid) {
    return {
      status: 'flagged',
      reasons: [timeCheck.reason!],
      confidence: 0,
    };
  }

  if (timeCheck.reason) {
    reasons.push(timeCheck.reason);
    confidence -= 20;
  }

  if (avgHR !== undefined && avgHR !== null) {
    const hrCheck = isHRPlausible(avgHR);
    if (!hrCheck.valid) {
      reasons.push(hrCheck.reason!);
      confidence -= 40;
    } else if (hrCheck.reason) {
      reasons.push(hrCheck.reason);
      confidence -= 15;
    } else {
      // HR provided and valid increases confidence
      confidence = Math.min(100, confidence + 10);
    }
  } else {
    reasons.push('No heart rate data provided');
    confidence -= 10;
  }

  if (confidence >= 70) {
    return { status: 'verified', reasons, confidence };
  } else if (confidence >= 40) {
    return { status: 'unverified', reasons, confidence };
  } else {
    return { status: 'flagged', reasons, confidence };
  }
}

/**
 * Generate bot competitors with realistic variance
 */
export function generateBotResults(
  baselineSeconds: number,
  weekIndex: number,
  botCount: number = 5
): Array<{ name: string; duration: number; score: number }> {
  const botNames = [
    'SpeedyGonzales', 'MarathonMike', 'SwiftSarah', 'TurboTom',
    'FastFiona', 'QuickQuinn', 'RunnerRick', 'JoggerJen',
    'PacePaul', 'StrideSteve'
  ];

  const results: Array<{ name: string; duration: number; score: number }> = [];
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < botCount; i++) {
    const name = botNames[i % botNames.length];
    const seed = i * 1000 + weekIndex;

    // Each bot has a different skill level (-10% to +5% from user baseline)
    const skillOffset = (seededRandom(seed) - 0.5) * 0.15;
    const botBaseline = baselineSeconds * (1 + skillOffset);

    // Weekly variance: -3% to +3%
    const weeklyVariance = (seededRandom(seed + 1) - 0.5) * 0.06;
    const duration = Math.round(botBaseline * (1 + weeklyVariance));

    const scoreResult = computeScore(botBaseline, duration);

    results.push({
      name,
      duration,
      score: scoreResult.score,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

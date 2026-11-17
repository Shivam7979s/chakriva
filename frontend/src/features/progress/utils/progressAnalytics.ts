import {
  BASELINE_CANONICAL_PROBLEMS,
  EXTENDED_CATALOG_PROBLEMS,
  type CatalogProblemItem,
} from '../../roadmap/utils/catalogRegistry.ts';
import type {
  DifficultyAnalyticsDto,
  TopicAnalyticsDto,
  CodingStatsDto,
  DeterministicInsightDto,
} from '@/lib/apiClient';

/**
 * Deduplicated list of verified canonical problems from the registry.
 */
export const getDeduplicatedCatalog = (): CatalogProblemItem[] => {
  const seen = new Set<string>();
  const list: CatalogProblemItem[] = [];

  for (const p of [...BASELINE_CANONICAL_PROBLEMS, ...EXTENDED_CATALOG_PROBLEMS]) {
    const key = p.slug || p.verniqProblemId;
    if (!seen.has(key)) {
      seen.add(key);
      list.push(p);
    }
  }

  return list;
};

/**
 * Safely computes percentage without NaN or divide-by-zero errors.
 */
export const safePercentage = (numerator: number, denominator: number): number => {
  if (!denominator || denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
};

/**
 * Evaluates sample-size safe assessment tier for a topic.
 * Rule: Fewer than 3 attempts is classified as 'EXPLORING' to prevent premature weakness flagging.
 */
export const evaluateTopicAssessment = (
  attempted: number,
  solveRate: number
): 'STRONG' | 'DEVELOPING' | 'NEEDS_PRACTICE' | 'EXPLORING' => {
  if (attempted < 3) {
    return 'EXPLORING';
  }
  if (solveRate >= 70) {
    return 'STRONG';
  }
  if (solveRate >= 40) {
    return 'DEVELOPING';
  }
  return 'NEEDS_PRACTICE';
};

export interface AssessmentPillConfig {
  label: string;
  className: string;
  dotColor: string;
}

/**
 * Returns human-readable styling for assessment status pills (no uppercase screamers).
 */
export const getAssessmentPillConfig = (
  assessment: 'STRONG' | 'DEVELOPING' | 'NEEDS_PRACTICE' | 'EXPLORING' | string
): AssessmentPillConfig => {
  switch (assessment) {
    case 'STRONG':
      return {
        label: 'Strong',
        className: 'bg-[#00B8A3]/10 text-[#00B8A3] border-[#00B8A3]/25',
        dotColor: 'bg-[#00B8A3]',
      };
    case 'DEVELOPING':
      return {
        label: 'Developing',
        className: 'bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/25',
        dotColor: 'bg-[#3B82F6]',
      };
    case 'NEEDS_PRACTICE':
      return {
        label: 'Needs Practice',
        className: 'bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/25',
        dotColor: 'bg-[#F59E0B]',
      };
    case 'EXPLORING':
    default:
      return {
        label: 'Exploring',
        className: 'bg-white/[0.04] text-[#94A3B8] border-white/[0.08]',
        dotColor: 'bg-[#94A3B8]',
      };
  }
};

/**
 * Derives client-side difficulty analytics from user progressMap and canonical catalog.
 */
export const deriveDifficultyStatsFromProgress = (
  progressMap: Record<string, string>
): DifficultyAnalyticsDto => {
  const catalog = getDeduplicatedCatalog();

  const counts = {
    easy: { solved: 0, attempted: 0, total: 0 },
    medium: { solved: 0, attempted: 0, total: 0 },
    hard: { solved: 0, attempted: 0, total: 0 },
  };

  catalog.forEach((p) => {
    const diff = (p.difficulty || 'medium').toLowerCase() as 'easy' | 'medium' | 'hard';
    if (!counts[diff]) return;

    counts[diff].total += 1;
    const status = progressMap[p.slug] || progressMap[p.verniqProblemId];

    if (status === 'solved') {
      counts[diff].solved += 1;
      counts[diff].attempted += 1;
    } else if (status === 'attempted') {
      counts[diff].attempted += 1;
    }
  });

  const totalSolved = counts.easy.solved + counts.medium.solved + counts.hard.solved;
  const totalAttempted = counts.easy.attempted + counts.medium.attempted + counts.hard.attempted;
  const totalCatalog = catalog.length;

  return {
    easy: {
      difficulty: 'Easy',
      solved: counts.easy.solved,
      attempted: counts.easy.attempted,
      total: counts.easy.total,
      solveRate: safePercentage(counts.easy.solved, counts.easy.attempted || counts.easy.total),
    },
    medium: {
      difficulty: 'Medium',
      solved: counts.medium.solved,
      attempted: counts.medium.attempted,
      total: counts.medium.total,
      solveRate: safePercentage(counts.medium.solved, counts.medium.attempted || counts.medium.total),
    },
    hard: {
      difficulty: 'Hard',
      solved: counts.hard.solved,
      attempted: counts.hard.attempted,
      total: counts.hard.total,
      solveRate: safePercentage(counts.hard.solved, counts.hard.attempted || counts.hard.total),
    },
    totalSolved,
    totalAttempted,
    totalCatalog,
  };
};

/**
 * Derives topic-wise analytics from user progressMap and canonical catalog.
 */
export const deriveTopicStatsFromProgress = (
  progressMap: Record<string, string>
): TopicAnalyticsDto[] => {
  const catalog = getDeduplicatedCatalog();
  const topicMap = new Map<string, { solved: number; attempted: number; total: number }>();

  catalog.forEach((p) => {
    const topic = p.topic || 'General DSA';
    const entry = topicMap.get(topic) || { solved: 0, attempted: 0, total: 0 };
    entry.total += 1;

    const status = progressMap[p.slug] || progressMap[p.verniqProblemId];
    if (status === 'solved') {
      entry.solved += 1;
      entry.attempted += 1;
    } else if (status === 'attempted') {
      entry.attempted += 1;
    }

    topicMap.set(topic, entry);
  });

  const topics: TopicAnalyticsDto[] = [];
  topicMap.forEach((val, topicName) => {
    const slug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const solveRate = safePercentage(val.solved, val.attempted || val.total);
    const assessment = evaluateTopicAssessment(val.attempted, solveRate);

    topics.push({
      slug,
      name: topicName,
      solved: val.solved,
      attempted: val.attempted,
      total: val.total,
      solveRate,
      assessment,
    });
  });

  // Sort: topics with activity first, then by total problems descending
  return topics.sort((a, b) => {
    if (b.solved !== a.solved) return b.solved - a.solved;
    if (b.attempted !== a.attempted) return b.attempted - a.attempted;
    return b.total - a.total;
  });
};

/**
 * Synthesizes default coding stats when backend API is unavailable or user is brand new.
 */
export const deriveDefaultCodingStats = (
  progressMap: Record<string, string>,
  profileSolvedCount?: number
): CodingStatsDto => {
  const catalog = getDeduplicatedCatalog();
  let solved = 0;
  let attempted = 0;

  catalog.forEach((p) => {
    const status = progressMap[p.slug] || progressMap[p.verniqProblemId];
    if (status === 'solved') {
      solved += 1;
      attempted += 1;
    } else if (status === 'attempted') {
      attempted += 1;
    }
  });

  // If profile holds a larger solved count from remote DB, honor that count
  const effectiveSolved = Math.max(solved, profileSolvedCount || 0);
  const effectiveAttempted = Math.max(attempted, effectiveSolved);

  return {
    problemsSolved: effectiveSolved,
    problemsAttempted: effectiveAttempted,
    problemSolveRate: safePercentage(effectiveSolved, effectiveAttempted),
    totalSubmissions: effectiveAttempted,
    acceptedSubmissions: effectiveSolved,
    submissionAcceptanceRate: safePercentage(effectiveSolved, effectiveAttempted),
    verdictDistribution: {
      accepted: effectiveSolved,
      wrongAnswer: Math.max(0, effectiveAttempted - effectiveSolved),
      timeLimitExceeded: 0,
      memoryLimitExceeded: 0,
      compilationError: 0,
      runtimeError: 0,
      internalError: 0,
      systemError: 0,
      cancelled: 0,
      total: effectiveAttempted,
    },
  };
};

/**
 * Builds deterministic insights for guidance without telemetry jargon.
 */
export const generateFallbackInsights = (
  solvedCount: number,
  activeRoadmapTitle?: string | null
): DeterministicInsightDto[] => {
  const list: DeterministicInsightDto[] = [];

  if (solvedCount === 0) {
    list.push({
      id: 'welcome-start',
      category: 'WELCOME',
      title: 'Begin Your Problem Solving Journey',
      description: 'Solve foundational algorithmic problems like Two Sum to establish your performance and accuracy vectors.',
      suggestedAction: 'Start Two Sum',
      actionUrl: '/app/practice/two-sum',
    });
  } else if (solvedCount < 10) {
    list.push({
      id: 'early-momentum',
      category: 'VELOCITY',
      title: 'Building Core Problem Solving Foundations',
      description: `You have solved ${solvedCount} canonical problem${solvedCount === 1 ? '' : 's'}. Continue expanding through Arrays, Two Pointers, and Binary Search to consolidate patterns.`,
      suggestedAction: 'Explore Practice Catalog',
      actionUrl: '/app/practice',
    });
  } else {
    list.push({
      id: 'mastery-track',
      category: 'STRENGTH',
      title: 'Consistent Algorithmic Momentum',
      description: `${solvedCount} problems verified through the judge. Reinforce key patterns through timed virtual contests and targeted sheet drills.`,
      suggestedAction: 'View Contests',
      actionUrl: '/app/contests',
    });
  }

  if (activeRoadmapTitle) {
    list.push({
      id: 'active-roadmap-insight',
      category: 'RECOMMENDATION',
      title: `Active Schedule: ${activeRoadmapTitle}`,
      description: 'Maintain your planned pace to hit your target readiness deadline without backlog buildup.',
      suggestedAction: 'Open Study Plan',
      actionUrl: '/app/roadmap/adaptive',
    });
  }

  return list;
};


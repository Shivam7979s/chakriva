import type { Problem, ProblemStatus } from '@/types';

export type ContestCategory = 'virtual' | 'oa_sprint' | 'topic_drill';

export type ContestFilterTabId = 'all' | 'featured' | ContestCategory | 'my_contests';

export type ContestScheduleCadence = 'weekly' | 'biweekly';

export interface ContestProblemSpec {
  label: string;
  slug: string;
  points: number;
}

export interface ContestDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: ContestCategory;
  durationMinutes: number;
  difficultyLevel: 'Beginner' | 'Standard' | 'Advanced';
  featured?: boolean;
  scheduleCadence?: ContestScheduleCadence;
  problems: ContestProblemSpec[];
}

export interface ResolvedContestProblem {
  label: string;
  points: number;
  problem: Problem;
  status: ProblemStatus;
}

export interface ResolvedContestSummary {
  definition: ContestDefinition;
  resolvedProblems: ResolvedContestProblem[];
  solvedCount: number;
  attemptedCount: number;
  totalCount: number;
  earnedPoints: number;
  totalPoints: number;
  isCompleted: boolean;
}

export interface ActiveContestSession {
  contestId: string;
  startedAtMs: number;
  durationMinutes: number;
}

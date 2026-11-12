import type { Problem, ProblemStatus } from '@/types';

export type SheetCategory = 'chakriva' | 'company' | 'topic' | 'goal' | 'beginner';

export interface SheetStepDefinition {
  id: string;
  stepNumber: number;
  title: string;
  focus: string;
  targetCount: number;
  prioritySlugs: string[];
  topicKeywords: string[];
  difficulties?: Array<'easy' | 'medium' | 'hard'>;
}

export interface SheetDefinition {
  id: string;
  category: SheetCategory;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  estHours: string;
  accentHex: string;
  recommendedFor: string;
  steps: SheetStepDefinition[];
}

export interface ResolvedSheetProblem {
  problem: Problem;
  status: ProblemStatus;
  isBookmarked: boolean;
  keyInvariant?: string;
}

export interface ResolvedSheetStep {
  definition: SheetStepDefinition;
  problems: ResolvedSheetProblem[];
  solvedCount: number;
  attemptedCount: number;
  totalCount: number;
}

export interface ResolvedSheetSummary {
  definition: SheetDefinition;
  steps: ResolvedSheetStep[];
  allProblems: ResolvedSheetProblem[];
  totalCount: number;
  solvedCount: number;
  attemptedCount: number;
  bookmarkedCount: number;
  completionPercent: number;
  difficultyCounts: {
    easy: { total: number; solved: number };
    medium: { total: number; solved: number };
    hard: { total: number; solved: number };
  };
}


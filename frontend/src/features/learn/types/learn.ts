import type { SubjectId } from '@/features/roadmap/types/adaptive';

export type LearnTrackCategory =
  | 'dsa'
  | 'core_cs'
  | 'system_design'
  | 'data_sql'
  | 'systems_labs';

export type CodeLanguage = 'python' | 'java' | 'cpp' | 'typescript';

export type TrackIconKey =
  | 'foundations'
  | 'a2z'
  | 'patterns'
  | 'sprint'
  | 'dbms'
  | 'os'
  | 'cn'
  | 'oop'
  | 'lld'
  | 'hld'
  | 'sql'
  | 'rust'
  | 'raft'
  | 'grpc'
  | 'llvm';

export interface LearnCodeSnippet {
  language: CodeLanguage;
  label: string;
  code: string;
  complexity: string;
}

export interface InteractiveStepHighlight {
  label: string;
  value: string;
  tone?: 'sapphire' | 'teal' | 'amber' | 'violet';
}

export interface InteractiveStepFrame {
  stepNumber: number;
  title: string;
  stateSummary: string;
  highlights: InteractiveStepHighlight[];
  pointerNote: string;
}

export interface LessonCheckQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LearnLessonSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface LearnLesson {
  id: string;
  slug: string;
  moduleTitle?: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  keyInvariant: string;
  mentalModel: string;
  sections: LearnLessonSection[];
  interactiveTrace?: {
    title: string;
    subtitle: string;
    steps: InteractiveStepFrame[];
  };
  codeTemplates?: LearnCodeSnippet[];
  pitfalls?: string[];
  microCheck?: LessonCheckQuestion;
  linkedProblemSlugs?: string[];
  linkedTopics?: string[];
}

export interface LearnModuleGroup {
  id: string;
  title: string;
  lessons: LearnLesson[];
}

export interface LearnTrack {
  id: string;
  slug: string;
  subjectId?: SubjectId;
  category: LearnTrackCategory;
  sectionLabel: string;
  sectionBadge?: string;
  iconKey: TrackIconKey;
  title: string;
  shortTitle: string;
  subtitle: string;
  levelBadge: string;
  totalMinutes: number;
  prerequisites: string[];
  environmentLabel?: string;
  isJudgeBacked: boolean;
  lessons: LearnLesson[];
}

export interface LearnProgressState {
  completedLessonIds: Record<string, boolean>;
  bookmarkedLessonIds: Record<string, boolean>;
  quizAnswers: Record<string, number>;
  lastVisitedTrackSlug?: string;
  lastVisitedLessonSlug?: string;
}

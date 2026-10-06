/**
 * VERNIQ Roadmap Domain Types
 * =============================
 * Independent from Problem Catalog canonical records.
 * References problems strictly through permanent verniq_id.
 */

export type LearningItemType =
  | 'VIDEO'
  | 'ARTICLE'
  | 'CONCEPT'
  | 'LECTURE'
  | 'PRACTICE'
  | 'PROBLEM'
  | 'QUIZ'
  | 'PROJECT'
  | 'REVISION'
  | 'MOCK_INTERVIEW';

export type RoadmapItemStatus =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface ProblemSummary {
  verniqId: string;
  title: string;
  difficulty: DifficultyLevel;
  slug: string;
  topics?: string[];
}

export interface RoadmapProblemReference {
  id: string;
  roadmapItemId: string;
  verniqProblemId: string;
  position: number;
  required: boolean;
  notes?: string | null;
  problemSummary?: ProblemSummary | null;
}

export interface RoadmapItem {
  id: string;
  dayId: string;
  topicId?: string | null;
  title: string;
  description?: string | null;
  itemType: LearningItemType;
  position: number;
  required: boolean;
  estimatedMinutes: number;
  contentUrl?: string | null;
  contentMarkdown?: string | null;
  metadata?: Record<string, any>;
  problemReference?: RoadmapProblemReference | null;
  status?: RoadmapItemStatus;
}

export interface RoadmapTopic {
  id: string;
  dayId: string;
  title: string;
  description?: string | null;
  position: number;
  items: RoadmapItem[];
}

export interface RoadmapDay {
  id: string;
  sprintId: string;
  dayNumber: number;
  title: string;
  description?: string | null;
  learningObjectives: string[];
  position: number;
  topics: RoadmapTopic[];
  items: RoadmapItem[];
  status?: RoadmapItemStatus;
}

export interface RoadmapSprint {
  id: string;
  roadmapId: string;
  phaseId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  position: number;
  estimatedHours: number;
  isPublished: boolean;
  days: RoadmapDay[];
  status?: RoadmapItemStatus;
}

export interface RoadmapPhase {
  id: string;
  roadmapId: string;
  title: string;
  slug: string;
  description?: string | null;
  position: number;
}

export interface Roadmap {
  id: string;
  title: string;
  slug: string;
  description: string;
  estimatedDuration: string;
  totalSprints: number;
  iconName: string;
  position: number;
  isPublished: boolean;
  phases: RoadmapPhase[];
  sprints: RoadmapSprint[];
}

export interface UserRoadmapProgress {
  userId: string;
  roadmapId: string;
  currentSprintId?: string | null;
  currentDayId?: string | null;
  currentItemId?: string | null;
  status: string;
  completedItemsCount: number;
  totalItemsCount: number;
  lastAccessedAt?: string | null;
}

export interface ProgressSummary {
  completedItems: number;
  totalItems: number;
  percentage: number;
  completedDays: number;
  totalDays: number;
  status: RoadmapItemStatus;
  completedNodes?: number;
  totalNodes?: number;
  currentSprintTitle?: string;
  currentDayNumber?: number;
}

export interface ContinueLearningTarget {
  roadmapId: string;
  sprintId: string;
  sprintTitle: string;
  dayId: string;
  dayNumber: number;
  dayTitle: string;
  itemId: string;
  itemTitle: string;
  itemType: LearningItemType;
  verniqProblemId?: string | null;
  problemSlug?: string | null;
  problemTitle?: string | null;
  problemDifficulty?: DifficultyLevel | null;
  estimatedMinutes: number;
}

/**
 * CHAKRIVA Adaptive Roadmap Domain Types
 * =====================================
 * Personalized, goal-driven DSA curriculum with adaptive rescheduling,
 * availability modeling, and canonical catalog problem binding.
 */

export type RoadmapGoal =
  | 'internship'
  | 'entry_level'
  | 'experienced'
  | 'competitive_programming'
  | 'dsa_fundamentals'
  | 'coding_interview'
  | 'placement_prep'
  | 'custom_goal';

export type CompanyTargetType =
  | 'product_based'
  | 'faang_competitive'
  | 'startups'
  | 'service_based'
  | 'examinations'
  | 'open_to_all';

export type TargetRegion = 'india' | 'us' | 'europe' | 'us_europe' | 'other';

export type ExperienceLevel = 'fresher' | '0_2' | '2_5' | '5_plus';

export type SubjectId =
  | 'dsa'
  | 'cs_fundamentals'
  | 'oop'
  | 'dbms'
  | 'os'
  | 'cn'
  | 'sql'
  | 'system_design'
  | 'aptitude';

export type SubjectProficiency = 'not_started' | 'beginner' | 'intermediate' | 'advanced';

export type StartDateOption = 'today' | 'tomorrow' | 'custom';

export type RoadmapLifecycleStatus = 'active' | 'paused' | 'completed';

export type SkillLevel =
  | 'beginner'
  | 'basic_familiarity'
  | 'intermediate'
  | 'advanced';

export type SchedulePacing = 'balanced' | 'intensive' | 'flexible';

export type LearningStyle = 'concepts_first' | 'practice_first' | 'balanced';

export type RevisionFrequency = 'daily' | 'weekly' | 'milestone';

export type SessionPreference = 'shorter_daily' | 'longer_focused';

export type ChallengeArea =
  | 'concepts'
  | 'patterns'
  | 'implementation'
  | 'medium_hard'
  | 'complexity'
  | 'consistency';

export type AdaptiveTaskType = 'learn' | 'practice' | 'revise' | 'assess' | 'concept' | 'problem' | 'revision' | 'milestone';

export type AdaptiveTaskStatus = 'upcoming' | 'not_started' | 'in_progress' | 'completed' | 'missed';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface WeeklyAvailability {
  mon: number; // hours (0 = explicit rest day)
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface RoadmapWizardDraft {
  // Step A / Page 2: About You & Career Goal
  planName?: string;
  experienceLevel?: ExperienceLevel;
  goal: RoadmapGoal;
  customGoalText?: string;
  companyTargetType?: CompanyTargetType;
  targetRegion?: TargetRegion;
  targetCompanies: string[];
  targetRole: string;

  // Step B / Page 3: Build Your Preparation & Current Skill Level
  selectedSubjects?: SubjectId[];
  subjectProficiencies?: Partial<Record<SubjectId, SubjectProficiency>>;
  selectedTopics?: string[];
  skillLevel: SkillLevel;
  primaryLanguage: string;
  topicComfort?: Record<string, 'novice' | 'learning' | 'comfortable' | 'mastered'>;
  approxProblemsSolved?: number;
  inferredFromActivity?: boolean;
  biggestChallenge?: ChallengeArea;

  // Step C / Page 5: Weekly Availability & Schedule
  targetDeadline: string; // ISO date YYYY-MM-DD
  timelineWeeks: number;
  isFlexibleTimeline?: boolean;
  weeklyAvailability: WeeklyAvailability;
  studyDaysPerWeek?: number;
  sessionPreference?: SessionPreference;

  // Step D / Page 4 & 6: Learning Preferences & Finalization
  learningStyle?: LearningStyle;
  revisionFrequency?: RevisionFrequency;
  includeTimedPractice?: boolean;
  includeMockInterviews?: boolean; // Clearly treated as future integration
  struggleTopics: string[];
  masteredTopics: string[];
  pacing: SchedulePacing;
  startDateOption?: StartDateOption;
  customStartDate?: string;
  personalizationMode?: 'personalized' | 'baseline';
}

export interface FeasibilityAssessment {
  isRealistic: boolean;
  totalAvailableHours: number;
  estimatedRequiredHours: number;
  weeklyHours: number;
  pacingSummary: string;
  recommendation: string;
  feasibleAlternativeWeeks?: number;
  deficitHours?: number;
}

export interface AdaptiveTask {
  id: string;
  title: string;
  taskType: AdaptiveTaskType;
  estimatedMinutes: number;
  scheduledDate: string; // YYYY-MM-DD
  status: AdaptiveTaskStatus;
  completedAt?: string | null;
  prerequisiteTaskIds?: string[];
  topic: string;
  subject?: SubjectId;
  // Problem binding (strictly verified from canonical catalog)
  verniqProblemId?: string;
  problemSlug?: string;
  problemTitle?: string;
  problemDifficulty?: 'easy' | 'medium' | 'hard';
  problemAcceptanceRate?: number;
  description?: string;
  keyInvariant?: string;
}

export interface AdaptiveDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  dayNumber: number;
  availableHours: number;
  isRestDay: boolean;
  tasks: AdaptiveTask[];
}

export interface AdaptiveWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  title: string;
  objective: string;
  stageName: string;
  days: AdaptiveDay[];
}

export interface AdaptiveStage {
  id: string;
  stageNumber: number;
  title: string;
  description: string;
  topics: string[];
  weeks: number[]; // week numbers belonging to this stage
}

export interface PlanExplanation {
  goalAlignmentSummary: string;
  startingPointRationale: string;
  scheduleFitExplanation: string;
  assumptions: string[];
  contentGaps: string[];
}

export interface AdaptiveRoadmap {
  id: string;
  userId?: string;
  title?: string;
  status?: RoadmapLifecycleStatus;
  isActive?: boolean;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
  profile: RoadmapWizardDraft;
  feasibility: FeasibilityAssessment;
  stages: AdaptiveStage[];
  weeks: AdaptiveWeek[];
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
  progressPercent: number;
  version?: number;
  lastRecalculatedAt?: string;
  explanation?: PlanExplanation;
  nonDsaTracks?: { subject: SubjectId; label: string; note: string }[];
}

export interface ScheduleRecalculationProposal {
  roadmapId: string;
  missedTaskCount: number;
  affectedDaysCount: number;
  explanation: string;
  rescheduledTasks: {
    taskId: string;
    taskTitle: string;
    originalDate: string;
    newDate: string;
    reason: string;
  }[];
}

/**
 * VERNIQ Foundational Domain Types (Phase 0 Baseline)
 * Aligned with PostgreSQL database conventions in docs/database/database-conventions.md
 */

export type UserRole = 'student' | 'mentor' | 'admin';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type ProgrammingLanguage = 'cpp' | 'java' | 'python' | 'typescript' | 'go';

export type SubmissionVerdict =
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'compilation_error'
  | 'runtime_error'
  | 'cancelled'
  | 'internal_error'
  | 'system_error'
  | 'ac'   // Accepted shorthand
  | 'wa'   // Wrong Answer shorthand
  | 'tle'  // Time Limit Exceeded shorthand
  | 'mle'  // Memory Limit Exceeded shorthand
  | 'ce'   // Compilation Error shorthand
  | 're'   // Runtime Error shorthand
  | 'pe';  // Presentation Error shorthand

export interface ExecutionTelemetry {
  execution_id: string;
  request_received_at: string;
  job_queued_at?: string | null;
  worker_acquired_at?: string | null;
  sandbox_created_at?: string | null;
  compile_started_at?: string | null;
  compile_finished_at?: string | null;
  execution_started_at?: string | null;
  execution_finished_at?: string | null;
  result_collected_at?: string | null;
  persistence_finished_at?: string | null;
  response_sent_at?: string | null;
  queue_ms?: number;
  worker_acquisition_ms?: number;
  sandbox_startup_ms?: number;
  compile_ms?: number;
  execution_ms?: number;
  result_ms?: number;
  persistence_ms?: number;
  total_ms?: number;
  cached_compilation?: boolean;
}

export interface FailedTestCaseInfo {
  test_number: number;
  testNumber?: number;
  input?: string | null;
  actual_output?: string | null;
  actualOutput?: string | null;
  expected_output?: string | null;
  expectedOutput?: string | null;
  error_message?: string | null;
  errorMessage?: string | null;
  failure_type?: string | null;
  failureType?: string | null;
  normalized?: boolean;
}

export interface SampleTestResult {
  test_number: number;
  input: string;
  expected_output?: string | null;
  actual_output?: string | null;
  passed: boolean;
  runtime_ms?: number;
  verdict?: string;
  stderr?: string | null;
}

export interface Submission {
  id: string;
  user_id: string;
  problem_id?: string | null;
  language: ProgrammingLanguage;
  source_code: string;
  stdin_input?: string | null;
  verdict: SubmissionVerdict;
  runtime_ms: number;
  memory_kb: number;
  stdout_output?: string | null;
  stderr_output?: string | null;
  compile_output?: string | null;
  test_cases_passed: number;
  total_test_cases: number;
  is_custom_run: boolean;
  created_at: string;
  completed_at?: string | null;
  telemetry?: ExecutionTelemetry | null;
  first_failed_test?: FailedTestCaseInfo | null;
  firstFailedTest?: FailedTestCaseInfo | null;
  failed_test_index?: number | null;
  error_message?: string | null;
  request_id?: string | null;
  sample_test_results?: SampleTestResult[] | null;
}

export type CompletionStatus = 'completed' | 'in_progress' | 'pending';

export interface College {
  id: string;
  name: string;
  slug: string;
  state?: string | null;
  country?: string | null;
  student_count: number;
  total_score: number;
  created_at?: string;
}

export interface UserProfile {
  id: string; // UUID references auth.users(id)
  username: string; // CITEXT
  full_name: string; // TEXT
  avatar_url?: string | null;
  role: UserRole; // app_role enum
  bio?: string | null;
  github_username?: string | null;
  linkedin_url?: string | null;
  leetcode_username?: string | null;
  college_id?: string | null;
  college_name?: string | null;
  preferred_language?: string | null;
  tab_size?: number;
  score: number;
  problems_solved_count: number;
  current_streak: number;
  max_streak: number;
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  college_name?: string | null;
  college_id?: string | null;
  problems_solved_count: number;
  score: number;
  current_streak?: number;
}

export interface CollegeLeaderboardEntry {
  college_rank: number;
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  college_id: string;
  college_name: string;
  problems_solved_count: number;
  score: number;
  current_streak?: number;
}

export interface CampusLeagueEntry {
  rank: number;
  id: string;
  name: string;
  slug: string;
  state?: string | null;
  country?: string | null;
  student_count: number;
  total_score: number;
}

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: DifficultyLevel;
  acceptanceRate: number;
  tags: string[];
  isPremium?: boolean;
}

export interface RoadmapMilestone {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
  status: CompletionStatus;
}

export type ProblemStatus = 'todo' | 'attempted' | 'solved';

export interface ProblemTag {
  id: string;
  name: string;
  slug: string;
}

export interface TestCase {
  id: string;
  problem_id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
}

export type ProblemWorkflowStatus =
  | 'draft'
  | 'content_authoring'
  | 'content_review'
  | 'technical_review'
  | 'provenance_review'
  | 'judge_ready'
  | 'ready'
  | 'published'
  | 'archived';

export interface ProblemContentRevision {
  id: string;
  problem_id: string;
  revision_number: number;
  author_id?: string | null;
  author_type: 'human' | 'ai_assisted' | 'community' | 'imported';
  generated_with_ai: boolean;
  human_reviewed: boolean;
  source_reference?: string | null;
  change_summary?: string | null;
  content_snapshot: Record<string, any>;
  review_status: 'draft' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
}

export interface ProblemProvenanceSource {
  id: string;
  problem_id: string;
  source_type: string;
  source_name: string;
  source_url?: string | null;
  license?: string | null;
  attribution_required: boolean;
  commercial_use_allowed: boolean;
  derivative_work_allowed: boolean;
  provenance_status: string;
  verification_status: 'pending_review' | 'verified_valid' | 'rejected';
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ProblemTechnicalReview {
  id: string;
  problem_id: string;
  revision_id?: string | null;
  status: 'pending' | 'passed' | 'failed';
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  checklist: {
    statement_consistent: boolean;
    examples_correct: boolean;
    constraints_consistent: boolean;
    edge_cases_covered: boolean;
    solution_logic_valid: boolean;
    starter_templates_compile: boolean;
    canonical_tests_valid: boolean;
    expected_outputs_correct: boolean;
    languages_compatible: boolean;
  };
  review_notes?: string | null;
  created_at: string;
}

export type BatchLifecycleStatus =
  | 'CREATED'
  | 'SELECTED'
  | 'AUTHORING'
  | 'CONTENT_REVIEW'
  | 'TECHNICAL_REVIEW'
  | 'PROVENANCE_REVIEW'
  | 'JUDGE_VALIDATION'
  | 'HUMAN_APPROVAL'
  | 'COMPLETED'
  | 'ARCHIVED';

export type BatchItemStatus =
  | 'SELECTED'
  | 'AUTHORING'
  | 'CONTENT_REVIEW'
  | 'CONTENT_REVIEW_BLOCKED'
  | 'TECHNICAL_REVIEW'
  | 'TECHNICAL_REVIEW_BLOCKED'
  | 'PROVENANCE_REVIEW'
  | 'PROVENANCE_REVIEW_BLOCKED'
  | 'JUDGE_VALIDATION'
  | 'JUDGE_VALIDATION_BLOCKED'
  | 'HUMAN_APPROVAL'
  | 'APPROVED'
  | 'COMPLETED'
  | 'FAILED';

export interface AuthoringBatch {
  id: string;
  batch_name: string;
  target_count: number;
  actual_count: number;
  batch_status: BatchLifecycleStatus;
  authoring_status: string;
  review_status: string;
  completion_percentage: number;
  failure_count: number;
  published_count: number;
  selection_criteria: Record<string, any>;
  created_by?: string | null;
  creator_email?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface BatchProblemItem {
  id: string;
  batch_id: string;
  problem_id: string;
  item_status: BatchItemStatus;
  assigned_author_id?: string | null;
  assigned_reviewer_id?: string | null;
  failure_step?: string | null;
  failure_reason?: string | null;
  retry_count: number;
  content_completeness_pct: number;
  test_completeness_pct: number;
  judge_readiness_pct: number;
  created_at: string;
  updated_at: string;
  verniq_id?: string;
  title?: string;
  difficulty?: string;
  workflow_status?: string;
  provenance_status?: string;
  judge_readiness_status?: string;
  domain_name?: string;
}

export interface AuthoringQueueItem {
  id: string;
  verniq_id: string;
  title: string;
  difficulty: DifficultyLevel;
  domain: string;
  topics: string[];
  workflow_status: ProblemWorkflowStatus;
  provenance_status: string;
  content_completeness: number;
  test_completeness: number;
  test_case_count: number;
  min_tests_required: number;
  judge_readiness: string;
  assigned_batch_id?: string | null;
  assigned_batch_name?: string | null;
  ai_assisted: boolean;
  human_reviewed: boolean;
  is_published: boolean;
}

export interface ProductionPipelineMetrics {
  total_catalog: number;
  published: number;
  draft: number;
  content_authoring: number;
  content_review: number;
  technical_review: number;
  provenance_review: number;
  judge_ready: number;
  blocked: number;
  total_batches: number;
  active_batches: number;
  avg_completion_pct: number;
  total_failed_validations: number;
  missing_provenance: number;
  missing_tests: number;
}

export interface Problem {
  id: string;
  verniq_id?: string;
  title: string;
  slug: string;
  difficulty: DifficultyLevel;
  acceptance_rate: number;
  description_markdown: string;
  constraints_markdown: string;
  starter_templates: Record<string, string>;
  input_format?: string | null;
  output_format?: string | null;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  is_premium: boolean;
  is_published: boolean;
  workflow_status?: ProblemWorkflowStatus;
  domain?: string;
  tags?: string[];
  topics?: string[];
  companies?: string[];
  status?: ProblemStatus;
  revision_due?: boolean;
  author_type?: string;
  generated_with_ai?: boolean;
  human_reviewed?: boolean;
  provenance_status?: string;
  judge_readiness_status?: 'NOT_READY' | 'TESTS_PENDING' | 'LIMITS_PENDING' | 'JUDGE_READY';
  created_at?: string;
  updated_at?: string;
}

export interface RoadmapTopic {
  id: string;
  step_id: string;
  title: string;
  order_index: number;
  problems?: Problem[];
}

export interface RoadmapStep {
  id: string;
  roadmap_id: string;
  title: string;
  order_index: number;
  topics?: RoadmapTopic[];
}

export interface Roadmap {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon_name?: string;
  order_index: number;
  is_published: boolean;
  steps?: RoadmapStep[];
}

export interface UserProblemProgress {
  id?: string;
  user_id: string;
  problem_id: string;
  status: ProblemStatus;
  solved_at?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
}

export interface UserRevisionItem {
  id?: string;
  user_id: string;
  problem_id: string;
  interval_days: number;
  next_review_at: string;
  is_reviewed: boolean;
}

export type PlannerGoal =
  | 'product_sde'
  | 'faang_top_tier'
  | 'core_cs_foundations'
  | 'campus_placement';

export type PlanTaskStatus = 'pending' | 'completed' | 'skipped';

export interface UserStudyPlan {
  id: string;
  user_id: string;
  title: string;
  goal: PlannerGoal;
  target_date: string;
  daily_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface UserStudyPlanTask {
  id: string;
  plan_id: string;
  user_id: string;
  problem_id: string;
  scheduled_date: string; // YYYY-MM-DD
  status: PlanTaskStatus;
  completed_at?: string | null;
  order_index: number;
  problems?: {
    id: string;
    title: string;
    slug: string;
    difficulty: DifficultyLevel;
    tags?: string[];
  };
}

export interface RevisionCard {
  id: string;
  user_id: string;
  problem_id: string;
  interval_days: number;
  next_review_at: string;
  is_reviewed: boolean;
  problem?: {
    id: string;
    title: string;
    slug: string;
    difficulty: DifficultyLevel;
    description_markdown?: string;
    constraints_markdown?: string;
    tags?: string[];
  };
}

export type ConfidenceLevel = 'novice' | 'intermediate' | 'proficient' | 'master';

export interface UserDiagnostic {
  id: string;
  user_id: string;
  tag_id?: string | null;
  tag_name: string;
  mastery_score: number;
  confidence_level: ConfidenceLevel;
  evaluated_at: string;
}

export interface StudySprint {
  id: string;
  user_id: string;
  sprint_number: number;
  title: string;
  primary_tag_id?: string | null;
  primary_topic: string;
  target_hours: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

export type SprintTaskType =
  | 'learn_concept'
  | 'practice_problem'
  | 'spaced_revision'
  | 'mistake_retrial'
  | 'sprint_assessment';

export interface SprintTask {
  id: string;
  sprint_id: string;
  user_id: string;
  problem_id?: string | null;
  task_type: SprintTaskType;
  title: string;
  estimated_minutes: number;
  scheduled_date: string;
  is_completed: boolean;
  completed_at?: string | null;
  order_index: number;
  problem?: {
    id: string;
    title: string;
    slug: string;
    difficulty: DifficultyLevel;
    tags?: string[];
  };
}

export interface ProblemOfTheDay {
  id: string;
  problem_id: string;
  scheduled_date: string;
  points_bonus: number;
  created_at: string;
  problems?: {
    id: string;
    title: string;
    slug: string;
    difficulty: DifficultyLevel;
    tags?: string[];
  };
}

export interface UserCodespace {
  id: string;
  user_id: string;
  title: string;
  language: string;
  code_buffer: string;
  stdin_buffer?: string | null;
  tags?: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserNote {
  id: string;
  user_id: string;
  problem_id?: string | null;
  title: string;
  markdown_content: string;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  problems?: {
    id: string;
    title: string;
    slug: string;
    difficulty: DifficultyLevel;
  };
}




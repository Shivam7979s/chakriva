/**
 * VERNIQ Centralized Spring Boot API Client
 * Aligned with Spring Boot Control Plane (Phases A, B, C, D)
 */

import { supabase } from './supabaseClient';

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (import.meta.env.PROD && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1') || envUrl.startsWith('http:'))) {
      return '/api/v1';
    }
    return envUrl.replace(/\/+$/, '');
  }
  return import.meta.env.DEV ? 'http://localhost:8080' : '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export function buildUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Deduplicate /api/v1 if both base and path specify it
  if (cleanBase.endsWith('/api/v1') && cleanPath.startsWith('/api/v1')) {
    return `${cleanBase}${cleanPath.slice('/api/v1'.length)}`;
  }
  return `${cleanBase}${cleanPath}`;
}

// ==============================================================================
// TYPE DEFINITIONS (Matching Spring Boot DTOs)
// ==============================================================================

export type SubmissionStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'INTERNAL_ERROR'
  | 'CANCELLED';

export type SubmissionVerdict =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'SYSTEM_ERROR'
  | 'INTERNAL_ERROR'
  | 'CANCELLED'
  | 'PENDING';

export interface CreateSubmissionRequest {
  problemId: string;
  language: string;
  sourceCode: string;
  mode?: 'RUN' | 'SUBMIT';
  customInput?: string;
}

export interface SubmissionResponseDto {
  submissionId: string;
  problemId: string;
  language: string;
  status: SubmissionStatus;
  queuedAt: string;
}

export interface SubmissionDetailDto {
  id: string;
  problemVerniqId: string;
  problemTitle: string;
  language: string;
  status: SubmissionStatus;
  verdict: string;
  score: number | null;
  runtimeMs: number | null;
  memoryKb: number | null;
  testCasesPassed: number | null;
  totalTestCases: number | null;
  failedTestIndex: number | null;
  compileOutput: string | null;
  stderrOutput?: string | null;
  stdoutOutput?: string | null;
  errorMessage: string | null;
  problemVersion: number;
  createdAt: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProblemExampleDto {
  input: string;
  output: string;
  explanation?: string | null;
}

export interface ProblemDetailDto {
  id?: string;
  verniqId: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  acceptanceRate: number | null;
  statement: string;
  constraints: string;
  examples: ProblemExampleDto[];
  starterTemplates: Record<string, string>;
  topics: string[];
  companies: string[];
  currentVersion: number;
  publishedAt: string;
}

export interface ProblemSummaryDto {
  verniqId: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  acceptanceRate: number | null;
  topics: string[];
  companies: string[];
}

export type ProgressStatus = 'UNATTEMPTED' | 'ATTEMPTED' | 'SOLVED';

export interface ProblemProgress {
  problemId: string;
  verniqId: string;
  title: string;
  status: ProgressStatus;
  attemptCount: number;
  firstAttemptedAt: string | null;
  lastAttemptedAt: string | null;
  firstSolvedAt: string | null;
  lastSolvedAt: string | null;
  acceptedSubmissionId: string | null;
}

export interface DifficultyProgressItem {
  solved: number;
  attempted: number;
  total: number;
}

export interface DifficultyProgress {
  easy: DifficultyProgressItem;
  medium: DifficultyProgressItem;
  hard: DifficultyProgressItem;
}

export interface TopicProgress {
  topicSlug: string;
  topicName: string;
  solved: number;
  attempted: number;
  total: number;
}

export interface CompanyProgress {
  companySlug: string;
  companyName: string;
  solved: number;
  attempted: number;
  total: number;
}

export interface RecentActivity {
  problemId: string;
  verniqId: string;
  problemTitle: string;
  difficulty: string;
  status: string;
  timestamp: string;
}

export interface ProgressSummary {
  totalProblemsAttempted: number;
  totalProblemsSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  submissionAcceptanceRate: number;
  difficulty: DifficultyProgress;
  topics: TopicProgress[];
  companies: CompanyProgress[];
  recentActivity: RecentActivity[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
  requestId?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ==============================================================================
// ERROR HANDLING
// ==============================================================================

export class ApiClientError extends Error {
  public status: number;
  public code: string;
  public requestId?: string;
  public details?: unknown;

  constructor(
    status: number,
    message: string,
    code: string = 'API_ERROR',
    requestId?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

// ==============================================================================
// INTERNAL HTTP HELPER
// ==============================================================================

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
  } catch {
    // Session retrieval failed or not available
  }
  return {};
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth: boolean = false
): Promise<T> {
  const url = buildUrl(API_BASE_URL, path);
  const authHeaders = requiresAuth ? await getAuthHeader() : {};

  if (requiresAuth && !('Authorization' in authHeaders)) {
    throw new ApiClientError(
      401,
      'Authentication required. Please sign in to perform this action.',
      'UNAUTHORIZED'
    );
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  const timeoutMs = 15000;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = options.signal || timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal,
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiClientError(
        408,
        'Request timed out while waiting for server response. Please try again.',
        'TIMEOUT',
        undefined,
        err
      );
    }
    throw new ApiClientError(
      0,
      'Network failure: Unable to reach the Verniq server. Please check your connection.',
      'NETWORK_FAILURE',
      undefined,
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON response
  }

  if (!response.ok) {
    const status = response.status;
    const requestId = body?.requestId;
    const errorCode = body?.error?.code || `HTTP_${status}`;
    const message =
      body?.error?.message ||
      (status === 401
        ? 'Your session has expired or is invalid. Please sign in again.'
        : status === 403
        ? 'Access forbidden. You do not have permission for this resource.'
        : status === 404
        ? 'Requested resource not found.'
        : status === 429
        ? "You're submitting too frequently. Please wait a moment before trying again."
        : status === 503
        ? 'Submission queue or platform service is temporarily unavailable. Please try again shortly.'
        : status >= 500
        ? "We couldn't complete this request. Your code was not lost."
        : `Request failed with status ${status}`);

    throw new ApiClientError(status, message, errorCode, requestId, body?.error?.details);
  }

  if (!body) {
    throw new ApiClientError(response.status, 'Invalid empty response from server', 'EMPTY_RESPONSE');
  }

  return body.data;
}

// ==============================================================================
// EXPORTED API CLIENT METHODS
// ==============================================================================

export const apiClient = {
  /**
   * Fetches full public details of a problem by Verniq ID (e.g. VRQ-000001) or slug (two-sum).
   */
  async getProblem(identifier: string): Promise<ProblemDetailDto> {
    return request<ProblemDetailDto>(
      `/api/v1/problems/${encodeURIComponent(identifier)}`,
      { method: 'GET' },
      false
    );
  },

  /**
   * Lists published problems with optional filtering and pagination.
   */
  async listProblems(params: {
    page?: number;
    size?: number;
    difficulty?: string;
    topic?: string;
    company?: string;
    search?: string;
  } = {}): Promise<PageResponse<ProblemSummaryDto>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.difficulty) query.set('difficulty', params.difficulty);
    if (params.topic) query.set('topic', params.topic);
    if (params.company) query.set('company', params.company);
    if (params.search) query.set('search', params.search);

    const queryString = query.toString();
    const path = `/api/v1/problems${queryString ? `?${queryString}` : ''}`;
    return request<PageResponse<ProblemSummaryDto>>(path, { method: 'GET' }, false);
  },

  /**
   * Creates an official evaluation submission for judging.
   * Server-controlled fields (userId, status, etc.) are strictly not sent.
   */
  async createSubmission(payload: CreateSubmissionRequest): Promise<SubmissionResponseDto> {
    return request<SubmissionResponseDto>(
      '/api/v1/submissions',
      {
        method: 'POST',
        body: JSON.stringify({
          problemId: payload.problemId,
          language: payload.language.toUpperCase(),
          sourceCode: payload.sourceCode,
          mode: payload.mode || 'SUBMIT',
          customInput: payload.customInput || null,
        }),
      },
      true // Requires valid JWT Bearer
    );
  },

  /**
   * Fetches detailed safe status/verdict for a submission owned by authenticated user.
   */
  async getSubmission(submissionId: string): Promise<SubmissionDetailDto> {
    return request<SubmissionDetailDto>(
      `/api/v1/submissions/${encodeURIComponent(submissionId)}`,
      { method: 'GET' },
      true // Requires valid JWT Bearer
    );
  },

  /**
   * Lists previous submissions of the authenticated user.
   */
  async listUserSubmissions(params: {
    problemId?: string;
    page?: number;
    size?: number;
  } = {}): Promise<PageResponse<SubmissionDetailDto>> {
    const query = new URLSearchParams();
    if (params.problemId) query.set('problemId', params.problemId);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const queryString = query.toString();
    const path = `/api/v1/submissions${queryString ? `?${queryString}` : ''}`;
    return request<PageResponse<SubmissionDetailDto>>(path, { method: 'GET' }, true);
  },

  /**
   * Fetches authenticated user progress summary (difficulty, topics, companies, recent activity).
   */
  async getProgressSummary(): Promise<ProgressSummary> {
    return request<ProgressSummary>('/api/v1/progress/summary', { method: 'GET' }, true);
  },

  /**
   * Fetches problem progress for a single problem by verniqId, slug, or UUID.
   */
  async getProblemProgress(identifier: string): Promise<ProblemProgress> {
    return request<ProblemProgress>(
      `/api/v1/progress/problems/${encodeURIComponent(identifier)}`,
      { method: 'GET' },
      true
    );
  },

  /**
   * Fetches fast lookup map of problemId/verniqId -> status for catalog decoration.
   */
  async getUserProblemStatusMap(): Promise<Record<string, string>> {
    return request<Record<string, string>>('/api/v1/progress/problems', { method: 'GET' }, true);
  },

  // ==============================================================================
  // PHASE G: ROADMAPS & LEARNING ENGINE
  // ==============================================================================

  /**
   * Fetches published roadmaps with authenticated user progress.
   */
  async getRoadmaps(): Promise<RoadmapSummaryDto[]> {
    return request<RoadmapSummaryDto[]>('/api/v1/roadmaps', { method: 'GET' }, true);
  },

  /**
   * Fetches full roadmap tree with server-evaluated node states and problem references.
   */
  async getRoadmap(slugOrId: string = 'dsa-mastery'): Promise<RoadmapDetailDto> {
    return request<RoadmapDetailDto>(
      `/api/v1/roadmaps/${encodeURIComponent(slugOrId)}`,
      { method: 'GET' },
      true
    );
  },

  /**
   * Fetches roadmap node counts and completion percentage.
   */
  async getRoadmapProgress(slugOrId: string = 'dsa-mastery'): Promise<RoadmapProgressSummaryDto> {
    return request<RoadmapProgressSummaryDto>(
      `/api/v1/roadmaps/${encodeURIComponent(slugOrId)}/progress`,
      { method: 'GET' },
      true
    );
  },

  /**
   * Fetches deterministic next recommended problem in the roadmap.
   */
  async getNextRoadmapProblem(slugOrId: string = 'dsa-mastery'): Promise<NextRecommendedProblemDto | null> {
    try {
      return await request<NextRecommendedProblemDto>(
        `/api/v1/roadmaps/${encodeURIComponent(slugOrId)}/next`,
        { method: 'GET' },
        true
      );
    } catch (err: any) {
      // 204 No Content or null if all problems solved
      return null;
    }
  },

  /**
   * Completes a non-problem item (Concept, Reading, Lecture, Revision).
   */
  async completeRoadmapItem(itemId: string): Promise<CompleteItemResponse> {
    return request<CompleteItemResponse>(
      `/api/v1/roadmaps/items/${encodeURIComponent(itemId)}/complete`,
      { method: 'POST', body: '{}' },
      true
    );
  },

  // ==============================================================================
  // PHASE I: PRODUCT INTELLIGENCE & LEARNING ANALYTICS
  // ==============================================================================

  /**
   * Fetches composite analytics overview (coding stats, difficulty, topics, companies, velocity, trends, insights).
   */
  async getAnalyticsOverview(): Promise<AnalyticsOverviewDto> {
    return request<AnalyticsOverviewDto>('/api/v1/analytics/overview', { method: 'GET' }, true);
  },

  /**
   * Fetches difficulty-specific solve statistics.
   */
  async getAnalyticsDifficulty(): Promise<DifficultyAnalyticsDto> {
    return request<DifficultyAnalyticsDto>('/api/v1/analytics/difficulty', { method: 'GET' }, true);
  },

  /**
   * Fetches topic analytics with sample-size-safe assessments.
   */
  async getAnalyticsTopics(): Promise<TopicAnalyticsDto[]> {
    return request<TopicAnalyticsDto[]>('/api/v1/analytics/topics', { method: 'GET' }, true);
  },

  /**
   * Fetches company analytics.
   */
  async getAnalyticsCompanies(): Promise<CompanyAnalyticsDto[]> {
    return request<CompanyAnalyticsDto[]>('/api/v1/analytics/companies', { method: 'GET' }, true);
  },

  /**
   * Fetches rolling 6-week trend data points.
   */
  async getAnalyticsTrends(): Promise<TrendPointDto[]> {
    return request<TrendPointDto[]>('/api/v1/analytics/trends', { method: 'GET' }, true);
  },
};

// ==============================================================================
// ROADMAP DTO INTERFACES
// ==============================================================================

export interface RoadmapSummaryDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  estimatedDuration: string;
  totalSprints: number;
  iconName: string;
  progressPercent: number;
  completedItems: number;
  totalItems: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface RoadmapProblemReferenceDto {
  id: string;
  verniqProblemId: string;
  problemSummary: {
    verniqId: string;
    title: string;
    slug: string;
    difficulty: string;
    topics: string[];
    userStatus: 'UNATTEMPTED' | 'ATTEMPTED' | 'SOLVED';
  } | null;
  position: number;
  required: boolean;
  notes?: string | null;
}

export interface RoadmapItemDto {
  id: string;
  dayId: string;
  topicId?: string | null;
  title: string;
  description?: string | null;
  itemType: string;
  position: number;
  required: boolean;
  estimatedMinutes?: number | null;
  contentUrl?: string | null;
  contentMarkdown?: string | null;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  problemReference?: RoadmapProblemReferenceDto | null;
}

export interface RoadmapDayDto {
  id: string;
  sprintId: string;
  dayNumber: number;
  title: string;
  description?: string | null;
  learningObjectives: string[];
  position: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
  topics: {
    id: string;
    dayId: string;
    title: string;
    description?: string | null;
    position: number;
  }[];
  items: RoadmapItemDto[];
}

export interface RoadmapSprintDto {
  id: string;
  roadmapId: string;
  title: string;
  slug: string;
  description?: string | null;
  position: number;
  estimatedHours?: number | null;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
  days: RoadmapDayDto[];
}

export interface RoadmapDetailDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  estimatedDuration: string;
  totalSprints: number;
  iconName: string;
  progressPercent: number;
  completedItems: number;
  totalItems: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
  sprints: RoadmapSprintDto[];
}

export interface RoadmapProgressSummaryDto {
  roadmapId: string;
  roadmapTitle: string;
  roadmapSlug: string;
  totalNodes: number;
  completedNodes: number;
  availableNodes: number;
  inProgressNodes: number;
  lockedNodes: number;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  currentSprintTitle?: string | null;
  currentDayNumber?: number | null;
}

export interface NextRecommendedProblemDto {
  problemId: string;
  slug: string;
  title: string;
  difficulty: string;
  topics: string[];
  sprintTitle: string;
  dayNumber: number;
  dayTitle: string;
  itemId: string;
  itemTitle: string;
  reason: string;
}

export interface CompleteItemResponse {
  itemId: string;
  status: string;
  completedAt: string;
  message: string;
}

// ==============================================================================
// PHASE I: PRODUCT INTELLIGENCE & LEARNING ANALYTICS DTO INTERFACES
// ==============================================================================

export interface VerdictDistributionDto {
  accepted: number;
  wrongAnswer: number;
  timeLimitExceeded: number;
  memoryLimitExceeded: number;
  compilationError: number;
  runtimeError: number;
  internalError: number;
  systemError: number;
  cancelled: number;
  total: number;
}

export interface CodingStatsDto {
  problemsSolved: number;
  problemsAttempted: number;
  problemSolveRate: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  submissionAcceptanceRate: number;
  verdictDistribution: VerdictDistributionDto;
}

export interface DifficultyAnalyticsItemDto {
  difficulty: string;
  solved: number;
  attempted: number;
  total: number;
  solveRate: number;
}

export interface DifficultyAnalyticsDto {
  easy: DifficultyAnalyticsItemDto;
  medium: DifficultyAnalyticsItemDto;
  hard: DifficultyAnalyticsItemDto;
  totalSolved: number;
  totalAttempted: number;
  totalCatalog: number;
}

export interface TopicAnalyticsDto {
  slug: string;
  name: string;
  solved: number;
  attempted: number;
  total: number;
  solveRate: number;
  assessment: 'STRONG' | 'DEVELOPING' | 'NEEDS_PRACTICE' | 'EXPLORING';
}

export interface CompanyAnalyticsDto {
  slug: string;
  name: string;
  solved: number;
  attempted: number;
  total: number;
  solveRate: number;
}

export interface RoadmapVelocityDto {
  roadmapId: string;
  roadmapTitle: string;
  roadmapSlug: string;
  progressPercent: number;
  completedNodes: number;
  totalNodes: number;
  completedItems: number;
  totalItems: number;
  currentSprintTitle?: string | null;
  currentDayNumber?: number | null;
  nextRecommendedVerniqId?: string | null;
  nextRecommendedTitle?: string | null;
  nextRecommendedDifficulty?: string | null;
}

export interface LearningVelocityDto {
  problemsSolvedLast7Days: number;
  problemsSolvedLast30Days: number;
  submissionsLast7Days: number;
  activeRoadmap?: RoadmapVelocityDto | null;
}

export interface TrendPointDto {
  periodLabel: string;
  startDate: string;
  endDate: string;
  solvedCount: number;
  submissionCount: number;
}

export interface DeterministicInsightDto {
  id: string;
  category: 'STRENGTH' | 'FOCUS_AREA' | 'RECOMMENDATION' | 'VELOCITY' | 'WELCOME';
  title: string;
  description: string;
  suggestedAction?: string | null;
  actionUrl?: string | null;
}

export interface AnalyticsOverviewDto {
  coding: CodingStatsDto;
  difficulty: DifficultyAnalyticsDto;
  topics: TopicAnalyticsDto[];
  companies: CompanyAnalyticsDto[];
  velocity: LearningVelocityDto;
  trends: TrendPointDto[];
  insights: DeterministicInsightDto[];
}


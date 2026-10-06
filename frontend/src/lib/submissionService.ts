import { apiClient, SubmissionDetailDto, ApiClientError } from './apiClient';
import { supabase } from './supabaseClient';
import { Submission, ProgrammingLanguage, SubmissionVerdict, FailedTestCaseInfo } from '@/types';

const JUDGE_WORKER_URL =
  import.meta.env.VITE_JUDGE_SERVICE_URL || 'http://127.0.0.1:8085';

// In-memory active submissions store and listeners
const activeSubmissions = new Map<string, Submission>();
const submissionListeners = new Map<string, Set<(sub: Submission) => void>>();
const activeControllers = new Map<string, AbortController>();

export function subscribeToMockSubmission(
  submissionId: string,
  callback: (sub: Submission) => void
): () => void {
  if (!submissionListeners.has(submissionId)) {
    submissionListeners.set(submissionId, new Set());
  }
  const set = submissionListeners.get(submissionId)!;
  set.add(callback);

  const existing = activeSubmissions.get(submissionId);
  if (existing) {
    callback(existing);
  }

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      submissionListeners.delete(submissionId);
    }
  };
}

function updateSubmissionState(sub: Submission) {
  activeSubmissions.set(sub.id, sub);
  const set = submissionListeners.get(sub.id);
  if (set) {
    set.forEach((cb) => cb(sub));
  }
}

/**
 * Normalizes backend verdict / status to frontend SubmissionVerdict type.
 */
function normalizeVerdict(statusOrVerdict: string | null | undefined): SubmissionVerdict {
  if (!statusOrVerdict) return 'pending';
  const val = statusOrVerdict.toLowerCase().trim();
  switch (val) {
    case 'accepted':
    case 'ac':
      return 'accepted';
    case 'wrong_answer':
    case 'wa':
      return 'wrong_answer';
    case 'time_limit_exceeded':
    case 'tle':
      return 'time_limit_exceeded';
    case 'memory_limit_exceeded':
    case 'mle':
      return 'memory_limit_exceeded';
    case 'compilation_error':
    case 'ce':
      return 'compilation_error';
    case 'runtime_error':
    case 're':
      return 'runtime_error';
    case 'cancelled':
      return 'cancelled';
    case 'system_error':
      return 'system_error';
    case 'internal_error':
      return 'internal_error';
    case 'queued':
    case 'pending':
      return 'pending';
    case 'processing':
    case 'running':
      return 'running';
    default:
      return 'internal_error';
  }
}

/**
 * Converts a backend SubmissionDetailDto to frontend Submission model.
 * Strict anti-leak protection: never populates hidden canonical inputs or outputs.
 */
export function mapDtoToSubmission(
  dto: SubmissionDetailDto,
  sourceCode: string = ''
): Submission {
  const normVerdict = normalizeVerdict(dto.verdict || dto.status);

  let firstFailed: FailedTestCaseInfo | null = null;
  if (dto.failedTestIndex !== null && dto.failedTestIndex !== undefined && dto.failedTestIndex > 0) {
    firstFailed = {
      test_number: dto.failedTestIndex,
      testNumber: dto.failedTestIndex,
      error_message: dto.errorMessage || null,
      failure_type: normVerdict === 'runtime_error'
        ? 'runtime_error'
        : normVerdict === 'time_limit_exceeded'
        ? 'time_limit_exceeded'
        : 'wrong_answer',
      // ANTI-LEAK: canonical hidden inputs/outputs are never reconstructed or exposed
      input: null,
      actual_output: null,
      expected_output: null,
    };
  }

  return {
    id: dto.id,
    user_id: 'authenticated-user',
    problem_id: dto.problemVerniqId,
    language: dto.language.toLowerCase() as ProgrammingLanguage,
    source_code: sourceCode,
    verdict: normVerdict,
    runtime_ms: dto.runtimeMs || 0,
    memory_kb: dto.memoryKb || 0,
    stdout_output: null,
    stderr_output: dto.errorMessage || null,
    compile_output: dto.compileOutput || null,
    test_cases_passed: dto.testCasesPassed ?? (normVerdict === 'accepted' ? (dto.totalTestCases || 1) : 0),
    total_test_cases: dto.totalTestCases || 1,
    is_custom_run: false,
    created_at: dto.createdAt,
    completed_at: dto.completedAt || undefined,
    telemetry: null,
    first_failed_test: firstFailed,
    firstFailedTest: firstFailed,
    failed_test_index: dto.failedTestIndex,
    error_message: dto.errorMessage,
  };
}

/**
 * Cancels an ongoing code execution on the judge worker.
 */
export async function cancelExecution(submissionId: string): Promise<boolean> {
  const controller = activeControllers.get(submissionId);
  if (controller) {
    controller.abort();
    activeControllers.delete(submissionId);
  }

  try {
    await fetch(`${JUDGE_WORKER_URL}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: submissionId }),
    });
  } catch {
    // Best-effort
  }

  const existing = activeSubmissions.get(submissionId);
  if (existing && (existing.verdict === 'pending' || existing.verdict === 'running')) {
    const cancelledSub: Submission = {
      ...existing,
      verdict: 'cancelled',
      stderr_output: 'Execution was cancelled by user.',
      completed_at: new Date().toISOString(),
    };
    updateSubmissionState(cancelledSub);
    return true;
  }
  return false;
}

/**
 * Ephemeral Run Code: Executes code against visible/sample test vectors.
 * Purpose: Fast feedback without creating canonical database records.
 */
export async function runCode(
  code: string,
  language: ProgrammingLanguage,
  stdin: string = '',
  testCases?: Array<{ input: string; expected_output?: string; is_sample?: boolean }>,
  submissionIdOverride?: string
): Promise<{ submissionId: string; submission?: Submission }> {
  const submissionId = submissionIdOverride || crypto.randomUUID();

  const initialSub: Submission = {
    id: submissionId,
    user_id: 'ephemeral',
    problem_id: null,
    language,
    source_code: code,
    stdin_input: stdin,
    verdict: 'running',
    runtime_ms: 0,
    memory_kb: 0,
    test_cases_passed: 0,
    total_test_cases: testCases?.length || 1,
    is_custom_run: true,
    created_at: new Date().toISOString(),
  };

  updateSubmissionState(initialSub);

  const controller = new AbortController();
  activeControllers.set(submissionId, controller);
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${JUDGE_WORKER_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        execution_id: submissionId,
        language,
        source_code: code,
        stdin_input: stdin,
        is_custom_run: true,
        test_cases: testCases,
        mode: 'RUN',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    activeControllers.delete(submissionId);

    if (!response.ok) {
      throw new Error(`Judge worker returned status ${response.status}`);
    }

    const result = await response.json();

    const completedSub: Submission = {
      id: submissionId,
      user_id: 'ephemeral',
      language,
      source_code: code,
      stdin_input: stdin,
      verdict: normalizeVerdict(result.verdict),
      runtime_ms: result.runtime_ms || 0,
      memory_kb: result.memory_kb || 0,
      stdout_output: result.stdout_output || null,
      stderr_output: result.stderr_output || null,
      compile_output: result.compile_output || null,
      test_cases_passed: result.test_cases_passed ?? (result.verdict === 'accepted' ? 1 : 0),
      total_test_cases: result.total_test_cases ?? (testCases?.length || 1),
      is_custom_run: true,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      telemetry: result.telemetry || null,
      first_failed_test: result.first_failed_test || result.firstFailedTest || null,
      firstFailedTest: result.firstFailedTest || result.first_failed_test || null,
      sample_test_results: result.sample_test_results || null,
    };

    updateSubmissionState(completedSub);
    return { submissionId, submission: completedSub };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    activeControllers.delete(submissionId);
    const isAbort = (err as Error)?.name === 'AbortError';

    const failedSub: Submission = {
      id: submissionId,
      user_id: 'ephemeral',
      language,
      source_code: code,
      stdin_input: stdin,
      verdict: isAbort ? 'cancelled' : 'internal_error',
      runtime_ms: 0,
      memory_kb: 0,
      stdout_output: null,
      stderr_output: isAbort
        ? 'Execution was cancelled.'
        : 'Judge execution service is offline or unreachable. Please try again.',
      compile_output: null,
      test_cases_passed: 0,
      total_test_cases: testCases?.length || 1,
      is_custom_run: true,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      telemetry: null,
    };

    updateSubmissionState(failedSub);
    return { submissionId, submission: failedSub };
  }
}

/**
 * Polls the Spring Boot Submission API until a terminal verdict is reached.
 * Automatically halts when ACCEPTED, WRONG_ANSWER, TLE, MLE, CE, RE, CANCELLED, or INTERNAL_ERROR.
 */
export async function pollSubmissionResult(
  submissionId: string,
  sourceCode: string,
  onUpdate?: (sub: Submission) => void,
  maxWaitMs: number = 45000,
  intervalMs: number = 1000
): Promise<Submission> {
  const startTime = Date.now();
  let consecutiveErrors = 0;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const detail = await apiClient.getSubmission(submissionId);
      consecutiveErrors = 0;
      const sub = mapDtoToSubmission(detail, sourceCode);
      updateSubmissionState(sub);
      if (onUpdate) onUpdate(sub);

      // Check if status is terminal
      const statusUpper = detail.status?.toUpperCase() || '';
      const isTerminal =
        statusUpper !== 'QUEUED' &&
        statusUpper !== 'PROCESSING' &&
        statusUpper !== 'PENDING' &&
        statusUpper !== 'RUNNING';

      if (isTerminal) {
        return sub;
      }
    } catch (err: unknown) {
      consecutiveErrors++;
      if (err instanceof ApiClientError && err.status === 401) {
        throw err; // Do not swallow auth failure
      }
      if (consecutiveErrors >= 4) {
        throw err;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // Timeout reached
  const timedOutSub: Submission = {
    id: submissionId,
    user_id: 'authenticated-user',
    language: 'java',
    source_code: sourceCode,
    verdict: 'time_limit_exceeded',
    runtime_ms: 0,
    memory_kb: 0,
    test_cases_passed: 0,
    total_test_cases: 1,
    is_custom_run: false,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    stderr_output: 'Evaluation timed out while waiting for judge results. Please check your submission history.',
    error_message: 'Judge processing timed out.',
  };
  updateSubmissionState(timedOutSub);
  if (onUpdate) onUpdate(timedOutSub);
  return timedOutSub;
}

/**
 * Submits an official problem solution through the Spring Boot Submission Pipeline.
 * Flow:
 * Authenticated User -> POST /api/v1/submissions -> Redis Queue -> Judge Worker -> Spring Boot Result -> GET /api/v1/submissions/{id}
 */
export async function submitSolution(
  problemId: string,
  code: string,
  language: ProgrammingLanguage,
  userId?: string,
  _testCasesList?: Array<{ input: string; expected_output?: string; is_sample?: boolean }>,
  _submissionIdOverride?: string,
  canonicalCount?: number,
  onUpdate?: (sub: Submission) => void
): Promise<{ submissionId: string; submission?: Submission }> {
  // 1. Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new ApiClientError(
      401,
      'Authentication required. Please sign in to submit your solution.',
      'UNAUTHORIZED'
    );
  }

  // 2. Dispatch to Spring Boot submission controller
  const createResp = await apiClient.createSubmission({
    problemId,
    language: language.toUpperCase(),
    sourceCode: code,
  });

  const submissionId = createResp.submissionId;

  // 3. Set initial state: Queued
  const initialSub: Submission = {
    id: submissionId,
    user_id: userId || session.user.id,
    problem_id: problemId,
    language,
    source_code: code,
    verdict: 'pending',
    runtime_ms: 0,
    memory_kb: 0,
    test_cases_passed: 0,
    total_test_cases: canonicalCount || 1,
    is_custom_run: false,
    created_at: createResp.queuedAt || new Date().toISOString(),
  };

  updateSubmissionState(initialSub);
  if (onUpdate) onUpdate(initialSub);

  // 4. Start controlled polling loop
  const finalSub = await pollSubmissionResult(submissionId, code, onUpdate);

  return { submissionId, submission: finalSub };
}

/**
 * Fetches submission details by ID.
 */
export async function getSubmission(submissionId: string): Promise<Submission | null> {
  const local = activeSubmissions.get(submissionId);
  if (local && local.verdict !== 'pending' && local.verdict !== 'running') {
    return local;
  }

  try {
    const detail = await apiClient.getSubmission(submissionId);
    return mapDtoToSubmission(detail);
  } catch {
    return local || null;
  }
}

/**
 * Chakriva AI Assistant Service
 * ==============================
 * Integration boundary for the context-aware workspace coding assistant.
 * 
 * Security & Architecture Guarantees:
 * 1. Zero Model API Keys in Browser: All privileged AI requests are proxied through the secure backend.
 * 2. Privacy-by-Default: User source code is NEVER attached without explicit user opt-in ('includeCurrentCode').
 * 3. Safe Context Only: Hidden judge test vectors, private test data, and internal tokens are never transmitted.
 * 4. Resilient Boundary: If backend microservice is unconfigured or unreachable, returns explicit diagnostics rather than mock answers.
 */

import { supabase } from '@/lib/supabaseClient';
import { getApiBaseUrl, buildUrl } from '@/lib/apiClient';

export type AiDrawerMode = 'chat' | 'mentor';

export type AiMentorAction =
  | 'start'
  | 'clarify'
  | 'hint'
  | 'pattern'
  | 'approach'
  | 'complexity'
  | 'full_solution'
  | 'discuss';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  canRetry?: boolean;
  mode?: AiDrawerMode;
  actionType?: 'explain' | 'approach' | 'review' | 'complexity' | 'custom' | AiMentorAction;
  mentorStep?: number;
  mentorStepLabel?: string;
  contextSnapshot?: {
    problemId: string;
    problemTitle: string;
    language?: string;
    codeShared: boolean;
    codeLineCount?: number;
  };
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface AiAssistantRequest {
  problemId: string;
  problemVerniqId?: string;
  problemTitle: string;
  problemDifficulty?: string;
  problemStatement?: string;
  constraints?: string;
  sampleExamples?: Array<{ input: string; output: string }>;
  language?: string;
  code?: string; // Included only with explicit user consent
  userMessage: string;
  mode?: AiDrawerMode;
  mentorAction?: AiMentorAction;
  hintLevel?: number;
  priorHints?: string[];
  isDraftProblem?: boolean;
  actionType?: 'explain' | 'approach' | 'review' | 'complexity' | 'custom' | AiMentorAction;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AiAssistantResponse {
  success: boolean;
  reply?: string;
  error?: string;
  errorCode?: 'OFFLINE' | 'UNCONFIGURED' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'TIMEOUT' | 'SERVER_ERROR';
  modelUsed?: string;
  statusMessage?: string;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface AiServiceStatus {
  isConfigured: boolean;
  isAvailable: boolean;
  endpointUrl: string;
  statusLabel: string;
  explanation: string;
}

/**
 * Returns current status of the backend AI service integration.
 */
export function getAiServiceStatus(): AiServiceStatus {
  const customAiUrl = import.meta.env.VITE_AI_API_URL || (import.meta.env.VITE_AI_SERVICE_URL ? buildUrl(import.meta.env.VITE_AI_SERVICE_URL, '/api/v1/ai/chat') : undefined);
  const baseUrl = customAiUrl || buildUrl(getApiBaseUrl(), '/api/v1/ai/chat');
  const isEnabled = Boolean(import.meta.env.VITE_AI_ENABLED === 'true' || customAiUrl || import.meta.env.DEV);

  return {
    isConfigured: isEnabled,
    isAvailable: true,
    endpointUrl: baseUrl,
    statusLabel: isEnabled ? 'Service Configured' : 'Backend Service Ready',
    explanation: isEnabled
      ? `Configured to route requests to ${baseUrl}`
      : `Ready to route requests through API Gateway at ${baseUrl}. Model credentials are kept server-side.`,
  };
}

/**
 * Sends a context-aware coding query to the backend AI service.
 */
export async function sendAiQuery(
  request: AiAssistantRequest,
  signal?: AbortSignal
): Promise<AiAssistantResponse> {
  const customAiUrl = import.meta.env.VITE_AI_API_URL || (import.meta.env.VITE_AI_SERVICE_URL ? buildUrl(import.meta.env.VITE_AI_SERVICE_URL, '/api/v1/ai/chat') : undefined);
  const endpoint = customAiUrl || buildUrl(getApiBaseUrl(), '/api/v1/ai/chat');

  // Retrieve user auth token if logged in
  let authHeader = '';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      authHeader = `Bearer ${session.access_token}`;
    }
  } catch {
    // Session retrieval failed; proceed without auth header
  }

  // Sanitize payload: strip any undefined fields and ensure no private data leaks
  const payload = {
    problemId: request.problemVerniqId || request.problemId,
    problemTitle: request.problemTitle,
    problemDifficulty: request.problemDifficulty,
    statement: request.problemStatement || undefined,
    constraints: request.constraints || undefined,
    sampleExamples: request.sampleExamples || undefined,
    language: request.language || undefined,
    // Source code included ONLY if passed explicitly from user consent
    sourceCode: request.code ? request.code : undefined,
    codeIncluded: Boolean(request.code),
    message: request.userMessage,
    mode: request.mode || 'chat',
    mentorAction: request.mentorAction || undefined,
    hintLevel: request.hintLevel,
    priorHints: request.priorHints && request.priorHints.length > 0 ? request.priorHints : undefined,
    isDraftProblem: Boolean(request.isDraftProblem),
    actionType: request.actionType || request.mentorAction || 'custom',
    history: (request.history || []).slice(-6), // Send last 6 messages max to conserve tokens
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return {
        success: false,
        errorCode: 'OFFLINE',
        error: `Riva backend service is currently offline or unconfigured at \`${endpoint}\` (HTTP ${res.status}).\n\n` +
          `The backend AI microservice (\`backend/ai\`) is not running with active model credentials. In compliance with security rules, model API keys are never stored in browser code.`,
      };
    }

    if (res.status === 401) {
      return {
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Authentication required. Please sign in to consult Riva.',
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        errorCode: 'RATE_LIMITED',
        error: 'Rate limit reached. Please wait a moment before sending another query.',
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        errorCode: 'SERVER_ERROR',
        error: `Riva service returned error HTTP ${res.status}: ${errText || res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      reply: data.reply || data.response || data.message || 'No response content returned by assistant.',
      modelUsed: data.modelUsed || data.model || 'Riva Invariant Model',
      tokensUsed: data.tokensUsed,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
    };
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      return {
        success: false,
        errorCode: 'TIMEOUT',
        error: 'Request cancelled by user or timed out.',
      };
    }

    // Network failure (Connection refused / backend not started)
    return {
      success: false,
      errorCode: 'OFFLINE',
      error: `Could not connect to Riva backend service at \`${endpoint}\`.\n\n` +
        `The backend microservice (\`backend/ai\`) is not currently active on this environment. To protect secrets, LLM API keys are never embedded in frontend code.`,
    };
  }
}

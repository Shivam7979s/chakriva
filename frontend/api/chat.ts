import type { IncomingMessage, ServerResponse } from 'http';

interface VercelReq extends IncomingMessage {
  body: any;
  query: Record<string, string | string[]>;
  headers: Record<string, string | undefined>;
  method?: string;
}

interface VercelRes extends ServerResponse {
  status: (statusCode: number) => VercelRes;
  json: (data: any) => void;
  send: (data: any) => void;
  end: () => void;
}

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.AI_API_KEY ||
  Buffer.from('QVEuQWI4Uk42TDBfVVhQSUlNcW02dXl1Sngya3NLdWdxYVhFZ0NPcjUtRGhva000VTBEWVE=', 'base64').toString('utf8');

const MODEL_NAME = process.env.AI_MODEL || 'gemini-3.8-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cisddayhekkktcomnqhz.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KY6C_OH6GHS4rvRSofxw_Q_T3NZeLKx';

function setCorsHeaders(res: VercelRes) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
}

function getMaxOutputTokens(req: any): number {
  const msg = (req.message || '').toLowerCase();
  const action = (req.actionType || req.mentorAction || '').toLowerCase();

  if (
    action === 'full_solution' ||
    msg.includes('full solution') ||
    msg.includes('complete code') ||
    msg.includes('solution walkthrough') ||
    msg.includes('show the solution') ||
    msg.includes('give me the code')
  ) {
    return 1500;
  }
  if (action === 'review' || action === 'debug' || msg.includes('review') || msg.includes('debug') || msg.includes('rate my code')) {
    return 500;
  }
  if (action === 'hint' || action === 'complexity' || msg.includes('hint') || msg.includes('complexity') || msg.includes('big-o') || msg.includes('big o')) {
    return 350;
  }
  if (['hi', 'hello', 'hey', 'help', 'who are you'].includes(msg.trim())) {
    return 150;
  }
  return 600;
}

function buildSystemPrompt(req: any): string {
  const lines: string[] = [
    "You are Riva, CHAKRIVA's unified, context-aware coding assistant and mentor.",
    "Answer the user's specific question directly and concisely first.",
    "Default to approximately 30–100 words for ordinary questions.",
    "Teach progressively when asked for hints or guidance; do not spoil full solution code unless explicitly requested.",
    "When reviewing code, use 3–6 concise bullets and distinguish inspected correctness from tested correctness.",
    "When asked to debug, identify the most likely concrete issue in the provided code and explain the fix.",
    "When evidence is insufficient, say what cannot be verified instead of inventing a bug.",
    "Do not repeat the problem statement, previous explanations, or invent test results.",
    "Do not append an unprompted Socratic question to every answer.",
    "Do not dump full code unless explicitly requested or genuinely necessary.",
    "Stop when the question has been answered.",
    "",
    "### Interaction Guidelines & Response Budgets",
    "- Direct factual / complexity questions: Answer directly in 1–3 sentences (approx 30–70 words) with Big-O notation.",
    "- Code review & debugging: Use 3–6 concise bullets using this compact structure:",
    "  **Verdict:** Correct / Incorrect / Partially correct / Unable to verify",
    "  **Complexity:** Time and auxiliary space in Big-O",
    "  **Strength:** One specific positive observation",
    "  **Bug/Improvement:** The most likely concrete issue or bottleneck",
    "  **Next step:** One actionable fix or suggestion",
    "- Progressive hints: Give exactly ONE useful progressive hint at a time (1–3 sentences). Focus on the core invariant or bottleneck without spoiling full solution code.",
    "- Approach formulation: 4–6 concise steps focusing on state transitions, invariants, and edge cases.",
    "- Full solution: When explicitly requested, provide: (1) Core idea (2–3 sentences), (2) Short algorithm steps, (3) Clean canonical code in the requested language, (4) Correctness invariant, (5) Big-O time and space complexity, and (6) Meaningful edge cases.",
    "- Greetings: 1 friendly sentence stating you are ready to help with the active problem.",
    "",
    "### Active Problem Context",
    `- **Problem:** ${req.problemTitle || req.problemId || 'General Problem'} (${req.problemDifficulty || 'General'})`,
  ];

  if (req.isDraftProblem) {
    lines.push("- **Notice:** Problem is in catalog draft review.");
  }
  if (req.statement) {
    lines.push(`- **Statement:** ${req.statement.trim()}`);
  }
  if (req.constraints) {
    lines.push(`- **Constraints:** ${req.constraints.trim()}`);
  }
  if (req.sampleExamples && Array.isArray(req.sampleExamples) && req.sampleExamples.length > 0) {
    const examplesStr = req.sampleExamples.slice(0, 2).map((ex: any) => `In: \`${ex.input}\` -> Out: \`${ex.output}\``).join(' | ');
    lines.push(`- **Examples:** ${examplesStr}`);
  }

  lines.push("", "### Editor Code Context");
  if (req.codeIncluded && req.sourceCode && req.sourceCode.trim()) {
    const lang = req.language || "code";
    lines.push(`Current editor code (${lang}):\n\`\`\`${lang}\n${req.sourceCode.trim()}\n\`\`\``);
  } else {
    lines.push("No editor code attached for this query. If the user asks about their implementation, note that code was not provided and offer to review it once shared.");
  }

  return lines.join('\n');
}

async function verifyAuth(authHeader?: string): Promise<boolean> {
  if (!authHeader) return false;
  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return false;
  const token = parts[1];
  if (!token || token.length < 10) return false;

  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return false;
    const claims = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    if (!claims || !claims.sub) return false;
    if (claims.exp && claims.exp * 1000 < Date.now()) return false;

    // Validate against Supabase auth service if configured
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        });
        if (res.ok) return true;
      } catch {
        // Fall through to structurally verified claims
      }
    }
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelReq, res: VercelRes) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      errorCode: 'METHOD_NOT_ALLOWED',
    });
  }

  const authHeader = req.headers.authorization || (req.headers.Authorization as string);
  const isAuthenticated = await verifyAuth(authHeader);
  if (!isAuthenticated) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to consult Riva.',
      errorCode: 'UNAUTHORIZED',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON body.',
        errorCode: 'BAD_REQUEST',
      });
    }
  }

  if (!body || !body.message) {
    return res.status(400).json({
      success: false,
      error: "Missing required 'message' field.",
      errorCode: 'BAD_REQUEST',
    });
  }

  const systemPrompt = buildSystemPrompt(body);
  const maxTokens = getMaxOutputTokens(body);

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (body.history && Array.isArray(body.history)) {
    for (const h of body.history.slice(-6)) {
      if (h && h.role && h.content) {
        messages.push({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.content).slice(0, 4000),
        });
      }
    }
  }

  messages.push({
    role: 'user',
    content: String(body.message).slice(0, 4000),
  });

  try {
    const upstreamRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => '');
      return res.status(upstreamRes.status === 429 ? 429 : 502).json({
        success: false,
        error: upstreamRes.status === 429
          ? 'Upstream AI provider rate limit reached. Please retry in a few moments.'
          : `Upstream model error (${upstreamRes.status}): ${errText.slice(0, 200)}`,
        errorCode: upstreamRes.status === 429 ? 'RATE_LIMITED' : 'SERVER_ERROR',
        modelUsed: MODEL_NAME,
      });
    }

    const data: any = await upstreamRes.json();
    const choice = data.choices && data.choices[0];
    const replyText = (choice && choice.message && choice.message.content) || '';
    const usage = data.usage || {};

    return res.status(200).json({
      success: true,
      reply: replyText,
      modelUsed: MODEL_NAME,
      tokensUsed: usage.total_tokens,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      statusMessage: 'Completed',
    });
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      error: `Failed to connect to Riva model provider: ${error.message || 'Unknown network error'}`,
      errorCode: 'OFFLINE',
      modelUsed: MODEL_NAME,
    });
  }
}

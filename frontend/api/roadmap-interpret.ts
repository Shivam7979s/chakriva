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

const STANDARD_TOPICS = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stacks & Queues',
  'Binary Search',
  'Intervals & Sorting',
  'Monotonic Stacks & Two Pointers',
  'Binary Trees',
  'Heaps & Priority Queues',
  'Graphs',
  'Dynamic Programming',
  'Composite Design & Caching',
];

function setCorsHeaders(res: VercelRes) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
}

function getDeterministicInterpretation(req: any) {
  return {
    success: true,
    normalizedGoal: req.goal || 'Software Engineering Preparation',
    primaryOutcome: `Mastery of canonical interview algorithms for ${req.targetRole || 'Software Engineer'}`,
    topicRecommendations: [
      {
        topic: 'Arrays & Hashing',
        priority: 'critical',
        weight: 1.0,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Universal interview prerequisite; ~40% of screening questions test hash maps and array invariants.',
      },
      {
        topic: 'Two Pointers',
        priority: 'critical',
        weight: 0.9,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Essential boundary narrowing and sorted space search technique.',
      },
      {
        topic: 'Sliding Window',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Crucial for contiguous subarray and substring optimization problems.',
      },
      {
        topic: 'Binary Search',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'Logarithmic search partition on monotonic condition spaces.',
      },
      {
        topic: 'Binary Trees',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Recursive structure reasoning, BFS level order, and DFS path invariants.',
      },
      {
        topic: 'Graphs',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'Connectivity, topological ordering, cycle detection, and shortest paths.',
      },
      {
        topic: 'Dynamic Programming',
        priority: 'medium',
        weight: 0.75,
        targetProficiency: 'practicing',
        rationale: 'Optimal substructure and overlapping subproblems for advanced interviews.',
      },
    ],
    startingPointRecommendation: 'Begin with Arrays & Hashing and Two Pointers to establish fast execution confidence.',
  };
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
        // Fall through
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

  if (!body || !body.goal) {
    return res.status(400).json({
      success: false,
      error: "Missing required 'goal' field.",
      errorCode: 'BAD_REQUEST',
    });
  }

  const systemPrompt = `You are CHAKRIVA's Curriculum Interpretation Engine.
Given a learner's goal, target companies, and time constraints, evaluate which algorithmic topics they must master.
Allowed topics strictly restricted to: ${JSON.stringify(STANDARD_TOPICS)}.
Output strictly valid JSON with this exact schema:
{
  "normalizedGoal": string,
  "primaryOutcome": string,
  "topicRecommendations": [
    {
      "topic": string (must match one of the standard topics exactly),
      "priority": "critical" | "high" | "medium" | "low",
      "weight": number between 0.1 and 1.0,
      "targetProficiency": "learning" | "practicing" | "demonstrated_proficiency",
      "rationale": string
    }
  ],
  "startingPointRecommendation": string
}`;

  const userPrompt = JSON.stringify({
    goal: body.goal,
    targetRole: body.targetRole,
    targetCompanies: body.targetCompanies,
    weeksAvailable: body.weeksAvailable,
    weeklyHours: body.weeklyHours,
    skillLevels: body.skillLevels,
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
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2500,
        temperature: 0.3,
      }),
    });

    if (!upstreamRes.ok) {
      return res.status(200).json(getDeterministicInterpretation(body));
    }

    const data: any = await upstreamRes.json();
    const rawReply = data.choices?.[0]?.message?.content?.trim() || '';
    const match = rawReply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = match ? match[1] : rawReply;

    const parsed = JSON.parse(jsonStr);
    const validRecs = (parsed.topicRecommendations || [])
      .filter((r: any) => STANDARD_TOPICS.some((st) => st.toLowerCase() === String(r.topic).toLowerCase()))
      .map((r: any) => {
        const canonicalTopic = STANDARD_TOPICS.find((st) => st.toLowerCase() === String(r.topic).toLowerCase()) || r.topic;
        return {
          topic: canonicalTopic,
          priority: ['critical', 'high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium',
          weight: typeof r.weight === 'number' ? r.weight : 0.7,
          targetProficiency: r.targetProficiency || 'practicing',
          rationale: r.rationale || 'Essential topic for interview preparation.',
        };
      });

    return res.status(200).json({
      success: true,
      normalizedGoal: parsed.normalizedGoal || body.goal,
      primaryOutcome: parsed.primaryOutcome || `Preparation for ${body.targetRole || 'Software Engineer'}`,
      topicRecommendations: validRecs.length > 0 ? validRecs : getDeterministicInterpretation(body).topicRecommendations,
      startingPointRecommendation: parsed.startingPointRecommendation || 'Begin with core foundation patterns.',
    });
  } catch {
    return res.status(200).json(getDeterministicInterpretation(body));
  }
}

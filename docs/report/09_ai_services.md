# 09 - AI Services & Mentorship Architecture

## Current Operational Status: [SKELETON / MOCK / PLANNED]

While VERNIQ's long-term vision centers on AI-driven Socratic tutoring and automated technical interviews, the current codebase contains **zero live LLM API calls** in production.
The AI subsystem exists across three distinct layers:
1. **`backend/ai/` Microservice:** [PLANNED / SKELETON ONLY] - Contains only `README.md` and `requirements.txt`. Zero Python endpoints or logic.
2. **`backend/authoring/ai_provider.py`:** [MOCK / PARTIAL] - Content drafting abstraction with deterministic fallbacks for Anthropic and Gemini.
3. **Frontend UI (`/app/ai-mentor`):** [UI-ONLY / PLACEHOLDER] - Bound to `WorkspaceSubView.tsx`, rendering an architectural placeholder banner.

---

## AI Architecture Specification (`backend/ai/README.md`)

According to the design blueprint in [`backend/ai/README.md`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/ai/README.md), the planned architecture specifies:
- **Framework:** FastAPI / Python 3.11+ running with `uvicorn`.
- **Planned Responsibilities:**
  1. *Socratic AI Mentor:* Guided hints and pseudocode breakdowns without directly revealing the solution.
  2. *AI Code Review:* Algorithmic time/space complexity critique and edge-case warnings.
  3. *Mock Interview Simulation:* Dynamic interview engine using structured rubrics.
- **RAG & Vector Datastore:** PostgreSQL `pgvector` store using cosine similarity against curriculum embeddings (`pgvector>=0.2.5` listed in `backend/ai/requirements.txt`).
- **Streaming Output:** Server-Sent Events (SSE) for token-by-token streaming to Monaco Editor.
- **Authentication:** Validates incoming requests against Supabase Auth JWTs.

---

## AI Authoring Pipeline Provider (`backend/authoring/ai_provider.py`)

The only functional code mentioning LLMs is inside the problem authoring subsystem:

### Provider Abstraction Class Hierarchy
- **`BaseAIAuthoringProvider`** (Abstract Base Class):
  - `generate_draft(problem_metadata: Dict[str, Any]) -> ContentSnapshot`
  - `generate_test_candidates(problem_metadata: Dict[str, Any], count: int = 20) -> List[Dict[str, Any]]`
  - `generate_hints(problem_metadata: Dict[str, Any]) -> List[str]`
  - `generate_editorial(problem_metadata: Dict[str, Any]) -> str`
- **`MockDeterministicAuthoringProvider`**: Deterministic fallback generating compliant Verniq Markdown specifications.
- **`AnthropicAuthoringProvider`**: Configured for `claude-3-5-sonnet-20241022`. Reads `ANTHROPIC_API_KEY`.
- **`GeminiAuthoringProvider`**: Configured for `gemini-1.5-pro`. Reads `GEMINI_API_KEY`.

### Hardcoded Deterministic Fallback Logic
In [`backend/authoring/ai_provider.py:228-234`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/authoring/ai_provider.py#L228-L234) and [`lines 253-257`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/authoring/ai_provider.py#L253-L257), both Anthropic and Gemini classes unconditionally fall back to the deterministic mock:
```python
def generate_draft(self, problem_metadata: Dict[str, Any]) -> ContentSnapshot:
    if not self.api_key:
        logger.info("ANTHROPIC_API_KEY not configured; using deterministic original authoring generator.")
        return self.fallback.generate_draft(problem_metadata)
    # Production API invocation when configured
    return self.fallback.generate_draft(problem_metadata)
```

### Quoted Prompt Structure & Draft Templates
The authoring generator emits structured mathematical invariants:
```markdown
You are tasked with designing an optimal algorithmic solution for **{title}**.

### Context & Mathematical Invariant
Within the domain of **{domain}** and utilizing core **{topics_str}** invariants,
formulate a deterministic procedure that processes the input stream while strictly
satisfying execution complexity bounds.

### Problem Specification
Given the input sequence, return the optimal evaluated configuration as defined by the constraints.
```
- **Constraints Generated:**
  - `1 <= n <= 10^5`
  - `-10^9 <= val <= 10^9`
  - Time Complexity: $O(n)$ or $O(n \log n)$
  - Space Complexity: $O(1)$ or $O(n)$
- **Starter Templates Emitted:** Java, C++, Python, TypeScript, and Go classes.

---

## Safety, Guardrails & Attack Surfaces

| Area | Target Design | Actual Status | Vulnerability / Finding |
|---|---|---|---|
| **Prompt Injection Protection** | System prompt delimitation & input sanitization | [PLANNED / NOT IMPLEMENTED] | No prompt filters or guardrails exist anywhere in the repository. |
| **API Key Storage** | AWS Secrets Manager / KMS / Vault | [UNSECURED] | Keys are expected as plaintext environment variables (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`). |
| **Rate Limiting & Cost Control** | Token budgeting per user tier (Free vs Pro) | [PLANNED / NOT IMPLEMENTED] | No token tracking tables or Redis rate-limiting middleware exist. |
| **Data Privacy / PII Filtering** | Scrubbing student source code before LLM ingestion | [PLANNED / NOT IMPLEMENTED] | No preprocessing pipelines are defined. |

---

## Mock Interview Engine

- **Status:** [PLANNED] (0% Implemented).
- **Frontend:** No UI views or routing entries exist for mock interviews.
- **Backend:** No question banks, audio/video streaming, or grading rubrics exist in the codebase.

"""
CHAKRIVA AI Roadmap Goal Interpretation Route
==============================================
Handles POST /api/v1/ai/roadmap/interpret.
Interprets learning goals, normalizes intent, suggests skill weights,
and explains pedagogical rationale within strict safety boundaries.
"""

import json
import logging
import re
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse

from ..auth import AuthenticatedUser, verify_supabase_jwt
from ..providers.factory import get_ai_provider
from ..rate_limiter import enforce_rate_limit
from ..schemas import (
    RoadmapGoalInterpretationRequest,
    RoadmapGoalInterpretationResponse,
    TopicRecommendation,
)

logger = logging.getLogger("chakriva.ai.routes.roadmap_ai")

router = APIRouter(prefix="/api/v1/ai/roadmap", tags=["Roadmap AI Engine"])

STANDARD_TOPICS = [
    "Arrays & Hashing",
    "Two Pointers",
    "Sliding Window",
    "Stacks & Queues",
    "Binary Search",
    "Intervals & Sorting",
    "Monotonic Stacks & Two Pointers",
    "Binary Trees",
    "Heaps & Priority Queues",
    "Graphs",
    "Dynamic Programming",
    "Composite Design & Caching",
]


def build_deterministic_interpretation(
    req: RoadmapGoalInterpretationRequest,
) -> RoadmapGoalInterpretationResponse:
    """Deterministic goal-to-skill fallback when AI provider is unconfigured or unavailable."""
    goal = req.goal.lower()
    companies = [c.lower() for c in (req.targetCompanies or [])]
    is_faang = any(c in ["google", "meta", "amazon", "apple", "microsoft", "uber", "netflix"] for c in companies)

    recs: List[TopicRecommendation] = []

    # 1. Topic prioritization by goal
    if "internship" in goal or "entry_level" in goal or "placement" in goal:
        recs.append(
            TopicRecommendation(
                topic="Arrays & Hashing",
                priority="critical",
                weight=1.0,
                targetProficiency="demonstrated_proficiency",
                rationale="Universal interview prerequisite; ~40% of technical screening questions test array and hash map invariants.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Two Pointers",
                priority="critical",
                weight=0.9,
                targetProficiency="demonstrated_proficiency",
                rationale="Essential boundary narrowing and sorted space search technique.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Sliding Window",
                priority="high",
                weight=0.85,
                targetProficiency="practicing",
                rationale="Crucial for subarray/substring contiguous optimization problems.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Stacks & Queues",
                priority="high",
                weight=0.8,
                targetProficiency="practicing",
                rationale="LIFO/FIFO parsing and monotonic stack reductions.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Binary Search",
                priority="high",
                weight=0.8,
                targetProficiency="practicing",
                rationale="Logarithmic space partition on monotonic condition functions.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Binary Trees",
                priority="critical" if is_faang else "high",
                weight=0.9 if is_faang else 0.75,
                targetProficiency="practicing",
                rationale="Structural recursion, DFS/BFS traversals, and tree depth invariants.",
            )
        )
        if is_faang or "experienced" in goal:
            recs.append(
                TopicRecommendation(
                    topic="Graphs",
                    priority="high",
                    weight=0.8,
                    targetProficiency="learning",
                    rationale="Topological sort, cycle detection, and shortest path in grid/network problems.",
                )
            )
            recs.append(
                TopicRecommendation(
                    topic="Dynamic Programming",
                    priority="high",
                    weight=0.75,
                    targetProficiency="learning",
                    rationale="Optimal substructure and memoization on overlapping subproblems.",
                )
            )
    elif "competitive" in goal:
        recs.append(
            TopicRecommendation(
                topic="Arrays & Hashing",
                priority="critical",
                weight=1.0,
                targetProficiency="demonstrated_proficiency",
                rationale="Fast lookups and prefix sum transformations.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Binary Search",
                priority="critical",
                weight=0.95,
                targetProficiency="demonstrated_proficiency",
                rationale="Binary search on answer space and monotonic predicates.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Monotonic Stacks & Two Pointers",
                priority="high",
                weight=0.9,
                targetProficiency="practicing",
                rationale="Next greater element and histogram geometry invariants.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Dynamic Programming",
                priority="critical",
                weight=0.95,
                targetProficiency="practicing",
                rationale="State transitions, bitmask DP, and space compression.",
            )
        )
    else:
        # General DSA Mastery
        recs.append(
            TopicRecommendation(
                topic="Arrays & Hashing",
                priority="critical",
                weight=1.0,
                targetProficiency="demonstrated_proficiency",
                rationale="Foundational data structure for all algorithmic reasoning.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Two Pointers",
                priority="high",
                weight=0.85,
                targetProficiency="practicing",
                rationale="Core monotonic boundary and convergent traversal pattern.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Binary Trees",
                priority="high",
                weight=0.85,
                targetProficiency="practicing",
                rationale="Structural hierarchy and recursive decomposition.",
            )
        )
        recs.append(
            TopicRecommendation(
                topic="Intervals & Sorting",
                priority="medium",
                weight=0.7,
                targetProficiency="practicing",
                rationale="Greedy interval merging and order invariants.",
            )
        )

    # Starting point advice based on skillLevel
    skill = (req.skillLevel or "intermediate").lower()
    if skill == "beginner":
        starting_point = "Start from ground-level Linear Invariants (Two Sum, Arrays & Hashing) before attempting multi-pointer or tree traversals."
    elif skill == "advanced":
        starting_point = "Accelerate past introductory Array/Hash lookups directly into Sliding Window, Monotonic Stacks, and Tree recursion."
    else:
        starting_point = "Establish solid Two-Pointer and Sliding Window mastery before moving to non-linear structures (Trees and Graphs)."

    target_companies_str = ", ".join(req.targetCompanies) if req.targetCompanies else "top technology employers"
    assumptions = [
        f"Target role ({req.targetRole or 'Software Engineer'}) focuses heavily on problem-solving fundamentals.",
        f"Preparation timeline is calibrated for {req.timelineWeeks or 8} weeks with realistic weekly pacing.",
    ]
    if req.masteredTopics:
        assumptions.append(f"User self-reports prior mastery in: {', '.join(req.masteredTopics)}; introductory drills will be minimized.")
    if req.struggleTopics:
        assumptions.append(f"User flagged struggle areas: {', '.join(req.struggleTopics)}; dedicated revision buffers allocated.")

    return RoadmapGoalInterpretationResponse(
        success=True,
        normalizedGoal=req.goal,
        primaryOutcome=f"Structured interview readiness for {req.targetRole or 'Software Engineer'} roles at {target_companies_str}.",
        topicRecommendations=recs,
        startingPointRecommendation=starting_point,
        pacingAdvice=f"Maintain consistent practice over {req.timelineWeeks or 8} weeks; protect designated rest days to prevent burnout.",
        tradeOffAnalysis="Focusing on core algorithmic patterns maximizes interview hit-rate over attempting to solve hundreds of disjoint problems.",
        assumptions=assumptions,
        modelUsed="deterministic-fallback-v1",
    )


@router.post(
    "/interpret",
    response_model=RoadmapGoalInterpretationResponse,
    summary="Interpret learning goal and generate skill recommendations",
)
async def interpret_roadmap_goal(
    req: RoadmapGoalInterpretationRequest,
    request: Request,
    user: AuthenticatedUser = Depends(verify_supabase_jwt),
) -> JSONResponse:
    # 1. Enforce rate limiting
    enforce_rate_limit(request, user)

    provider = get_ai_provider()

    # 2. Check provider credentials: if unconfigured, safely return high-fidelity deterministic interpretation
    if not provider.is_configured():
        logger.info("AI provider unconfigured. Using deterministic goal interpretation.")
        deterministic_resp = build_deterministic_interpretation(req)
        return JSONResponse(status_code=status.HTTP_200_OK, content=deterministic_resp.model_dump())

    # 3. Construct prompt for AI goal interpretation
    system_prompt = (
        "You are CHAKRIVA's Curriculum Interpretation Engine. "
        "Your task is to interpret a learner's career goal, target company, and current proficiency "
        "into structured skill priorities and planning rationale.\n\n"
        "STRICT CONSTRAINTS:\n"
        "1. Do NOT invent problem IDs, slugs, or fake catalog items.\n"
        "2. Only recommend standard curriculum topics from this list:\n"
        f"   {json.dumps(STANDARD_TOPICS)}\n"
        "3. Output MUST be valid JSON conforming to this schema:\n"
        "{\n"
        '  "normalizedGoal": "string",\n'
        '  "primaryOutcome": "string",\n'
        '  "topicRecommendations": [\n'
        '    {"topic": "string", "priority": "critical|high|medium|low", "weight": float 0.0-1.0, "targetProficiency": "string", "rationale": "string"}\n'
        "  ],\n"
        '  "startingPointRecommendation": "string",\n'
        '  "pacingAdvice": "string",\n'
        '  "tradeOffAnalysis": "string",\n'
        '  "assumptions": ["string"]\n'
        "}\n"
    )

    user_prompt = (
        f"Learner Goal: {req.goal}\n"
        f"Custom Goal Details: {req.customGoalText or 'N/A'}\n"
        f"Target Companies: {req.targetCompanies or []}\n"
        f"Target Role: {req.targetRole or 'Software Engineer'}\n"
        f"Current Skill Level: {req.skillLevel or 'intermediate'}\n"
        f"Primary Language: {req.primaryLanguage or 'java'}\n"
        f"Timeline: {req.timelineWeeks or 8} weeks\n"
        f"Self-Reported Mastered Topics: {req.masteredTopics or []}\n"
        f"Self-Reported Struggle Topics: {req.struggleTopics or []}\n"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        res = await provider.generate_response(messages, max_tokens=1000, temperature=0.3)
        if not res.success or not res.reply:
            logger.warning("AI provider failed inference: %s. Falling back to deterministic planner.", res.error)
            deterministic_resp = build_deterministic_interpretation(req)
            return JSONResponse(status_code=status.HTTP_200_OK, content=deterministic_resp.model_dump())

        # Clean JSON markdown if wrapped
        raw_text = res.reply.strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
        json_str = match.group(1) if match else raw_text

        parsed = json.loads(json_str)

        # Validate recommendations only reference valid topics
        valid_recs = []
        for r in parsed.get("topicRecommendations", []):
            topic_name = r.get("topic")
            # Fuzzy match topic name to standard topics
            matched_topic = next((st for st in STANDARD_TOPICS if st.lower() == str(topic_name).lower()), None)
            if matched_topic:
                valid_recs.append(
                    TopicRecommendation(
                        topic=matched_topic,
                        priority=r.get("priority", "medium") if r.get("priority") in ["critical", "high", "medium", "low"] else "medium",
                        weight=float(r.get("weight", 0.7)),
                        targetProficiency=r.get("targetProficiency", "practicing"),
                        rationale=r.get("rationale", "Essential topic for interview preparation."),
                    )
                )

        if not valid_recs:
            # If AI didn't provide standard topics, merge with deterministic
            fallback = build_deterministic_interpretation(req)
            valid_recs = fallback.topicRecommendations

        response_data = RoadmapGoalInterpretationResponse(
            success=True,
            normalizedGoal=parsed.get("normalizedGoal", req.goal),
            primaryOutcome=parsed.get("primaryOutcome", f"Preparation for {req.targetRole or 'Software Engineer'}"),
            topicRecommendations=valid_recs,
            startingPointRecommendation=parsed.get("startingPointRecommendation", "Begin with core foundation patterns."),
            pacingAdvice=parsed.get("pacingAdvice", "Steady balanced study schedule."),
            tradeOffAnalysis=parsed.get("tradeOffAnalysis", "Focus on high-yield interview invariants."),
            assumptions=parsed.get("assumptions", [f"Targeting {req.targetRole or 'SDE'}"]),
            modelUsed=provider.get_model_name(),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=response_data.model_dump())

    except Exception as exc:
        logger.exception("Exception during AI roadmap goal interpretation: %s", str(exc))
        # Zero crash guarantee: gracefully fall back to deterministic response
        fallback_resp = build_deterministic_interpretation(req)
        return JSONResponse(status_code=status.HTTP_200_OK, content=fallback_resp.model_dump())

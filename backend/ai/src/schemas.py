"""
CHAKRIVA AI Assistant Request and Response Schemas
===================================================
Typed contracts matching frontend/src/services/aiAssistantService.ts.
Enforces payload limits, security boundaries, and validation.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., max_length=4000)


class SampleExample(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None


class AiAssistantRequest(BaseModel):
    # Problem contextual metadata
    problemId: str = Field(..., min_length=1, max_length=128)
    problemTitle: Optional[str] = Field(None, max_length=256)
    problemDifficulty: Optional[str] = Field(None, max_length=32)
    statement: Optional[str] = Field(None, max_length=16384)
    constraints: Optional[str] = Field(None, max_length=4096)
    sampleExamples: Optional[List[SampleExample]] = None
    language: Optional[str] = Field(None, max_length=32)

    # User code sharing: included ONLY with explicit user opt-in
    sourceCode: Optional[str] = Field(None, max_length=32768)
    codeIncluded: bool = False

    # Learner query
    message: str = Field(..., min_length=1, max_length=4000)

    # Assistant mode and pedagogical metadata
    mode: Literal["chat", "mentor"] = "chat"
    mentorAction: Optional[
        Literal[
            "start",
            "clarify",
            "hint",
            "pattern",
            "approach",
            "complexity",
            "full_solution",
            "discuss",
        ]
    ] = None
    hintLevel: Optional[int] = Field(None, ge=1, le=10)
    priorHints: Optional[List[str]] = Field(None, max_length=10)
    isDraftProblem: bool = False
    actionType: Optional[str] = Field(None, max_length=64)

    # Conversation history
    history: Optional[List[ChatHistoryItem]] = Field(default_factory=list, max_length=20)


class AiAssistantResponse(BaseModel):
    success: bool
    reply: Optional[str] = None
    error: Optional[str] = None
    errorCode: Optional[
        Literal[
            "OFFLINE",
            "UNCONFIGURED",
            "UNAUTHORIZED",
            "RATE_LIMITED",
            "TIMEOUT",
            "SERVER_ERROR",
            "INVALID_REQUEST",
        ]
    ] = None
    modelUsed: Optional[str] = None
    statusMessage: Optional[str] = None
    tokensUsed: Optional[int] = None
    promptTokens: Optional[int] = None
    completionTokens: Optional[int] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    provider: str
    model: str
    configured: bool
    timestamp: str


class TopicRecommendation(BaseModel):
    topic: str
    priority: Literal["critical", "high", "medium", "low"]
    weight: float = Field(..., ge=0.0, le=1.0)
    targetProficiency: str
    rationale: str


class RoadmapGoalInterpretationRequest(BaseModel):
    goal: str = Field(..., min_length=1, max_length=64)
    customGoalText: Optional[str] = Field(None, max_length=1000)
    targetCompanies: Optional[List[str]] = Field(default_factory=list)
    targetRole: Optional[str] = Field(None, max_length=128)
    skillLevel: Optional[str] = Field(None, max_length=32)
    primaryLanguage: Optional[str] = Field(None, max_length=32)
    timelineWeeks: Optional[int] = Field(None, ge=1, le=52)
    struggleTopics: Optional[List[str]] = Field(default_factory=list)
    masteredTopics: Optional[List[str]] = Field(default_factory=list)


class RoadmapGoalInterpretationResponse(BaseModel):
    success: bool
    normalizedGoal: str
    primaryOutcome: str
    topicRecommendations: List[TopicRecommendation] = Field(default_factory=list)
    startingPointRecommendation: str
    pacingAdvice: str
    tradeOffAnalysis: str
    assumptions: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    errorCode: Optional[str] = None
    modelUsed: Optional[str] = None


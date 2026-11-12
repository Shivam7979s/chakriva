"""
CHAKRIVA AI Health and Diagnostics Routes
==========================================
Provides public liveness and configuration probes.
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from ..config import settings
from ..schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
@router.get("/api/v1/ai/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns runtime health and provider readiness status."""
    return HealthResponse(
        status="UP",
        service="chakriva-ai-service",
        provider=settings.ai_provider,
        model=settings.get_effective_model(),
        configured=settings.is_provider_configured(),
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@router.get("/api/v1/ai/diagnostics")
def get_diagnostics():
    """Returns non-secret diagnostic status."""
    return {
        "status": "UP",
        "service": "chakriva-ai-service",
        "diagnostics": settings.get_diagnostics()
    }

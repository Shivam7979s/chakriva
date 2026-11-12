"""
CHAKRIVA AI Chat and Socratic Mentor Route
==========================================
Handles POST /api/v1/ai/chat for Riva Chat and Mentor Mode.
Enforces authentication, rate limiting, Socratic guidance, and model boundaries.
"""

import logging
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse

from ..auth import AuthenticatedUser, verify_supabase_jwt
from ..prompt_builder import PromptBuilder
from ..providers.factory import get_ai_provider
from ..rate_limiter import enforce_rate_limit
from ..schemas import AiAssistantRequest, AiAssistantResponse

logger = logging.getLogger("chakriva.ai.routes.chat")

router = APIRouter(tags=["AI Assistant"])


@router.post(
    "/api/v1/ai/chat",
    response_model=AiAssistantResponse,
    summary="Consult Riva Coding Companion / Socratic Mentor"
)
async def chat_with_riva(
    req: AiAssistantRequest,
    request: Request,
    user: AuthenticatedUser = Depends(verify_supabase_jwt),
) -> JSONResponse:
    # 1. Enforce rate limiting per user/IP
    enforce_rate_limit(request, user)

    provider = get_ai_provider()

    # 2. Check provider credentials: never fabricate responses if unconfigured
    if not provider.is_configured():
        logger.warning("AI query rejected: provider '%s' credentials unconfigured.", provider.get_model_name())
        error_resp = AiAssistantResponse(
            success=False,
            error=(
                f"The Riva AI backend microservice (backend/ai) is running with model provider '{provider.get_model_name()}', "
                "but server-side model credentials (AI_API_KEY) are not configured. "
                "In compliance with security rules, model credentials are never stored in browser code or client responses."
            ),
            errorCode="UNCONFIGURED",
            modelUsed=provider.get_model_name(),
            statusMessage="Model API credentials unconfigured on server."
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error_resp.model_dump()
        )

    # 3. Construct structured prompt respecting Socratic constraints and code privacy
    messages = PromptBuilder.build_conversation_messages(req)

    # 4. Asynchronously invoke model provider with dynamic output token budget
    max_tokens = PromptBuilder.get_max_output_tokens(req)
    result = await provider.generate_response(messages, max_tokens=max_tokens)

    if result.success and result.reply:
        resp = AiAssistantResponse(
            success=True,
            reply=result.reply,
            modelUsed=result.model,
            tokensUsed=result.tokens_used,
            promptTokens=result.prompt_tokens,
            completionTokens=result.completion_tokens,
            statusMessage="Completed"
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=resp.model_dump())

    # 5. Handle model execution failures with accurate status codes
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if result.errorCode == "TIMEOUT":
        status_code = status.HTTP_504_GATEWAY_TIMEOUT
    elif result.errorCode == "RATE_LIMITED":
        status_code = status.HTTP_429_TOO_MANY_REQUESTS
    elif result.errorCode == "UNAUTHORIZED":
        status_code = status.HTTP_502_BAD_GATEWAY
    elif result.errorCode == "OFFLINE":
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    err_resp = AiAssistantResponse(
        success=False,
        error=result.error or "Model query failed.",
        errorCode=result.errorCode or "SERVER_ERROR",
        modelUsed=result.model,
        statusMessage="AI query execution failed."
    )
    return JSONResponse(status_code=status_code, content=err_resp.model_dump())

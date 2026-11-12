"""
CHAKRIVA AI Microservice Entry Point
====================================
FastAPI application bootstrapping with CORS, security headers, request tracking,
and startup diagnostics.
"""

from contextlib import asynccontextmanager
import logging
import uuid
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routes.chat import router as chat_router
from .routes.health import router as health_router
from .routes.roadmap_ai import router as roadmap_ai_router

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("chakriva.ai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe startup diagnostics (NEVER prints secret API keys)
    diag = settings.get_diagnostics()
    logger.info("==================================================")
    logger.info("CHAKRIVA Riva AI Service Starting")
    logger.info("Environment:        %s", diag["app_env"])
    logger.info("Listening Port:     %d", diag["port"])
    logger.info("Model Provider:     %s", diag["provider"])
    logger.info("Active Model:       %s", diag["model"])
    logger.info("Endpoint Base URL:  %s", diag["base_url"])
    logger.info("Credentials Status: %s", "CONFIGURED" if diag["api_key_configured"] else "UNCONFIGURED (missing AI_API_KEY)")
    logger.info("Rate Limit/min:     %d", diag["rate_limit_per_minute"])
    logger.info("JWT Verification:   %s", "SECRET_CHECK" if diag["supabase_jwt_auth"] else "FORMAT_ONLY (dev)")
    logger.info("==================================================")
    yield
    logger.info("CHAKRIVA Riva AI Service Shutting Down.")


app = FastAPI(
    title="CHAKRIVA AI Assistant Service",
    description="Context-Aware DSA Socratic Mentor & Coding Assistant Boundary",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"]
)


# Request ID and security headers middleware
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-Id") or f"req_{uuid.uuid4().hex[:12]}"
    response = await call_next(request)
    response.headers["X-Request-Id"] = req_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


# Global exception handler to prevent leaking stack traces or internal host details
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception on %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "An internal server error occurred while processing the AI query.",
            "errorCode": "SERVER_ERROR",
            "statusMessage": "Unexpected failure in AI microservice."
        }
    )


# Mount routes
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(roadmap_ai_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.host, port=settings.port, reload=True)

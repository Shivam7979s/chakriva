"""
CHAKRIVA AI Service Configuration
==================================
Reads environment configuration safely without exposing secrets.
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000

    # Provider and model selection
    ai_provider: str = "openai"  # openai | groq | gemini | openrouter | ollama | mock
    ai_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    ai_model: Optional[str] = None
    ai_base_url: Optional[str] = None
    ai_timeout_seconds: float = 45.0

    # Supabase authentication
    supabase_url: Optional[str] = None
    supabase_jwt_secret: Optional[str] = None

    # Rate limiting
    rate_limit_per_minute: int = 30

    # CORS configuration
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://verniq.vercel.app",
    ]

    def get_effective_api_key(self) -> Optional[str]:
        """Resolves the active API key based on provider hierarchy."""
        if self.ai_api_key:
            return self.ai_api_key
        provider = self.ai_provider.lower().strip()
        if provider == "openai":
            return self.openai_api_key or os.getenv("OPENAI_API_KEY")
        elif provider == "groq":
            return self.groq_api_key or os.getenv("GROQ_API_KEY")
        elif provider == "gemini":
            return self.gemini_api_key or os.getenv("GEMINI_API_KEY")
        elif provider == "openrouter":
            return self.openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
        return None

    def get_effective_model(self) -> str:
        """Resolves default model name for provider if not explicitly configured."""
        if self.ai_model:
            return self.ai_model
        provider = self.ai_provider.lower().strip()
        if provider == "openai":
            return "gpt-4o-mini"
        elif provider == "groq":
            return "qwen/qwen3.8-27b"
        elif provider == "gemini":
            return "gemini-3.8-flash"
        elif provider == "openrouter":
            return "anthropic/claude-3.5-sonnet"
        elif provider == "ollama":
            return "codellama"
        elif provider == "mock":
            return "mock-deterministic-v1"
        return "gpt-4o-mini"

    def get_effective_base_url(self) -> Optional[str]:
        """Resolves base URL for API endpoint if custom."""
        if self.ai_base_url:
            return self.ai_base_url
        provider = self.ai_provider.lower().strip()
        if provider == "groq":
            return "https://api.groq.com/openai/v1"
        elif provider == "gemini":
            # Gemini provides an OpenAI-compatible REST endpoint
            return "https://generativelanguage.googleapis.com/v1beta/openai/"
        elif provider == "openrouter":
            return "https://openrouter.ai/api/v1"
        elif provider == "ollama":
            return "http://localhost:11434/v1"
        return None

    def is_provider_configured(self) -> bool:
        """Determines whether the active provider is configured with credentials."""
        provider = self.ai_provider.lower().strip()
        if provider in ("mock", "ollama"):
            return True
        return bool(self.get_effective_api_key())

    def get_diagnostics(self) -> dict:
        """Emits non-secret configuration diagnostics for startup and health checks."""
        return {
            "app_env": self.app_env,
            "port": self.port,
            "provider": self.ai_provider,
            "model": self.get_effective_model(),
            "base_url": self.get_effective_base_url() or "default",
            "api_key_configured": self.is_provider_configured(),
            "timeout_seconds": self.ai_timeout_seconds,
            "rate_limit_per_minute": self.rate_limit_per_minute,
            "supabase_jwt_auth": bool(self.supabase_jwt_secret),
        }


settings = Settings()

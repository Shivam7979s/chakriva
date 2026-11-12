"""
CHAKRIVA AI Provider Factory
============================
Instantiates the configured AI model provider based on runtime settings.
"""

from ..config import settings
from .base import BaseAiProvider
from .mock_provider import MockAiProvider
from .openai_provider import OpenAiCompatibleProvider


def get_ai_provider() -> BaseAiProvider:
    """Returns the configured model provider singleton/instance."""
    provider_name = settings.ai_provider.lower().strip()

    if provider_name == "mock":
        return MockAiProvider(model="mock-deterministic-v1")

    # Standard OpenAI, Gemini, OpenRouter, and Ollama all use OpenAiCompatibleProvider
    return OpenAiCompatibleProvider(
        api_key=settings.get_effective_api_key(),
        model=settings.get_effective_model(),
        base_url=settings.get_effective_base_url(),
        timeout=settings.ai_timeout_seconds
    )

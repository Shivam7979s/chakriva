"""
CHAKRIVA AI Model Provider Base Abstraction
===========================================
Defines common interface for model providers (OpenAI, Gemini, OpenRouter, Ollama, Mock).
"""

import abc
from typing import Dict, List, Optional
from pydantic import BaseModel


class ProviderResult(BaseModel):
    success: bool
    reply: Optional[str] = None
    error: Optional[str] = None
    errorCode: Optional[str] = None
    model: str
    tokens_used: Optional[int] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None


class BaseAiProvider(abc.ABC):
    """Abstract interface for AI model execution providers."""

    @abc.abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1500,
        temperature: float = 0.7
    ) -> ProviderResult:
        """Asynchronously executes inference for the provided conversation messages."""
        pass

    @abc.abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the provider is properly configured with valid credentials/host."""
        pass

    @abc.abstractmethod
    def get_model_name(self) -> str:
        """Returns the canonical model identifier used by this provider."""
        pass

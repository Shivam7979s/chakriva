"""
CHAKRIVA OpenAI & OpenAI-Compatible Provider
============================================
Communicates with OpenAI, Google Gemini (OpenAI REST endpoint), OpenRouter, or Ollama.
Utilizes the official AsyncOpenAI SDK.
"""

import logging
from typing import Dict, List, Optional
import openai
from openai import AsyncOpenAI

from .base import BaseAiProvider, ProviderResult

logger = logging.getLogger("chakriva.ai.provider.openai")


class OpenAiCompatibleProvider(BaseAiProvider):
    """
    Standard OpenAI-compatible client.
    Works natively with OpenAI, Google Gemini, OpenRouter, and local Ollama.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
        timeout: float = 30.0
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.timeout = timeout
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            # If Ollama or local endpoint, dummy key is acceptable
            effective_key = self.api_key or ("dummy-ollama-key" if self.base_url and "localhost" in self.base_url else "missing-key")
            self._client = AsyncOpenAI(
                api_key=effective_key,
                base_url=self.base_url,
                timeout=self.timeout
            )
        return self._client

    def is_configured(self) -> bool:
        if self.base_url and "localhost" in self.base_url:
            return True
        return bool(self.api_key and self.api_key.strip() and not self.api_key.startswith("your-"))

    def get_model_name(self) -> str:
        return self.model

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1500,
        temperature: float = 0.7
    ) -> ProviderResult:
        if not self.is_configured():
            return ProviderResult(
                success=False,
                error="The AI provider is not configured with valid server credentials.",
                errorCode="UNCONFIGURED",
                model=self.model
            )

        client = self._get_client()

        try:
            logger.info("Dispatching query to model '%s' (base_url: %s, messages: %d)", self.model, self.base_url or "default", len(messages))
            completion = await client.chat.completions.create(
                model=self.model,
                messages=messages,  # type: ignore
                max_tokens=max_tokens,
                temperature=temperature
            )

            choice = completion.choices[0]
            reply_text = choice.message.content or ""
            prompt_tokens = completion.usage.prompt_tokens if completion.usage else None
            completion_tokens = completion.usage.completion_tokens if completion.usage else None
            total_tokens = completion.usage.total_tokens if completion.usage else None

            logger.info(
                "Model inference succeeded (model: %s, prompt_tokens: %s, completion_tokens: %s, total_tokens: %s)",
                self.model,
                prompt_tokens,
                completion_tokens,
                total_tokens
            )

            return ProviderResult(
                success=True,
                reply=reply_text,
                model=self.model,
                tokens_used=total_tokens,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens
            )

        except openai.AuthenticationError as e:
            logger.error("Provider authentication failed: %s", str(e))
            return ProviderResult(
                success=False,
                error="AI provider authentication rejected. Please verify the server-side API key.",
                errorCode="UNAUTHORIZED",
                model=self.model
            )

        except openai.RateLimitError as e:
            logger.warning("Provider rate limit reached: %s", str(e))
            detail = ""
            if hasattr(e, "body") and isinstance(e.body, dict) and "message" in e.body:
                detail = e.body["message"]
            elif hasattr(e, "message") and e.message:
                detail = e.message
            else:
                detail = str(e)

            if "credit" in detail.lower() or "quota" in detail.lower() or "billing" in detail.lower():
                err_msg = f"OpenAI quota exhausted: {detail}"
            else:
                err_msg = f"Upstream AI provider rate limit reached: {detail}"

            return ProviderResult(
                success=False,
                error=err_msg,
                errorCode="RATE_LIMITED",
                model=self.model
            )

        except openai.APITimeoutError as e:
            logger.error("Provider query timed out after %.1fs: %s", self.timeout, str(e))
            return ProviderResult(
                success=False,
                error=f"Model response timed out after {int(self.timeout)}s. Please try again.",
                errorCode="TIMEOUT",
                model=self.model
            )

        except openai.APIConnectionError as e:
            logger.error("Provider connection error: %s", str(e))
            return ProviderResult(
                success=False,
                error="Unable to connect to upstream AI provider. Check network connectivity.",
                errorCode="OFFLINE",
                model=self.model
            )

        except openai.APIError as e:
            logger.error("Upstream AI provider API error: %s", str(e))
            return ProviderResult(
                success=False,
                error=f"Upstream provider error: {getattr(e, 'message', str(e))}",
                errorCode="SERVER_ERROR",
                model=self.model
            )

        except Exception as e:
            logger.exception("Unexpected error during AI generation: %s", str(e))
            return ProviderResult(
                success=False,
                error="An unexpected internal error occurred while communicating with the model.",
                errorCode="SERVER_ERROR",
                model=self.model
            )

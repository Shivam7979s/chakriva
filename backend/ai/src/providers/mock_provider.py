"""
CHAKRIVA Mock AI Provider (Testing Only)
========================================
Deterministic provider strictly for automated tests and offline test suites.
Never used as production assistant output.
"""

from typing import Dict, List, Optional
from .base import BaseAiProvider, ProviderResult


class MockAiProvider(BaseAiProvider):
    """Deterministic mock provider for automated unit/integration tests."""

    def __init__(
        self,
        model: str = "mock-deterministic-v1",
        simulate_error: Optional[str] = None
    ):
        self.model = model
        self.simulate_error = simulate_error

    def is_configured(self) -> bool:
        return self.simulate_error != "UNCONFIGURED"

    def get_model_name(self) -> str:
        return self.model

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1500,
        temperature: float = 0.7
    ) -> ProviderResult:
        if self.simulate_error == "UNCONFIGURED":
            return ProviderResult(
                success=False,
                error="The AI provider is not configured with valid server credentials.",
                errorCode="UNCONFIGURED",
                model=self.model
            )
        elif self.simulate_error == "TIMEOUT":
            return ProviderResult(
                success=False,
                error="Model response timed out.",
                errorCode="TIMEOUT",
                model=self.model
            )
        elif self.simulate_error == "RATE_LIMITED":
            return ProviderResult(
                success=False,
                error="Upstream AI provider rate limit reached.",
                errorCode="RATE_LIMITED",
                model=self.model
            )

        # Deterministic reply based on last message
        last_msg = messages[-1]["content"] if messages else ""
        system_msg = messages[0]["content"] if messages and messages[0]["role"] == "system" else ""

        last_lower = last_msg.lower()
        sys_lower = system_msg.lower()

        if "full solution" in last_lower or "full_solution" in last_lower or "show me the full solution" in last_lower or "full solution walkthrough" in sys_lower:
            reply = (
                "```python\n"
                "class Solution:\n"
                "    def twoSum(self, nums: list[int], target: int) -> list[int]:\n"
                "        seen = {}\n"
                "        for i, num in enumerate(nums):\n"
                "            comp = target - num\n"
                "            if comp in seen:\n"
                "                return [seen[comp], i]\n"
                "            seen[num] = i\n"
                "        return []\n"
                "```\n\n"
                "### Invariant Analysis\n"
                "For every index `i`, we verify whether `target - nums[i]` exists in our lookup table in O(1) time."
            )
        elif "hint" in last_lower:
            reply = "Consider the mathematical relationship: for each element, what exact complementary value are you seeking to reach the target?"
        else:
            reply = "Riva Socratic Mentor: I reviewed your query. What do the problem bounds suggest regarding optimal time complexity?"

        return ProviderResult(
            success=True,
            reply=reply,
            model=self.model,
            tokens_used=42
        )

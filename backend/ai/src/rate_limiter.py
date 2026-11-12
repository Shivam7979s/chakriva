"""
CHAKRIVA AI Rate Limiting Infrastructure
=========================================
Thread-safe sliding window rate limiter keyed by authenticated user ID or client IP.
Prevents denial-of-service and runaway model invocation costs.
"""

import collections
import logging
import threading
import time
from typing import Dict, Optional, Tuple
from fastapi import HTTPException, Request, status

from .auth import AuthenticatedUser
from .config import settings

logger = logging.getLogger("chakriva.ai.rate_limiter")


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self, requests_per_minute: int = 30, window_seconds: float = 60.0):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = window_seconds
        self._history: Dict[str, collections.deque] = collections.defaultdict(collections.deque)
        self._lock = threading.Lock()

    def is_allowed(self, key: str, limit: Optional[int] = None) -> Tuple[bool, int, float]:
        """
        Evaluates whether a request with the specified key is allowed.
        Returns: (allowed: bool, current_count: int, retry_after: float)
        """
        effective_limit = limit if limit is not None else self.requests_per_minute
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            timestamps = self._history[key]
            # Evict timestamps outside current window
            while timestamps and timestamps[0] < window_start:
                timestamps.popleft()

            if len(timestamps) < effective_limit:
                timestamps.append(now)
                return True, len(timestamps), 0.0

            oldest_ts = timestamps[0]
            retry_after = max(0.1, (oldest_ts + self.window_seconds) - now)
            return False, len(timestamps), retry_after

    def reset(self):
        """Clears all rate limit state (useful in test teardown)."""
        with self._lock:
            self._history.clear()


limiter = SlidingWindowRateLimiter(
    requests_per_minute=settings.rate_limit_per_minute,
    window_seconds=60.0
)


def enforce_rate_limit(request: Request, user: Optional[AuthenticatedUser] = None):
    """
    FastAPI dependency to enforce rate limiting on incoming queries.
    """
    if user and user.user_id:
        key = f"user:{user.user_id}"
    else:
        client_ip = request.client.host if request.client else "unknown"
        key = f"ip:{client_ip}"

    allowed, count, retry_after = limiter.is_allowed(key, limit=settings.rate_limit_per_minute)
    if not allowed:
        logger.warning("Rate limit exceeded for key: %s (retry after %.1fs)", key, retry_after)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "success": False,
                "error": f"Rate limit reached ({settings.rate_limit_per_minute} requests/min). Please wait a moment before sending another query.",
                "errorCode": "RATE_LIMITED",
                "statusMessage": f"Retry after {int(retry_after) + 1}s"
            },
            headers={"Retry-After": str(int(retry_after) + 1)}
        )

"""
Rate Limiter Tests
==================
"""

from src.rate_limiter import SlidingWindowRateLimiter


def test_sliding_window_rate_limiter():
    """Verifies that exceeding the allowed limit triggers throttling."""
    limiter = SlidingWindowRateLimiter(requests_per_minute=3, window_seconds=60.0)
    key = "user:test-123"

    # Requests 1, 2, 3 allowed
    assert limiter.is_allowed(key)[0] is True
    assert limiter.is_allowed(key)[0] is True
    assert limiter.is_allowed(key)[0] is True

    # 4th request must be rejected
    allowed, count, retry_after = limiter.is_allowed(key)
    assert allowed is False
    assert count == 3
    assert retry_after > 0


def test_rate_limiter_endpoint_integration(client, auth_headers, monkeypatch):
    """Verifies endpoint returns HTTP 429 when rate limit is exceeded."""
    from src.config import settings
    monkeypatch.setattr(settings, "rate_limit_per_minute", 2)

    payload = {
        "problemId": "VRQ-000001",
        "message": "Query 1"
    }

    res1 = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert res1.status_code == 200

    res2 = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert res2.status_code == 200

    res3 = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert res3.status_code == 429
    body = res3.json()
    assert body.get("detail", {}).get("errorCode") == "RATE_LIMITED"
    assert "Retry-After" in res3.headers

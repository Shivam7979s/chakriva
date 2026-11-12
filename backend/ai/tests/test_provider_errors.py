"""
Provider Error Handling Tests
==============================
Verifies missing credentials, timeouts, and rate limits without fabricating fake output.
"""

from src.providers.mock_provider import MockAiProvider


def test_unconfigured_credentials_returns_503(client, auth_headers, monkeypatch):
    """When credentials are not configured, endpoint must return HTTP 503 with UNCONFIGURED code."""
    import src.routes.chat as chat_module

    # Inject an unconfigured provider
    unconfigured_provider = MockAiProvider(simulate_error="UNCONFIGURED")
    monkeypatch.setattr(chat_module, "get_ai_provider", lambda: unconfigured_provider)

    payload = {
        "problemId": "VRQ-000001",
        "message": "Give me a hint"
    }

    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["errorCode"] == "UNCONFIGURED"
    assert "not configured" in body["error"]
    assert "never stored in browser code" in body["error"]


def test_provider_timeout_returns_504(client, auth_headers, monkeypatch):
    """When upstream provider times out, endpoint must return HTTP 504 with TIMEOUT code."""
    import src.routes.chat as chat_module

    timeout_provider = MockAiProvider(simulate_error="TIMEOUT")
    monkeypatch.setattr(chat_module, "get_ai_provider", lambda: timeout_provider)

    payload = {
        "problemId": "VRQ-000001",
        "message": "Give me a hint"
    }

    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 504
    body = response.json()
    assert body["success"] is False
    assert body["errorCode"] == "TIMEOUT"


def test_provider_rate_limit_returns_429(client, auth_headers, monkeypatch):
    """When upstream provider rate limits, endpoint must return HTTP 429 with RATE_LIMITED code."""
    import src.routes.chat as chat_module

    rate_limited_provider = MockAiProvider(simulate_error="RATE_LIMITED")
    monkeypatch.setattr(chat_module, "get_ai_provider", lambda: rate_limited_provider)

    payload = {
        "problemId": "VRQ-000001",
        "message": "Give me a hint"
    }

    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 429
    body = response.json()
    assert body["success"] is False
    assert body["errorCode"] == "RATE_LIMITED"

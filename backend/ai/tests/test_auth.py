"""
Authentication and JWT Boundary Tests
======================================
"""

import time
import jwt
from src.config import settings


def test_missing_auth_header_rejected(client):
    """Requests without Authorization header must be rejected with HTTP 401."""
    payload = {
        "problemId": "VRQ-000001",
        "message": "Can I have a hint?"
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 401
    body = response.json()
    assert body.get("detail", {}).get("errorCode") == "UNAUTHORIZED"


def test_malformed_auth_header_rejected(client):
    """Malformed headers (e.g. Basic instead of Bearer) must be rejected with HTTP 401."""
    payload = {
        "problemId": "VRQ-000001",
        "message": "Can I have a hint?"
    }
    headers = {"Authorization": "Basic dXNlcjpwYXNz"}
    response = client.post("/api/v1/ai/chat", json=payload, headers=headers)
    assert response.status_code == 401
    assert "Bearer" in response.json().get("detail", {}).get("error", "")


def test_expired_token_rejected(client):
    """Expired JWT tokens must be rejected with HTTP 401."""
    expired_payload = {
        "sub": "d3b07384-d113-4f44-933e-1f81d866a123",
        "email": "learner@chakriva.io",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) - 100
    }
    secret = settings.supabase_jwt_secret or "test-secret-at-least-32-bytes-long-for-hmac-sha256"
    token = jwt.encode(expired_payload, secret, algorithm="HS256")

    payload = {
        "problemId": "VRQ-000001",
        "message": "Can I have a hint?"
    }
    response = client.post("/api/v1/ai/chat", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_valid_token_accepted(client, auth_headers):
    """Valid JWT tokens allow the request to proceed."""
    payload = {
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "message": "Can you give me an invariant hint?",
        "mode": "mentor",
        "mentorAction": "hint",
        "hintLevel": 1
    }
    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is True
    assert "reply" in body

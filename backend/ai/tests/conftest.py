"""
Pytest Fixtures for CHAKRIVA AI Microservice Tests
==================================================
"""

import time
import pytest
from fastapi.testclient import TestClient
import jwt

from src.config import settings
from src.main import app
from src.rate_limiter import limiter


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Sets test settings and resets in-memory rate limiter."""
    monkeypatch.setattr(settings, "ai_provider", "mock")
    monkeypatch.setattr(settings, "rate_limit_per_minute", 100)
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def valid_jwt_token():
    """Generates a valid test Supabase JWT token with valid expiration."""
    payload = {
        "sub": "d3b07384-d113-4f44-933e-1f81d866a123",
        "email": "learner@chakriva.io",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600
    }
    secret = settings.supabase_jwt_secret or "test-secret-at-least-32-bytes-long-for-hmac-sha256"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def auth_headers(valid_jwt_token):
    """Authorization headers with Bearer token."""
    return {"Authorization": f"Bearer {valid_jwt_token}"}

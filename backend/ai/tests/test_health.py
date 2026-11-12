"""
Health and Diagnostics Tests
=============================
"""


def test_health_check_returns_up(client):
    """GET /health and GET /api/v1/ai/health return 200 with service UP."""
    res1 = client.get("/health")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "UP"
    assert data1["service"] == "chakriva-ai-service"

    res2 = client.get("/api/v1/ai/health")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "UP"


def test_diagnostics_omits_secrets(client):
    """GET /api/v1/ai/diagnostics provides status without secret values."""
    response = client.get("/api/v1/ai/diagnostics")
    assert response.status_code == 200
    data = response.json()
    diag = data["diagnostics"]
    assert "api_key" not in diag  # Secret key is never in diagnostics
    assert "api_key_configured" in diag
    assert "provider" in diag
    assert "model" in diag

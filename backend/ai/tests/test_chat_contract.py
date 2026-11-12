"""
Contract and Schema Compatibility Tests
========================================
Validates both Chat and Mentor payloads matching frontend/src/services/aiAssistantService.ts.
"""


def test_normal_chat_request(client, auth_headers):
    """Verifies normal Chat mode processing."""
    payload = {
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "problemDifficulty": "EASY",
        "statement": "Given an array of integers nums and an integer target...",
        "constraints": "2 <= nums.length <= 10^4",
        "message": "What is the time complexity of a brute force search?",
        "mode": "chat",
        "history": [
            {"role": "user", "content": "Hello Riva"},
            {"role": "assistant", "content": "Hello! How can I assist you with Two Sum?"}
        ]
    }
    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["reply"], str)
    assert data["modelUsed"] == "mock-deterministic-v1"


def test_mentor_mode_progressive_hint_level_1(client, auth_headers):
    """Verifies Mentor Mode Hint Level 1 request."""
    payload = {
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "problemDifficulty": "EASY",
        "statement": "Given an array of integers...",
        "message": "Please give me hint 1",
        "mode": "mentor",
        "mentorAction": "hint",
        "hintLevel": 1,
        "isDraftProblem": False
    }
    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "complement" in data["reply"].lower()


def test_mentor_mode_full_solution_request(client, auth_headers):
    """Verifies Mentor Mode Full Solution request returns code implementation."""
    payload = {
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "problemDifficulty": "EASY",
        "message": "Show me the full solution",
        "mode": "mentor",
        "mentorAction": "full_solution",
        "language": "python"
    }
    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "class Solution:" in data["reply"]
    assert "def twoSum" in data["reply"]


def test_invalid_payload_length_rejected(client, auth_headers):
    """Payloads exceeding maximum field limits must return 422 Unprocessable Entity."""
    payload = {
        "problemId": "VRQ-000001",
        "message": "A" * 5000  # Exceeds max_length=4000
    }
    response = client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 422

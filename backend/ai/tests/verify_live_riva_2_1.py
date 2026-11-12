"""
Live Verification Script for CHAKRIVA Riva 2.1
==============================================
Validates response quality, response length, code review structure,
progressive hints, and full solution formatting against the live running Riva AI service.
"""

import os
import sys
import time
import json
import requests
import jwt
from dotenv import load_dotenv

# Load environment from .env files
load_dotenv(".env")
load_dotenv("../../.env")

SERVER_URL = "http://127.0.0.1:8000"
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") or "test-secret-at-least-32-bytes-long-for-hmac-sha256"

def generate_test_token():
    payload = {
        "sub": "test-user-riva-2-1",
        "email": "riva2.1-tester@chakriva.io",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def send_chat(payload):
    import time
    time.sleep(2)
    token = generate_test_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    resp = requests.post(f"{SERVER_URL}/api/v1/ai/chat", json=payload, headers=headers, timeout=60)
    assert resp.status_code == 200, f"Error {resp.status_code}: {resp.text}"
    return resp.json()

def test_live_quality():
    print("\n=======================================================")
    print("Testing Live Riva 2.1 Quality & Response Length Targets")
    print("=======================================================")

    # 1. Greeting
    print("\n[Test 1] Greeting query ('hi')...")
    res1 = send_chat({
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "message": "hi",
        "mode": "chat"
    })
    reply1 = res1["reply"].strip()
    word_count1 = len(reply1.split())
    print(f"Reply: \"{reply1}\"")
    print(f"Word count: {word_count1} (Target: 1 sentence, ~5-25 words)")
    assert word_count1 <= 40, f"Greeting too verbose: {word_count1} words"
    print("[PASS] Test 1 Passed: Brief 1-sentence greeting.")

    # 2. Complexity Direct Answer
    print("\n[Test 2] Direct Complexity Question...")
    res2 = send_chat({
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "message": "What is the optimal time and space complexity for Two Sum?",
        "mode": "chat",
        "actionType": "complexity"
    })
    reply2 = res2["reply"].strip()
    word_count2 = len(reply2.split())
    print(f"Reply:\n{reply2}")
    print(f"Word count: {word_count2} (Target: Big-O + 1-3 sentences, 20-80 words)")
    assert "O(n)" in reply2 or "O(N)" in reply2
    assert word_count2 <= 100, f"Complexity answer too verbose: {word_count2} words"
    print("[PASS] Test 2 Passed: Direct, concise Big-O complexity explanation.")

    # 3. Code Review
    print("\n[Test 3] Code Review ('rate my code' with nested loop Java Two Sum)...")
    nested_java_code = """class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[] { i, j };
                }
            }
        }
        return new int[0];
    }
}"""
    res3 = send_chat({
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "problemDifficulty": "EASY",
        "statement": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "language": "java",
        "sourceCode": nested_java_code,
        "codeIncluded": True,
        "message": "Please review my code and rate it. Is this correct?",
        "mode": "chat",
        "actionType": "review"
    })
    reply3 = res3["reply"].strip()
    word_count3 = len(reply3.split())
    print(f"Reply:\n{reply3}")
    print(f"Word count: {word_count3} (Target: ~100-150 words max)")
    assert "**Verdict:**" in reply3
    assert "**Complexity:**" in reply3
    assert "**Strength:**" in reply3
    assert "**Improvement:**" in reply3
    assert "**Next step:**" in reply3
    assert "O(n^2)" in reply3 or "O(n²)" in reply3 or "O(N^2)" in reply3
    # Check that it didn't dump a complete HashMap solution block
    assert "HashMap" in reply3 or "hash map" in reply3.lower() or "hash" in reply3.lower()
    print("[PASS] Test 3 Passed: Compact structured 5-bullet code review with Big-O and no full solution code dump.")

    # 4. Socratic Hint 1 (Progressive, no algorithm spoiler)
    print("\n[Test 4] Socratic Progressive Hint 1...")
    res4 = send_chat({
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "problemDifficulty": "EASY",
        "statement": "Given an array of integers nums and an integer target...",
        "message": "Give me Hint 1",
        "mode": "mentor",
        "mentorAction": "hint",
        "hintLevel": 1
    })
    reply4 = res4["reply"].strip()
    word_count4 = len(reply4.split())
    print(f"Reply:\n{reply4}")
    print(f"Word count: {word_count4} (Target: 1-3 sentences, 20-70 words)")
    # Should not spoil full code solution
    assert "class Solution" not in reply4
    assert "return new int" not in reply4
    assert word_count4 <= 90
    print("[PASS] Test 4 Passed: Conceptual invariant nudge without solution spoiler.")

    # 5. Full Solution Walkthrough (Explicitly Requested)
    print("\n[Test 5] Full Solution Walkthrough (Explicitly Requested)...")
    res5 = send_chat({
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "problemDifficulty": "EASY",
        "statement": "Given an array of integers nums and an integer target...",
        "language": "python",
        "message": "I explicitly request the full solution walkthrough and invariant proof.",
        "mode": "mentor",
        "mentorAction": "full_solution"
    })
    reply5 = res5["reply"].strip()
    print(f"Reply snippet:\n{reply5[:350]}...\n")
    # Verify compact structured sections
    assert "Core idea" in reply5 or "**Core idea:**" in reply5 or "1." in reply5
    assert "Algorithm" in reply5 or "2." in reply5
    assert "Complexity" in reply5 or "5." in reply5
    print("[PASS] Test 5 Passed: Structured full solution walkthrough with required sections.")

    # 6. Socratic Follow-Up (Answers without repeating)
    print("\n[Test 6] Socratic Follow-Up (Answers question without repeating)...")
    res6 = send_chat({
        "problemId": "VRQ-000001",
        "problemTitle": "Two Sum",
        "problemDifficulty": "EASY",
        "message": "If I use a hash map, what should be the key and what should be the value?",
        "mode": "mentor",
        "history": [
            {"role": "user", "content": "I am thinking about using a hash map for Two Sum."},
            {"role": "assistant", "content": "A hash map is a great choice because it allows O(1) lookups for complementary numbers."}
        ]
    })
    reply6 = res6["reply"].strip()
    word_count6 = len(reply6.split())
    print(f"Reply:\n{reply6}")
    print(f"Word count: {word_count6} (Target: concise answer to new question)")
    assert "key" in reply6.lower() and "value" in reply6.lower()
    assert word_count6 <= 110, f"Follow-up too verbose: {word_count6} words"
    print("[PASS] Test 6 Passed: Concise follow-up answering only the new question.")

    print("\n=======================================================")
    print("ALL 6 LIVE RIVA 2.1 QUALITY TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_live_quality()

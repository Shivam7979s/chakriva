"""
VERNIQ Phase E — Full End-to-End Submission Pipeline & Frontend Integration Verification Suite
Tests the complete live local stack:
Spring Boot (8080) <-> PostgreSQL <-> Redis (6379) <-> Python Judge Worker (8085)
"""
import urllib.request
import urllib.error
import json
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8080/api/v1"
AUTH_URL = "http://127.0.0.1:54321/auth/v1/token?grant_type=password"
SIGNUP_URL = "http://127.0.0.1:54321/auth/v1/signup"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

def get_token(email="candidate@verniq.io", password="VerniqPassword2026!"):
    payload = {
        "email": email,
        "password": password
    }
    req = urllib.request.Request(
        AUTH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "apikey": ANON_KEY
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["access_token"], data["user"]["id"]
    except urllib.error.HTTPError as e:
        # If user doesn't exist, sign up
        sreq = urllib.request.Request(
            SIGNUP_URL,
            data=json.dumps({
                "email": email,
                "password": password,
                "data": {"full_name": "Test User", "username": email.split("@")[0]}
            }).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "apikey": ANON_KEY
            }
        )
        with urllib.request.urlopen(sreq) as sresp:
            data = json.loads(sresp.read().decode("utf-8"))
            return data["access_token"], data["user"]["id"]

def create_submission(token, problem_id, language, code):
    url = f"{BASE_URL}/submissions"
    payload = {
        "problemId": problem_id,
        "language": language,
        "sourceCode": code
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        data = res.get("data", res)
        return resp.status, data

def poll_submission(token, submission_id, max_attempts=30, delay_sec=1):
    url = f"{BASE_URL}/submissions/{submission_id}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    data = None
    for attempt in range(max_attempts):
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            data = res.get("data", res)
            status = data.get("status")
            verdict = data.get("verdict")
            print(f"    [Poll {attempt+1}/{max_attempts}] Status: {status} | Verdict: {verdict}")
            if status not in ("QUEUED", "PROCESSING", "PENDING", "RUNNING"):
                return data
        time.sleep(delay_sec)
    return data

def run_tests():
    print("=================================================================")
    print("VERNIQ PHASE E — END-TO-END PIPELINE & FRONTEND INTEGRATION SUITE")
    print("=================================================================")

    # 1. Problem Catalog API Verification
    print("\n--- TEST 1: Problem Catalog Resolution (GET /api/v1/problems/{id}) ---")
    prob_req = urllib.request.Request(f"{BASE_URL}/problems/VRQ-000001")
    with urllib.request.urlopen(prob_req) as resp:
        assert resp.status == 200
        body = json.loads(resp.read().decode("utf-8"))
        prob = body["data"]
        assert prob["verniqId"] == "VRQ-000001"
        assert prob["title"] == "Two Sum"
        assert prob["difficulty"] == "EASY"
        assert "starterTemplates" in prob
        assert "examples" in prob
        assert len(prob["examples"]) >= 1
        print("[PASS] Problem catalog by Verniq ID (VRQ-000001) verified successfully.")

    prob_slug_req = urllib.request.Request(f"{BASE_URL}/problems/two-sum")
    with urllib.request.urlopen(prob_slug_req) as resp:
        assert resp.status == 200
        body = json.loads(resp.read().decode("utf-8"))
        assert body["data"]["slug"] == "two-sum"
        print("[PASS] Problem catalog by slug (two-sum) verified successfully.")

    # 2. Authentication
    print("\n--- TEST 2: Supabase User Authentication ---")
    token_a, user_a_id = get_token("candidate@verniq.io", "VerniqPassword2026!")
    print(f"[PASS] User A authenticated. ID: {user_a_id}")

    # 3. TEST A: Known-Correct Solution -> ACCEPTED
    print("\n--- TEST A: ACCEPTED Solution (Two Sum) ---")
    correct_java = """import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}"""
    code_a_status, sub_a_created = create_submission(token_a, "VRQ-000001", "JAVA", correct_java)
    assert code_a_status == 201
    assert sub_a_created["status"] == "QUEUED"
    sub_a_id = sub_a_created["submissionId"]
    print(f"  Submission created: {sub_a_id}, Status: QUEUED")

    result_a = poll_submission(token_a, sub_a_id)
    assert result_a["status"] == "ACCEPTED"
    assert result_a["verdict"].upper() == "ACCEPTED"
    assert result_a["testCasesPassed"] == result_a["totalTestCases"]
    assert result_a["testCasesPassed"] > 0
    assert result_a["runtimeMs"] is not None and result_a["runtimeMs"] >= 0
    assert result_a["memoryKb"] is not None and result_a["memoryKb"] >= 0
    print(f"[PASS] TEST A PASSED: Verdict ACCEPTED ({result_a['testCasesPassed']}/{result_a['totalTestCases']} passed, {result_a['runtimeMs']}ms, {result_a['memoryKb']}KB)")

    # 4. TEST B: Known-Wrong Solution -> WRONG_ANSWER
    print("\n--- TEST B: WRONG_ANSWER Solution (Two Sum) ---")
    wrong_java = """class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[] { 999, 999 };
    }
}"""
    code_b_status, sub_b_created = create_submission(token_a, "VRQ-000001", "JAVA", wrong_java)
    assert code_b_status == 201
    assert sub_b_created["status"] == "QUEUED"
    sub_b_id = sub_b_created["submissionId"]
    print(f"  Submission created: {sub_b_id}, Status: QUEUED")

    result_b = poll_submission(token_a, sub_b_id)
    assert result_b["status"] == "WRONG_ANSWER"
    assert result_b["verdict"].upper() == "WRONG_ANSWER"
    assert result_b["failedTestIndex"] is not None
    # Anti-leak assertion
    assert "input" not in result_b
    assert "expectedOutput" not in result_b
    assert "referenceSolution" not in result_b
    print(f"[PASS] TEST B PASSED: Verdict WRONG_ANSWER (Failed test #{result_b['failedTestIndex']}, passed: {result_b['testCasesPassed']}/{result_b['totalTestCases']})")
    print(f"  Anti-leak verified: hidden test inputs and expected outputs are strictly NOT present in API response.")

    # 5. TEST C: Compilation Error -> COMPILATION_ERROR
    print("\n--- TEST C: COMPILATION_ERROR Solution ---")
    invalid_java = """class Solution {
    public int[] twoSum(int[] nums, int target) {
        THIS_IS_INTENTIONAL_SYNTAX_ERROR;;;
        return null
    }
}"""
    code_c_status, sub_c_created = create_submission(token_a, "VRQ-000001", "JAVA", invalid_java)
    assert code_c_status == 201
    sub_c_id = sub_c_created["submissionId"]
    print(f"  Submission created: {sub_c_id}, Status: QUEUED")

    result_c = poll_submission(token_a, sub_c_id)
    assert result_c["status"] == "COMPILATION_ERROR"
    assert result_c["verdict"].upper() == "COMPILATION_ERROR"
    assert result_c["compileOutput"] is not None and len(result_c["compileOutput"]) > 0
    print(f"[PASS] TEST C PASSED: Verdict COMPILATION_ERROR with safe compiler output:")
    first_line_comp = result_c["compileOutput"].splitlines()[0] if result_c["compileOutput"] else ""
    print(f"  Sample compiler output: {first_line_comp[:80]}...")

    # 6. TEST D: User Isolation
    print("\n--- TEST D: User Isolation & Cross-Account Protection ---")
    token_b, user_b_id = get_token("second_candidate@verniq.io", "VerniqPassword2026!")
    print(f"[PASS] User B authenticated. ID: {user_b_id}")
    assert user_b_id != user_a_id

    # User B attempts to access User A's submission
    cross_url = f"{BASE_URL}/submissions/{sub_a_id}"
    cross_req = urllib.request.Request(
        cross_url,
        headers={"Authorization": f"Bearer {token_b}"}
    )
    try:
        urllib.request.urlopen(cross_req)
        assert False, "Security failure: User B was able to view User A's submission!"
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Expected 404 Not Found for foreign submission, got {e.code}"
        print(f"[PASS] TEST D PASSED: Foreign submission access by User B was denied with HTTP {e.code} Not Found.")

    # 7. TEST E: Session Expiry / Unauthenticated Submission
    print("\n--- TEST E: Session Expiry / Unauthenticated Submission Handling ---")
    unauth_req = urllib.request.Request(
        f"{BASE_URL}/submissions",
        data=json.dumps({"problemId": "VRQ-000001", "language": "JAVA", "sourceCode": "class Solution{}"}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer invalid_or_expired_jwt_token_here"
        }
    )
    try:
        urllib.request.urlopen(unauth_req)
        assert False, "Security failure: Unauthenticated submission accepted!"
    except urllib.error.HTTPError as e:
        assert e.code == 401, f"Expected 401 Unauthorized, got {e.code}"
        body = json.loads(e.read().decode("utf-8"))
        print(f"[PASS] TEST E PASSED: Invalid token rejected with HTTP 401 UNAUTHORIZED (Request ID: {body.get('requestId')})")

    # 8. TEST F: Submission History
    print("\n--- TEST F: Submission History (GET /api/v1/submissions?problemId=VRQ-000001) ---")
    hist_req = urllib.request.Request(
        f"{BASE_URL}/submissions?problemId=VRQ-000001&page=0&size=10",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    with urllib.request.urlopen(hist_req) as resp:
        assert resp.status == 200
        hist_body = json.loads(resp.read().decode("utf-8"))["data"]
        assert hist_body["totalElements"] >= 3
        print(f"[PASS] TEST F PASSED: Retrieved {hist_body['totalElements']} submissions for user on VRQ-000001.")
        for item in hist_body["content"][:3]:
            print(f"  - [{item['verdict']}] {item['language']} | runtime: {item['runtimeMs']}ms | passed: {item['testCasesPassed']}/{item['totalTestCases']} | id: {item['id']}")

    print("\n=================================================================")
    print("ALL 7 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()

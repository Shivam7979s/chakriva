import urllib.request
import json
import time
import sys

BASE_URL = "http://localhost:8080/api/v1"
AUTH_URL = "http://127.0.0.1:54321/auth/v1/token?grant_type=password"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

def get_token():
    payload = {
        "email": "candidate@verniq.io",
        "password": "VerniqPassword2026!"
    }
    req = urllib.request.Request(
        AUTH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "apikey": ANON_KEY
        }
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
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

def poll_submission(token, submission_id, max_attempts=20, delay_sec=1):
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
            print(f"  [Attempt {attempt+1}/{max_attempts}] Status: {status} | Verdict: {data.get('verdict')}")
            if status not in ("QUEUED", "PROCESSING"):
                return data
        time.sleep(delay_sec)
    return data

def main():
    print("--- 1. Authenticating test user ---")
    token, user_id = get_token()
    print(f"Logged in as user {user_id}")

    # TEST A: Correct Solution (Two Sum)
    print("\n--- 2. Submitting KNOWN-CORRECT solution for VRQ-000001 (Two Sum) ---")
    correct_code = """class Solution {
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
    status_code, created_resp = create_submission(token, "VRQ-000001", "JAVA", correct_code)
    print(f"HTTP Status: {status_code}")
    print(f"Created Response: {json.dumps(created_resp, indent=2)}")
    sub_id = created_resp["submissionId"]
    assert created_resp["status"] == "QUEUED", f"Expected QUEUED, got {created_resp['status']}"

    print(f"Polling submission {sub_id} until terminal state...")
    result_correct = poll_submission(token, sub_id)
    print(f"Final Result: {json.dumps(result_correct, indent=2)}")
    assert result_correct["status"] == "ACCEPTED", f"Expected ACCEPTED, got {result_correct['status']}"
    assert result_correct["verdict"].upper() == "ACCEPTED"
    assert result_correct["testCasesPassed"] == result_correct["totalTestCases"]
    assert result_correct["testCasesPassed"] > 0
    print(">>> TEST A PASSED: Solution was evaluated, verdict is ACCEPTED!")

    # TEST B: Wrong Answer Solution (Two Sum)
    print("\n--- 3. Submitting KNOWN-WRONG solution for VRQ-000001 (Two Sum) ---")
    wrong_code = """class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[] { 999, 999 };
    }
}"""
    status_code_wrong, created_resp_wrong = create_submission(token, "VRQ-000001", "JAVA", wrong_code)
    print(f"HTTP Status: {status_code_wrong}")
    print(f"Created Response: {json.dumps(created_resp_wrong, indent=2)}")
    sub_id_wrong = created_resp_wrong["submissionId"]
    assert created_resp_wrong["status"] == "QUEUED"

    print(f"Polling submission {sub_id_wrong} until terminal state...")
    result_wrong = poll_submission(token, sub_id_wrong)
    print(f"Final Result: {json.dumps(result_wrong, indent=2)}")
    assert result_wrong["status"] == "WRONG_ANSWER", f"Expected WRONG_ANSWER, got {result_wrong['status']}"
    assert result_wrong["verdict"].upper() == "WRONG_ANSWER"
    assert result_wrong["failedTestIndex"] is not None

    # Verify security: no hidden canonical data leaked
    resp_keys = set(result_wrong.keys())
    leaked_keys = resp_keys.intersection({"input", "expectedOutput", "expected_output", "canonical", "referenceSolution"})
    assert not leaked_keys, f"Security violation: leaked keys {leaked_keys}"
    print(">>> TEST B PASSED: Solution was evaluated, verdict is WRONG_ANSWER without data leaks!")

    # TEST C: User submission history
    print("\n--- 4. Checking User Submission History (GET /api/v1/submissions) ---")
    req_history = urllib.request.Request(
        f"{BASE_URL}/submissions?problemId=VRQ-000001",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req_history) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        history_data = res.get("data", res)
        print(f"History elements count: {history_data.get('totalElements')}")
        assert history_data.get("totalElements", 0) >= 2
        print(">>> TEST C PASSED: Submission history returns authenticated user submissions!")

    print("\n==========================================")
    print("ALL END-TO-END PIPELINE TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    main()

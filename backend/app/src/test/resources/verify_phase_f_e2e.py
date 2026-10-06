import urllib.request
import json
import time
import sys

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
        # If user doesn't exist, try signing up
        signup_req = urllib.request.Request(
            SIGNUP_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "apikey": ANON_KEY
            }
        )
        with urllib.request.urlopen(signup_req) as s_resp:
            s_data = json.loads(s_resp.read().decode("utf-8"))
            if "access_token" in s_data:
                return s_data["access_token"], s_data["user"]["id"]
            # After signup, try login again
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

def poll_submission(token, submission_id, max_attempts=25, delay_sec=1):
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

def get_progress_for_problem(token, identifier):
    url = f"{BASE_URL}/progress/problems/{identifier}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("data", res)

def get_problem_status_map(token):
    url = f"{BASE_URL}/progress/problems"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("data", res)

def get_progress_summary(token):
    url = f"{BASE_URL}/progress/summary"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("data", res)

def main():
    print("=================================================================")
    print("PHASE F: REAL END-TO-END SYSTEM VERIFICATION")
    print("=================================================================")

    # Step 1: User A authentication
    print("\n--- 1. Authenticating User A (candidate@verniq.io) ---")
    token_a, user_id_a = get_token("candidate@verniq.io", "VerniqPassword2026!")
    print(f"User A authenticated: {user_id_a}")

    # TEST A: Submit correct solution on VRQ-000001 (Two Sum) -> Solved
    print("\n--- 2. TEST A: Submitting correct solution for VRQ-000001 ---")
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
    code_status, created_a = create_submission(token_a, "VRQ-000001", "JAVA", correct_code)
    assert code_status == 201
    sub_id_a = created_a["submissionId"]
    print(f"Created submission {sub_id_a}, polling for verdict...")
    res_a = poll_submission(token_a, sub_id_a)
    assert res_a["status"] == "ACCEPTED", f"Expected ACCEPTED, got {res_a['status']}"
    print(f"Submission verdict: {res_a['verdict']}")

    # Small pause to allow transactional commit
    time.sleep(0.5)

    prog_a = get_progress_for_problem(token_a, "VRQ-000001")
    print(f"Problem Progress for VRQ-000001: {json.dumps(prog_a, indent=2)}")
    assert prog_a["status"] == "SOLVED", f"Expected status SOLVED, got {prog_a['status']}"
    assert prog_a["attemptCount"] >= 1
    assert prog_a["firstSolvedAt"] is not None
    assert prog_a["lastSolvedAt"] is not None
    print(">>> TEST A PASSED: Correct submission -> Progress SOLVED with authoritative timestamps!")

    # TEST B: Submit incorrect solution on fresh problem VRQ-000006 -> Attempted
    print("\n--- 3. TEST B: Submitting WRONG solution for VRQ-000006 (Best Time to Buy and Sell Stock) ---")
    wrong_code = """class Solution {
    public int maxProfit(int[] prices) {
        return -999; // Intentionally wrong
    }
}"""
    code_status_b, created_b = create_submission(token_a, "VRQ-000006", "JAVA", wrong_code)
    assert code_status_b == 201
    sub_id_b = created_b["submissionId"]
    print(f"Created submission {sub_id_b}, polling for verdict...")
    res_b = poll_submission(token_a, sub_id_b)
    assert res_b["status"] == "WRONG_ANSWER", f"Expected WRONG_ANSWER, got {res_b['status']}"
    print(f"Submission verdict: {res_b['verdict']}")

    time.sleep(0.5)

    prog_b = get_progress_for_problem(token_a, "VRQ-000006")
    print(f"Problem Progress for VRQ-000006: {json.dumps(prog_b, indent=2)}")
    assert prog_b["status"] == "ATTEMPTED", f"Expected status ATTEMPTED, got {prog_b['status']}"
    assert prog_b["firstAttemptedAt"] is not None
    assert prog_b["firstSolvedAt"] is None, "firstSolvedAt must be None for wrong answer!"
    print(">>> TEST B PASSED: Incorrect submission -> Progress ATTEMPTED (NOT Solved)!")

    # TEST C: Problem reload & status map
    print("\n--- 4. TEST C: Problem reload & Fast Catalog Status Map ---")
    status_map = get_problem_status_map(token_a)
    print(f"Status map contains {len(status_map)} entries")
    assert status_map.get("VRQ-000001") == "SOLVED", f"Expected VRQ-000001 to be SOLVED, got {status_map.get('VRQ-000001')}"
    assert status_map.get("VRQ-000006") == "ATTEMPTED", f"Expected VRQ-000006 to be ATTEMPTED, got {status_map.get('VRQ-000006')}"

    # Reload problem progress
    reloaded_a = get_progress_for_problem(token_a, "VRQ-000001")
    assert reloaded_a["status"] == "SOLVED"
    print(">>> TEST C PASSED: Reload problem and catalog status map return consistent server state!")

    # TEST D: Progress Dashboard Summary
    print("\n--- 5. TEST D: Checking Progress Summary Dashboard ---")
    summary = get_progress_summary(token_a)
    print(f"Progress Summary:")
    print(f"  totalProblemsSolved: {summary['totalProblemsSolved']}")
    print(f"  totalProblemsAttempted: {summary['totalProblemsAttempted']}")
    print(f"  totalSubmissions: {summary['totalSubmissions']}")
    print(f"  acceptedSubmissions: {summary['acceptedSubmissions']}")
    print(f"  submissionAcceptanceRate: {summary['submissionAcceptanceRate']}%")
    print(f"  difficulty: {json.dumps(summary['difficulty'])}")
    print(f"  topics count: {len(summary['topics'])}")
    print(f"  companies count: {len(summary['companies'])}")
    print(f"  recentActivity count: {len(summary['recentActivity'])}")

    assert summary["totalProblemsSolved"] >= 1
    assert summary["totalProblemsAttempted"] >= 2
    assert summary["totalSubmissions"] >= 2
    assert summary["acceptedSubmissions"] >= 1
    assert summary["submissionAcceptanceRate"] > 0
    assert summary["difficulty"]["easy"]["solved"] >= 1
    assert len(summary["recentActivity"]) > 0

    recent_ids = [act["verniqId"] for act in summary["recentActivity"]]
    print(f"  Recent activity verniqIds: {recent_ids}")
    assert "VRQ-000001" in recent_ids or "VRQ-000006" in recent_ids
    print(">>> TEST D PASSED: Dashboard summary aggregates real submission and problem metrics correctly!")

    # TEST E: User Isolation
    print("\n--- 6. TEST E: Verifying Cross-User Isolation (User B) ---")
    token_b, user_id_b = get_token("candidate_b_phase_f@verniq.io", "VerniqPassword2026!")
    print(f"User B authenticated: {user_id_b}")
    assert user_id_b != user_id_a, "User B must have distinct ID from User A"

    # User B queries VRQ-000001 (which User A solved)
    prog_user_b = get_progress_for_problem(token_b, "VRQ-000001")
    print(f"User B's progress on VRQ-000001: {json.dumps(prog_user_b, indent=2)}")
    assert prog_user_b["status"] == "UNATTEMPTED", f"User B must see UNATTEMPTED, got {prog_user_b['status']}"
    assert prog_user_b["attemptCount"] == 0
    assert prog_user_b["firstSolvedAt"] is None

    # User B queries summary
    summary_b = get_progress_summary(token_b)
    print(f"User B's total problems solved: {summary_b['totalProblemsSolved']}")
    assert summary_b["totalProblemsSolved"] == 0, "User B cannot see User A's solved count!"
    print(">>> TEST E PASSED: Strict User Isolation verified! User A's progress is completely invisible to User B!")

    print("\n=================================================================")
    print("ALL PHASE F REAL END-TO-END TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    main()

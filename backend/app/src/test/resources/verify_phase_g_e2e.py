import urllib.request
import urllib.error
import json
import time
import sys

BASE_URL = "http://localhost:8080/api/v1"
AUTH_URL = "http://127.0.0.1:54321/auth/v1/token?grant_type=password"
SIGNUP_URL = "http://127.0.0.1:54321/auth/v1/signup"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

def get_or_create_user(email, password="VerniqPassword2026!"):
    payload = {"email": email, "password": password}
    req = urllib.request.Request(
        AUTH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "apikey": ANON_KEY}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["access_token"], data["user"]["id"]
    except urllib.error.HTTPError:
        signup_req = urllib.request.Request(
            SIGNUP_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "apikey": ANON_KEY}
        )
        with urllib.request.urlopen(signup_req) as s_resp:
            s_data = json.loads(s_resp.read().decode("utf-8"))
            if "access_token" in s_data:
                return s_data["access_token"], s_data["user"]["id"]
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["access_token"], data["user"]["id"]

def api_get(token, path):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("data", res)

def api_post(token, path, payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else b""
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return resp.status, res.get("data", res)

def create_submission(token, problem_id, language, code):
    return api_post(token, "/submissions", {
        "problemId": problem_id,
        "language": language,
        "sourceCode": code
    })

def poll_submission(token, submission_id, max_attempts=25, delay_sec=1):
    for attempt in range(max_attempts):
        data = api_get(token, f"/submissions/{submission_id}")
        status = data.get("status")
        print(f"    [Submission Poll {attempt+1}/{max_attempts}] Status: {status} | Verdict: {data.get('verdict')}")
        if status not in ("QUEUED", "PROCESSING"):
            return data
        time.sleep(delay_sec)
    return data

def main():
    print("=================================================================")
    print("PHASE G: REAL END-TO-END SYSTEM VERIFICATION")
    print("=================================================================")

    # Unique timestamp for fresh user
    fresh_user_email = f"user_g_{int(time.time())}@verniq.io"
    print(f"\n--- 1. Authenticating Fresh User A ({fresh_user_email}) ---")
    token_a, user_id_a = get_or_create_user(fresh_user_email)
    print(f"User A authenticated. ID: {user_id_a}")

    # E2E A: Fresh roadmap
    print("\n--- 2. E2E A: Fresh User Roadmap Inspection ---")
    roadmaps = api_get(token_a, "/roadmaps")
    assert len(roadmaps) >= 1, "Expected at least one published roadmap"
    dsa_meta = next((r for r in roadmaps if r["slug"] == "dsa-mastery"), None)
    assert dsa_meta is not None, "DSA Mastery roadmap must exist"
    print(f"Roadmap found: {dsa_meta['title']} | Duration: {dsa_meta['estimatedDuration']}")

    detail_a = api_get(token_a, "/roadmaps/dsa-mastery")
    sprint1_a = detail_a["sprints"][0]
    day1_a = sprint1_a["days"][0]
    day2_a = sprint1_a["days"][1]

    print(f"Day 1 status: {day1_a['status']} | Day 2 status: {day2_a['status']}")
    assert day1_a["status"] == "AVAILABLE", f"Fresh user Day 1 must be AVAILABLE, got {day1_a['status']}"
    assert day2_a["status"] == "LOCKED", f"Fresh user Day 2 must be LOCKED, got {day2_a['status']}"

    progress_summary_a = api_get(token_a, "/roadmaps/dsa-mastery/progress")
    print(f"Initial progress: {progress_summary_a}")
    assert progress_summary_a["completedNodes"] == 0, "Fresh user must have 0 completed nodes"
    assert progress_summary_a["availableNodes"] >= 1, "Fresh user must have at least 1 available node"
    assert progress_summary_a["progressPercent"] == 0.0, "Fresh user progress must be 0%"

    next_prob_a = api_get(token_a, "/roadmaps/dsa-mastery/next")
    print(f"Next recommended problem for fresh user: {next_prob_a['problemId']} - {next_prob_a['title']}")
    assert next_prob_a["problemId"] == "VRQ-000001", f"Expected VRQ-000001, got {next_prob_a['problemId']}"
    assert "Two Sum" in next_prob_a["title"]
    assert "current roadmap section" in next_prob_a["reason"]
    print(">>> E2E A PASSED: Fresh roadmap starts with Day 1 AVAILABLE, Day 2 LOCKED, next problem = VRQ-000001!")

    # E2E B: Solve a problem
    print("\n--- 3. E2E B: Solving VRQ-000001 (Two Sum) with Verified Judge Execution ---")
    correct_two_sum = """class Solution {
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
    code_status, sub_resp = create_submission(token_a, "VRQ-000001", "JAVA", correct_two_sum)
    assert code_status == 201
    sub_id = sub_resp["submissionId"]
    print(f"Submitted {sub_id}, awaiting judge verdict...")
    verdict = poll_submission(token_a, sub_id)
    assert verdict["status"] == "ACCEPTED", f"Expected ACCEPTED, got {verdict['status']}"
    print(f"Verdict: {verdict['status']} ({verdict['verdict']})")

    # Give DB commit a moment
    time.sleep(0.5)

    detail_after_solve = api_get(token_a, "/roadmaps/dsa-mastery")
    d1_items = detail_after_solve["sprints"][0]["days"][0]["items"]
    two_sum_item = next(i for i in d1_items if i.get("problemReference") and i["problemReference"]["verniqProblemId"] == "VRQ-000001")
    assert two_sum_item["status"] == "COMPLETED", f"Problem item must be COMPLETED, got {two_sum_item['status']}"
    print(f"Problem item status in roadmap: {two_sum_item['title']} -> {two_sum_item['status']}")
    print(">>> E2E B PASSED: Problem solved -> Server-authoritatively marked COMPLETED in roadmap!")

    # E2E C: Complete a roadmap node
    print("\n--- 4. E2E C: Completing Non-Problem Required Items in Day 1 ---")
    # Complete non-problem items in Day 1 to achieve full Day 1 completion
    for item in d1_items:
        if item["itemType"] != "PROBLEM" and item.get("required", False):
            print(f"Completing required {item['itemType']}: {item['title']} (id: {item['id']})")
            status, comp_resp = api_post(token_a, f"/roadmaps/items/{item['id']}/complete")
            assert status == 200
            assert comp_resp["status"] == "COMPLETED"

    # Now verify Day 1 has transitioned to COMPLETED and Day 2 unlocked to AVAILABLE
    detail_c = api_get(token_a, "/roadmaps/dsa-mastery")
    sprint1_c = detail_c["sprints"][0]
    day1_c = sprint1_c["days"][0]
    day2_c = sprint1_c["days"][1]

    print(f"Day 1 status after completion: {day1_c['status']}")
    print(f"Day 2 status after unlock: {day2_c['status']}")
    assert day1_c["status"] == "COMPLETED", f"Day 1 must now be COMPLETED, got {day1_c['status']}"
    assert day2_c["status"] in ("AVAILABLE", "IN_PROGRESS"), f"Day 2 must now be AVAILABLE or IN_PROGRESS, got {day2_c['status']}"

    progress_c = api_get(token_a, "/roadmaps/dsa-mastery/progress")
    print(f"Updated Progress: completedNodes={progress_c['completedNodes']} | percent={progress_c['progressPercent']}%")
    assert progress_c["completedNodes"] >= 1, "At least 1 node must be completed"
    assert progress_c["progressPercent"] > 0, "Progress percent must have increased"

    # Next problem should now advance to Day 2's problem
    next_prob_c = api_get(token_a, "/roadmaps/dsa-mastery/next")
    print(f"New recommended problem after Day 1 completion: {next_prob_c['problemId']} - {next_prob_c['title']}")
    assert next_prob_c["problemId"] != "VRQ-000001", "Already solved problem VRQ-000001 must NEVER be recommended again!"
    assert next_prob_c["problemId"] in ("VRQ-000005", "VRQ-000006"), f"Expected Day 2 problem, got {next_prob_c['problemId']}"
    print(">>> E2E C PASSED: Node Day 1 completed -> Day 2 unlocked to AVAILABLE -> Next problem advances!")

    # E2E D: Wrong answer
    print("\n--- 5. E2E D: Submitting WRONG answer to VRQ-000006 ---")
    wrong_code = """class Solution {
    public int maxProfit(int[] prices) {
        return -42; // Intentionally wrong
    }
}"""
    code_status_w, sub_w = create_submission(token_a, "VRQ-000006", "JAVA", wrong_code)
    assert code_status_w == 201
    w_verdict = poll_submission(token_a, sub_w["submissionId"])
    assert w_verdict["status"] == "WRONG_ANSWER", f"Expected WRONG_ANSWER, got {w_verdict['status']}"

    time.sleep(0.5)

    detail_d = api_get(token_a, "/roadmaps/dsa-mastery")
    day2_d = detail_d["sprints"][0]["days"][1]
    v6_item = next(i for i in day2_d["items"] if i.get("problemReference") and i["problemReference"]["verniqProblemId"] == "VRQ-000006")
    print(f"Item VRQ-000006 status: {v6_item['status']}")
    print(f"Day 2 node status: {day2_d['status']}")
    assert v6_item["status"] == "IN_PROGRESS", f"Failed problem item must be IN_PROGRESS, got {v6_item['status']}"
    assert day2_d["status"] != "COMPLETED", f"Day 2 must NOT be marked COMPLETED when problems failed! Got {day2_d['status']}"
    print(">>> E2E D PASSED: Wrong answer marks item IN_PROGRESS; node does NOT falsely complete!")

    # E2E E: Reload browser / persistence
    print("\n--- 6. E2E E: Verifying Server State Persistence on Fresh Request ---")
    reloaded_progress = api_get(token_a, "/roadmaps/dsa-mastery/progress")
    assert reloaded_progress["completedNodes"] == progress_c["completedNodes"], "Completed nodes count must persist"
    assert reloaded_progress["progressPercent"] == progress_c["progressPercent"], "Progress percent must persist"
    reloaded_detail = api_get(token_a, "/roadmaps/dsa-mastery")
    assert reloaded_detail["sprints"][0]["days"][0]["status"] == "COMPLETED"
    print(">>> E2E E PASSED: Server state is reliably persistent across independent requests!")

    # E2E F: Second user isolation
    print("\n--- 7. E2E F: Verifying Strict User Isolation for User B ---")
    user_b_email = f"user_b_isolation_{int(time.time())}@verniq.io"
    token_b, user_id_b = get_or_create_user(user_b_email)
    print(f"User B authenticated. ID: {user_id_b}")
    assert user_id_b != user_id_a, "User B must have distinct ID from User A"

    progress_b = api_get(token_b, "/roadmaps/dsa-mastery/progress")
    print(f"User B progress: {progress_b}")
    assert progress_b["completedNodes"] == 0, f"User B must see 0 completed nodes, got {progress_b['completedNodes']}"
    assert progress_b["progressPercent"] == 0.0, f"User B must have 0% progress, got {progress_b['progressPercent']}"

    detail_b = api_get(token_b, "/roadmaps/dsa-mastery")
    assert detail_b["sprints"][0]["days"][0]["status"] == "AVAILABLE", "User B Day 1 must be fresh AVAILABLE"
    assert detail_b["sprints"][0]["days"][1]["status"] == "LOCKED", "User B Day 2 must remain LOCKED"

    next_prob_b = api_get(token_b, "/roadmaps/dsa-mastery/next")
    assert next_prob_b["problemId"] == "VRQ-000001", "User B's next problem must be fresh VRQ-000001"
    print(">>> E2E F PASSED: Strict User Isolation verified! User B sees zero progress and Day 2 LOCKED!")

    print("\n=================================================================")
    print("ALL PHASE G REAL END-TO-END TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    main()

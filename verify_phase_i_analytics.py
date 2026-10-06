"""
VERNIQ Phase I — Product Intelligence & Learning Analytics Verification Suite
Verifies:
1. Health & Unauthenticated access protection (401)
2. Fresh / zero-state user receiving deterministic clean state and welcome insight
3. Granular analytics endpoints (/difficulty, /topics, /companies, /trends)
4. End-to-end active user submission -> judge -> analytics derivation
5. Sample-size safety rules (e.g. EXPLORING for <3 attempts)
6. Strict multi-tenant user isolation (User B != User A)
"""
import urllib.request
import urllib.error
import json
import time
import sys
import uuid

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8080/api/v1"
AUTH_URL = "http://127.0.0.1:54321/auth/v1/token?grant_type=password"
SIGNUP_URL = "http://127.0.0.1:54321/auth/v1/signup"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

def get_token(email="candidate@verniq.io", password="VerniqPassword2026!"):
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
        sreq = urllib.request.Request(
            SIGNUP_URL,
            data=json.dumps({
                "email": email,
                "password": password,
                "data": {"full_name": "Test User", "username": email.split("@")[0]}
            }).encode("utf-8"),
            headers={"Content-Type": "application/json", "apikey": ANON_KEY}
        )
        with urllib.request.urlopen(sreq) as sresp:
            data = json.loads(sresp.read().decode("utf-8"))
            return data["access_token"], data["user"]["id"]

def api_get(endpoint, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{endpoint}", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def submit_code(token, problem_id, language, code):
    req = urllib.request.Request(
        f"{BASE_URL}/submissions",
        data=json.dumps({
            "problemId": problem_id,
            "language": language,
            "sourceCode": code
        }).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def wait_for_submission(token, sub_id, timeout=20):
    start = time.time()
    while time.time() - start < timeout:
        status, data = api_get(f"/submissions/{sub_id}", token)
        if status == 200:
            sub = data.get("data", {})
            if sub.get("status") in ("ACCEPTED", "WRONG_ANSWER", "COMPILATION_ERROR", "RUNTIME_ERROR", "INTERNAL_ERROR"):
                return sub
        time.sleep(1)
    raise TimeoutError(f"Submission {sub_id} did not finish within {timeout}s")

def run_tests():
    print("=" * 70)
    print("VERNIQ PHASE I — PRODUCT INTELLIGENCE & ANALYTICS VERIFICATION")
    print("=" * 70)

    # 1. Health Check
    print("\n[TEST 1] System Health Check")
    status, health = api_get("/health")
    assert status == 200, f"Expected 200 from /health, got {status}"
    assert health.get("status") == "UP"
    print("✓ Health status UP, API is online")

    # 2. Security: Unauthenticated access rejected
    print("\n[TEST 2] Security: Unauthenticated access to /analytics endpoints")
    status, _ = api_get("/analytics/overview")
    assert status == 401, f"Expected 401 from unauthenticated /analytics/overview, got {status}"
    status, _ = api_get("/analytics/difficulty")
    assert status == 401, f"Expected 401 from unauthenticated /analytics/difficulty, got {status}"
    status, _ = api_get("/analytics/topics")
    assert status == 401, f"Expected 401 from unauthenticated /analytics/topics, got {status}"
    status, _ = api_get("/analytics/companies")
    assert status == 401, f"Expected 401 from unauthenticated /analytics/companies, got {status}"
    status, _ = api_get("/analytics/trends")
    assert status == 401, f"Expected 401 from unauthenticated /analytics/trends, got {status}"
    print("✓ All 5 analytics endpoints strictly reject unauthenticated requests with 401")

    # 3. Clean Empty State for Fresh User
    fresh_email = f"fresh_user_{uuid.uuid4().hex[:8]}@verniq.io"
    print(f"\n[TEST 3] Fresh User Empty State ({fresh_email})")
    fresh_token, fresh_user_id = get_token(email=fresh_email)

    status, overview = api_get("/analytics/overview", fresh_token)
    assert status == 200, f"Expected 200 from /analytics/overview, got {status}"
    data = overview["data"]

    coding = data["coding"]
    assert coding["problemsSolved"] == 0, f"Expected 0 solved, got {coding['problemsSolved']}"
    assert coding["problemsAttempted"] == 0, f"Expected 0 attempted, got {coding['problemsAttempted']}"
    assert coding["problemSolveRate"] == 0.0
    assert coding["totalSubmissions"] == 0
    assert coding["acceptedSubmissions"] == 0
    assert coding["submissionAcceptanceRate"] == 0.0
    assert coding["verdictDistribution"]["accepted"] == 0

    diff = data["difficulty"]
    assert diff["totalSolved"] == 0
    assert diff["easy"]["solved"] == 0
    assert diff["medium"]["solved"] == 0
    assert diff["hard"]["solved"] == 0
    assert diff["totalCatalog"] > 0, "Catalog should have published problems"

    assert data["velocity"]["problemsSolvedLast7Days"] == 0
    assert data["velocity"]["problemsSolvedLast30Days"] == 0
    assert data["velocity"]["submissionsLast7Days"] == 0

    # Verify deterministic WELCOME insight
    insights = data["insights"]
    assert any(i["category"] == "WELCOME" for i in insights), "Fresh user should have WELCOME insight"
    print("✓ Fresh user receives exact deterministic empty state and welcoming guidance")

    # 4. User A (Candidate) with Actual Submissions and Solves
    user_a_email = "candidate@verniq.io"
    print(f"\n[TEST 4] Authenticated User A ({user_a_email}) Analytics")
    token_a, user_a_id = get_token(email=user_a_email)

    correct_java = (
        "import java.util.HashMap;\n"
        "import java.util.Map;\n"
        "class Solution {\n"
        "    public int[] twoSum(int[] nums, int target) {\n"
        "        Map<Integer, Integer> map = new HashMap<>();\n"
        "        for (int i = 0; i < nums.length; i++) {\n"
        "            int complement = target - nums[i];\n"
        "            if (map.containsKey(complement)) {\n"
        "                return new int[] { map.get(complement), i };\n"
        "            }\n"
        "            map.put(nums[i], i);\n"
        "        }\n"
        "        return new int[0];\n"
        "    }\n"
        "}"
    )
    print("Submitting correct solution to VRQ-000001...")
    res = submit_code(token_a, "VRQ-000001", "JAVA", correct_java)
    sub_id = res["data"]["submissionId"]
    sub_result = wait_for_submission(token_a, sub_id)
    print(f"Submission verdict: {sub_result.get('verdict')}")
    assert sub_result.get("verdict").upper() == "ACCEPTED"

    # Query overview for User A
    status, overview_a = api_get("/analytics/overview", token_a)
    assert status == 200
    data_a = overview_a["data"]

    assert data_a["coding"]["problemsSolved"] >= 1
    assert data_a["coding"]["problemsAttempted"] >= 1
    assert data_a["coding"]["problemSolveRate"] > 0.0
    assert data_a["coding"]["totalSubmissions"] >= 1
    assert data_a["coding"]["acceptedSubmissions"] >= 1
    assert data_a["coding"]["submissionAcceptanceRate"] > 0.0
    assert data_a["coding"]["verdictDistribution"]["accepted"] >= 1
    assert data_a["difficulty"]["totalSolved"] >= 1
    print(f"✓ User A metrics verified: {data_a['coding']['problemsSolved']} solved, {data_a['coding']['problemSolveRate']}% solve rate, {data_a['coding']['submissionAcceptanceRate']}% acceptance rate")

    # 5. Granular Endpoints Verification for User A
    print("\n[TEST 5] Testing Granular Analytics Endpoints")
    status, diff_resp = api_get("/analytics/difficulty", token_a)
    assert status == 200 and diff_resp["success"] is True
    assert diff_resp["data"]["totalSolved"] == data_a["difficulty"]["totalSolved"]

    status, topic_resp = api_get("/analytics/topics", token_a)
    print(f"DEBUG Topic Resp: status={status}, body={topic_resp}")
    assert status == 200 and topic_resp["success"] is True
    assert len(topic_resp["data"]) > 0

    status, comp_resp = api_get("/analytics/companies", token_a)
    assert status == 200 and comp_resp["success"] is True

    status, trend_resp = api_get("/analytics/trends", token_a)
    assert status == 200 and trend_resp["success"] is True
    assert len(trend_resp["data"]) == 6, "Expected 6 rolling 7-day trend points"
    # Most recent trend point should include current week's solve
    assert any(pt["solvedCount"] >= 1 for pt in trend_resp["data"]), "Recent trend point must reflect recent solve"
    print("✓ All 4 granular endpoints return consistent, accurate data")

    # 6. Sample-Size Safety Check
    print("\n[TEST 6] Sample-Size Safety Assessment Check")
    topics = topic_resp["data"]
    for t in topics:
        if t["attempted"] > 0 and t["attempted"] < 3:
            assert t["assessment"] == "EXPLORING", f"Topic {t['name']} with {t['attempted']} attempts should be EXPLORING, got {t['assessment']}"
            print(f"✓ Topic '{t['name']}' has {t['attempted']} attempts -> properly classified as EXPLORING (no false weakness)")
            break

    # 7. Multi-Tenant User Isolation
    print("\n[TEST 7] Multi-Tenant User Isolation Check")
    status, fresh_overview_again = api_get("/analytics/overview", fresh_token)
    assert status == 200
    fresh_coding = fresh_overview_again["data"]["coding"]
    assert fresh_coding["problemsSolved"] == 0, f"Isolation failure! Fresh user saw {fresh_coding['problemsSolved']} solves"
    assert fresh_coding["totalSubmissions"] == 0, f"Isolation failure! Fresh user saw {fresh_coding['totalSubmissions']} submissions"
    print("✓ Strict user isolation verified: User A's activity has zero leakage to User B")

    print("\n" + "=" * 70)
    print("ALL PHASE I ANALYTICS VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()

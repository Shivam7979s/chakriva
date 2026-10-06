import os
import json
import unittest
import urllib.request
import time

JUDGE_URL = os.getenv("JUDGE_URL", "http://127.0.0.1:8085")

class TestAllVerdicts(unittest.TestCase):
    def _execute(self, lang, code, test_cases, mode="RUN", exec_id=None):
        payload = json.dumps({
            "execution_id": exec_id or f"test-{int(time.time()*1000)}",
            "language": lang,
            "source_code": code,
            "is_custom_run": mode == "RUN",
            "test_cases": test_cases,
            "mode": mode
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{JUDGE_URL}/execute",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=20.0) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.headers.get("Connection"), "close")
            self.assertIsNotNone(resp.headers.get("Content-Length"))
            return json.loads(resp.read().decode("utf-8"))

    def test_a_java_accepted(self):
        code = '''class Solution {
    public int maxArea(int[] height) {
        int l = 0, r = height.length - 1, ans = 0;
        while (l < r) {
            ans = Math.max(ans, (r - l) * Math.min(height[l], height[r]));
            if (height[l] < height[r]) l++; else r--;
        }
        return ans;
    }
}'''
        res = self._execute("java", code, [{"input": "height = [1,8,6,2,5,4,8,3,7]", "expected_output": "49", "is_sample": True}])
        self.assertEqual(res["verdict"], "accepted")
        self.assertEqual(res["test_cases_passed"], 1)

    def test_b_java_compilation_error(self):
        code = '''class Solution {
    public int maxArea(int[] height) {
        SYNTAX_ERROR_NO_SEMI
    }
}'''
        res = self._execute("java", code, [{"input": "height = [1,2]", "expected_output": "1", "is_sample": True}])
        self.assertEqual(res["verdict"], "compilation_error")
        self.assertIn("error", res["compile_output"].lower())

    def test_c_java_wrong_answer(self):
        code = '''class Solution {
    public int maxArea(int[] height) {
        return 0; // Wrong output
    }
}'''
        res = self._execute("java", code, [{"input": "height = [1,8,6,2,5,4,8,3,7]", "expected_output": "49", "is_sample": False}])
        self.assertEqual(res["verdict"], "wrong_answer")
        self.assertEqual(res["test_cases_passed"], 0)

    def test_d_java_runtime_error(self):
        code = '''class Solution {
    public int maxArea(int[] height) {
        throw new RuntimeException("Forced runtime failure");
    }
}'''
        res = self._execute("java", code, [{"input": "height = [1,2]", "expected_output": "1", "is_sample": True}])
        self.assertEqual(res["verdict"], "runtime_error")

    def test_e_java_time_limit_exceeded(self):
        code = '''class Solution {
    public int maxArea(int[] height) {
        while (true) {}
    }
}'''
        res = self._execute("java", code, [{"input": "height = [1,2]", "expected_output": "1", "is_sample": True}])
        self.assertEqual(res["verdict"], "time_limit_exceeded")

    def test_f_submit_canonical_suite(self):
        code = '''class Solution {
    public int maxArea(int[] height) {
        int l = 0, r = height.length - 1, ans = 0;
        while (l < r) {
            ans = Math.max(ans, (r - l) * Math.min(height[l], height[r]));
            if (height[l] < height[r]) l++; else r--;
        }
        return ans;
    }
}'''
        suite = [
            {"input": "height = [1,8,6,2,5,4,8,3,7]", "expected_output": "49", "is_sample": True},
            {"input": "height = [1,1]", "expected_output": "1", "is_sample": True},
            {"input": "height = [4,3,2,1,4]", "expected_output": "16", "is_sample": False},
        ]
        res = self._execute("java", code, suite, mode="SUBMIT")
        self.assertEqual(res["verdict"], "accepted")
        self.assertEqual(res["test_cases_passed"], 3)
        self.assertEqual(res["total_test_cases"], 3)

    def test_g_cancel_in_flight(self):
        import threading
        code = '''class Solution {
    public int maxArea(int[] height) {
        while (true) {}
    }
}'''
        exec_id = f"test-cancel-{int(time.time()*1000)}"
        
        def cancel_target():
            time.sleep(0.3)
            cancel_payload = json.dumps({"execution_id": exec_id}).encode("utf-8")
            req = urllib.request.Request(
                f"{JUDGE_URL}/cancel",
                data=cancel_payload,
                headers={"Content-Type": "application/json"}
            )
            try:
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    pass
            except Exception:
                pass

        canceller = threading.Thread(target=cancel_target)
        canceller.start()

        res = self._execute("java", code, [{"input": "height = [1,2]", "expected_output": "1", "is_sample": True}], exec_id=exec_id)
        canceller.join()
        self.assertIn(res["verdict"], ["cancelled", "time_limit_exceeded"])

if __name__ == "__main__":
    unittest.main()

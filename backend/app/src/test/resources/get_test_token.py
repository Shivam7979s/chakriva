import urllib.request
import json

url = "http://127.0.0.1:54321/auth/v1/signup"
anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

payload = {
    "email": "candidate@verniq.io",
    "password": "VerniqPassword2026!",
    "data": {
        "username": "candidate_1",
        "full_name": "Test Candidate"
    }
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "apikey": anon_key
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("SIGNUP_STATUS:", resp.status)
        token = data.get("access_token")
        user = data.get("user", {})
        print("USER_ID:", user.get("id"))
        print("ACCESS_TOKEN:", token)
except urllib.error.HTTPError as e:
    err_body = e.read().decode("utf-8")
    print("HTTPError:", e.code, err_body)
    # If user already exists, sign in
    signin_url = "http://127.0.0.1:54321/auth/v1/token?grant_type=password"
    signin_payload = {
        "email": "candidate@verniq.io",
        "password": "VerniqPassword2026!"
    }
    sreq = urllib.request.Request(
        signin_url,
        data=json.dumps(signin_payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "apikey": anon_key
        }
    )
    with urllib.request.urlopen(sreq) as sresp:
        sdata = json.loads(sresp.read().decode("utf-8"))
        print("SIGNIN_STATUS:", sresp.status)
        print("USER_ID:", sdata.get("user", {}).get("id"))
        print("ACCESS_TOKEN:", sdata.get("access_token"))

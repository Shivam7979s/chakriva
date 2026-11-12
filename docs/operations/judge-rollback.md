# Production Judge Worker Rollback Runbook

**Document**: `docs/operations/judge-rollback.md`  
**Target Host**: `chakriva-judge-01` (`i-00b277624270293bf`)  
**Region**: `ap-south-1`  
**Security Standard**: AWS Systems Manager (SSM) Session / Command ONLY (Port 22 / SSH Strictly Prohibited)  
**Status**: Validated Standby Runbook  

---

## 1. Overview & Scope

This runbook documents the exact, verified procedure to roll back the production judge worker container from the optimized image (`chakriva-judge-worker:single-container-opt`) to the verified legacy baseline image (`chakriva-judge-worker:pre-opt-backup`).

> [!IMPORTANT]
> The rollback image is locally tagged and preserved on the EC2 host. Rollback requires **zero network downloads**, zero Docker image pulls, and can be executed within **< 15 seconds** via AWS SSM.

---

## 2. Preserved Rollback Artifacts

The rollback image has been tagged and verified on `chakriva-judge-01`:

- **Image Tag**: `chakriva-judge-worker:pre-opt-backup`
- **Image ID**: `b44b3993cf62`
- **Full SHA256**: `sha256:b44b3993cf62c7e3cec9530f960937768381e92ad27fa9a4b48733973da6aae5`
- **Host Location**: Local Docker daemon image store on `i-00b277624270293bf`
- **Preservation Policy**: Immutable; must NOT be pruned or deleted.

---

## 3. Rollback Criteria

Initiate this rollback procedure ONLY if any of the following critical conditions occur:
1. **Worker Crash Loops**: The optimized container exits repeatedly with non-zero exit codes (`RestartCount > 3`).
2. **Docker Socket Breakage**: The worker fails to spawn candidate sandboxes with repeated Docker permission errors.
3. **Queue Stalls**: Redis submissions accumulate in `verniq:submissions:queue` and cannot be claimed or processed.
4. **Data Corruption**: Submissions persistently fail with unhandled internal errors unrelated to user code.

---

## 4. Step-by-Step Rollback Execution via AWS SSM

### Step 4.1 — Connect via AWS SSM
Ensure the operator possesses AWS IAM permissions for `ssm:SendCommand` on instance `i-00b277624270293bf`.

Execute the rollback command block using AWS SSM `AWS-RunShellScript`.

### Step 4.2 — Execution Script (Shell Payload)

```bash
#!/bin/bash
set -e

echo "=== INITIATING CHAKRIVA JUDGE ROLLBACK ==="

# 1. Verify rollback image presence
if ! docker image inspect chakriva-judge-worker:pre-opt-backup >/dev/null 2>&1; then
    echo "CRITICAL ERROR: Rollback image chakriva-judge-worker:pre-opt-backup not found!"
    exit 1
fi
echo "Rollback image confirmed on host."

# 2. Stop the running optimized container
echo "Stopping chakriva-judge-worker container..."
docker stop chakriva-judge-worker || true

# 3. Remove the container instance (preserving images)
echo "Removing chakriva-judge-worker container instance..."
docker rm chakriva-judge-worker || true

# 4. Relaunch using the preserved rollback image with exact production configuration
echo "Starting container with rollback image..."
docker run -d \
  --name chakriva-judge-worker \
  --restart unless-stopped \
  --network host \
  --user 1000:1000 \
  --group-add 988 \
  --env-file /opt/chakriva-judge/.env \
  --shm-size 64m \
  -v /opt/chakriva-judge/tmp:/opt/chakriva-judge/tmp \
  -v /usr/bin/docker:/usr/bin/docker:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /opt/chakriva-judge/data:/opt/chakriva-judge/data \
  -v /opt/chakriva-judge/logs:/opt/chakriva-judge/logs \
  chakriva-judge-worker:pre-opt-backup

echo "=== ROLLBACK CONTAINER STARTED ==="
```

---

## 5. Post-Rollback Verification Checklist

Immediately following rollback execution, execute the following audit commands to confirm healthy restoration:

```bash
# 1. Verify container status and image
docker inspect chakriva-judge-worker --format 'Status: {{.State.Status}}, Image: {{.Config.Image}}, Restarts: {{.RestartCount}}'
# Expected: Status: running, Image: chakriva-judge-worker:pre-opt-backup, Restarts: 0

# 2. Verify startup logs
docker logs --tail 25 chakriva-judge-worker
# Expected: WORKER_READY worker_id=chakriva-judge-node-01 state=READY

# 3. Verify Redis connection and queue status
docker exec chakriva-judge-worker python3 -c '
import os, redis
r = redis.Redis(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", 6379)),
    password=os.environ.get("REDIS_PASSWORD", ""),
    socket_timeout=5
)
print("REDIS_PING:", "PONG" if r.ping() else "FAIL")
print("QUEUE_DEPTH:", r.llen("verniq:submissions:queue"))
print("ACTIVE_LEASES:", r.zcard("verniq:submissions:leases:active"))
'
# Expected: REDIS_PING: PONG, QUEUE_DEPTH: 0, ACTIVE_LEASES: 0
```

---

## 6. Security & Credential Protection

- **No Passwords or Secrets in Commands**: All environment variables and database/Redis credentials are injected exclusively via `--env-file /opt/chakriva-judge/.env`.
- **Zero Port 22 Access**: All actions are executed via AWS SSM. Port 22 remains closed in EC2 security groups.
- **Audit Logging**: All SSM commands and outputs are recorded in AWS CloudTrail and SSM command history.

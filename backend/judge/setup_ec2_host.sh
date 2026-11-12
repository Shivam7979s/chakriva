#!/usr/bin/env bash
# ==============================================================================
# Chakriva Online Judge - AWS EC2 Production Host Setup (Phase J.7.1)
# Instance: chakriva-judge-01 (t3.micro, Ubuntu 24.04 LTS x86_64)
# ==============================================================================
set -euo pipefail

BASE_DIR="/opt/chakriva-judge"
JUDGE_USER="${SUDO_USER:-$(id -un)}"
JUDGE_GROUP="${JUDGE_USER}"

echo "============================================================"
echo "Chakriva Judge Production Environment Setup"
echo "Target Base Directory: ${BASE_DIR}"
echo "Target User/Group:     ${JUDGE_USER}:${JUDGE_GROUP}"
echo "============================================================"

# Ensure script is run with sudo/root privileges
if [[ $EUID -ne 0 ]]; then
    echo "[ERROR] This setup script must be run as root (use sudo)." >&2
    exit 1
fi

# 1. Create standard production directories with conservative permissions
echo "[1/4] Creating production directory hierarchy..."
mkdir -p "${BASE_DIR}/app"
mkdir -p "${BASE_DIR}/logs"
mkdir -p "${BASE_DIR}/data"
mkdir -p "${BASE_DIR}/tmp"

# 2. Set strict directory permissions (750: owner rwx, group rx, others none)
echo "[2/4] Enforcing directory ownership and permissions..."
chown -R "${JUDGE_USER}:${JUDGE_GROUP}" "${BASE_DIR}"
chmod 750 "${BASE_DIR}"
chmod 750 "${BASE_DIR}/app"
chmod 750 "${BASE_DIR}/logs"
chmod 750 "${BASE_DIR}/data"
chmod 770 "${BASE_DIR}/tmp"

# 3. Create placeholder environment file if not already present
ENV_FILE="${BASE_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
    echo "[3/4] Creating template .env file at ${ENV_FILE}..."
    cat << 'EOF' > "${ENV_FILE}"
# Chakriva Judge Worker Production Configuration
# Managed securely outside Git repository

REDIS_URL=
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
JUDGE_QUEUE_NAME=verniq:submissions:queue

VERNIQ_JUDGE_INTERNAL_SECRET=
JUDGE_CALLBACK_URL=
SPRING_BOOT_CALLBACK_URL=

WORKER_ID=chakriva-judge-node-01
WORKER_CONCURRENCY=1
MAX_CPU_TIME_SECONDS=2.0
MAX_MEMORY_MB=256

JUDGE_DOCKER_ENABLED=true
JUDGE_DOCKER_IMAGE=verniq-judge-sandbox:latest
JUDGE_DOCKER_CPUS=1.0
JUDGE_DOCKER_MEMORY_MB=256
JUDGE_DOCKER_PIDS_LIMIT=64
JUDGE_DOCKER_USER=1000:1000
JUDGE_DOCKER_TMPFS_SIZE_MB=64

COMPILATION_CACHE_ENABLED=true
COMPILATION_CACHE_DIR=/opt/chakriva-judge/data/.cache
COMPILATION_CACHE_MAX_ENTRIES=500
EOF
    chown "${JUDGE_USER}:${JUDGE_GROUP}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    echo "  -> Template created. Permissions set to 0600 (owner-only)."
else
    echo "[3/4] Existing .env file detected at ${ENV_FILE}. Preserving contents."
    chmod 600 "${ENV_FILE}"
    chown "${JUDGE_USER}:${JUDGE_GROUP}" "${ENV_FILE}"
fi

# 4. Verify Docker group membership
echo "[4/4] Verifying Docker group membership for ${JUDGE_USER}..."
if getent group docker > /dev/null 2>&1; then
    if ! id -nG "${JUDGE_USER}" | grep -qw "docker"; then
        usermod -aG docker "${JUDGE_USER}"
        echo "  -> User ${JUDGE_USER} added to docker group."
    else
        echo "  -> User ${JUDGE_USER} already belongs to docker group."
    fi
else
    echo "[WARNING] Docker group does not exist. Ensure Docker is installed." >&2
fi

echo "============================================================"
echo "Host setup completed successfully."
echo "Directory status:"
ls -ld "${BASE_DIR}" "${BASE_DIR}/app" "${BASE_DIR}/logs" "${BASE_DIR}/data" "${BASE_DIR}/tmp" "${ENV_FILE}"
echo "============================================================"

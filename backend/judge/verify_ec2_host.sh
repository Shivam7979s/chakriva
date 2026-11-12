#!/usr/bin/env bash
# ==============================================================================
# Chakriva Online Judge - AWS EC2 Production Host Verification (Phase J.7.1)
# Instance: chakriva-judge-01 (t3.micro, Ubuntu 24.04 LTS x86_64)
# ==============================================================================
set -u

TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNED_CHECKS=0
FAILED_CHECKS=0

report_pass() {
    echo -e "  [\033[32mPASS\033[0m] $1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

report_warn() {
    echo -e "  [\033[33mWARN\033[0m] $1: $2"
    WARNED_CHECKS=$((WARNED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

report_fail() {
    echo -e "  [\033[31mFAIL\033[0m] $1: $2"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

echo "============================================================"
echo "Chakriva Judge Execution Plane Host Verification (Phase J.7.1)"
echo "Host: $(hostname -f 2>/dev/null || hostname)"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

# 1. Operating System
echo ""
echo "--- 1. Operating System & Architecture ---"
if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    source /etc/os-release
    if [[ "${ID:-}" == "ubuntu" ]] && [[ "${VERSION_ID:-}" == "24.04" ]]; then
        report_pass "OS is Ubuntu 24.04 LTS (${PRETTY_NAME})"
    else
        report_warn "OS is not Ubuntu 24.04" "Found ${PRETTY_NAME:-unknown}"
    fi
else
    report_fail "OS Release" "Cannot read /etc/os-release"
fi

ARCH=$(uname -m)
if [[ "${ARCH}" == "x86_64" ]]; then
    report_pass "Architecture is x86_64 (${ARCH})"
else
    report_fail "Architecture" "Expected x86_64, found ${ARCH}"
fi

# 2. Hardware Resources
echo ""
echo "--- 2. Compute, Memory & Storage Resources ---"
VCPUS=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 0)
if [[ "${VCPUS}" -ge 2 ]]; then
    report_pass "CPU count is ${VCPUS} vCPUs (t3.micro target: 2)"
else
    report_warn "CPU count" "Found ${VCPUS} vCPUs, expected >= 2"
fi

TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo 0)
if [[ "${TOTAL_RAM_MB}" -ge 850 ]]; then
    report_pass "Physical memory is ${TOTAL_RAM_MB} MB (~1 GiB baseline)"
else
    report_warn "Physical memory" "Found ${TOTAL_RAM_MB} MB, expected ~1024 MB"
fi

TOTAL_SWAP_MB=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}' || echo 0)
if [[ "${TOTAL_SWAP_MB}" -ge 1800 ]]; then
    report_pass "Swap space is ${TOTAL_SWAP_MB} MB (~2 GiB baseline)"
elif [[ "${TOTAL_SWAP_MB}" -gt 0 ]]; then
    report_warn "Swap space" "Found ${TOTAL_SWAP_MB} MB swap, recommended >= 2048 MB"
else
    report_fail "Swap space" "No swap configured. t3.micro requires 2 GiB swap to prevent host OOM."
fi

ROOT_FREE_KB=$(df -k / 2>/dev/null | awk 'NR==2{print $4}' || echo 0)
ROOT_FREE_GB=$((ROOT_FREE_KB / 1024 / 1024))
if [[ "${ROOT_FREE_GB}" -ge 8 ]]; then
    report_pass "Root disk has ${ROOT_FREE_GB} GiB free space"
else
    report_warn "Root disk space" "Found only ${ROOT_FREE_GB} GiB free space on /"
fi

# 3. Docker Daemon & Runtime
echo ""
echo "--- 3. Docker Daemon & Runtime Environment ---"
if command -v docker > /dev/null 2>&1; then
    DOCKER_VER=$(docker version --format '{{.Server.Version}}' 2>/dev/null || docker --version | awk '{print $3}' | tr -d ',')
    report_pass "Docker engine installed: version ${DOCKER_VER}"
else
    report_fail "Docker engine" "docker binary not found in PATH"
fi

if systemctl is-active docker > /dev/null 2>&1; then
    report_pass "Docker service is active (running)"
else
    report_fail "Docker service" "docker service is not active"
fi

if systemctl is-enabled docker > /dev/null 2>&1; then
    report_pass "Docker service is enabled on boot"
else
    report_warn "Docker service" "docker service is not enabled for auto-start"
fi

# Check Docker Compose plugin
if docker compose version > /dev/null 2>&1; then
    COMPOSE_VER=$(docker compose version --short 2>/dev/null || echo "present")
    report_pass "Docker Compose plugin available (v${COMPOSE_VER})"
else
    report_warn "Docker Compose" "Docker compose plugin not installed"
fi

# cgroup v2 verification
CGROUP_FS=$(stat -fc %T /sys/fs/cgroup/ 2>/dev/null || echo "unknown")
if [[ "${CGROUP_FS}" == "cgroup2fs" ]]; then
    report_pass "Kernel cgroup hierarchy is cgroup v2 (unified)"
else
    report_fail "cgroup version" "Found ${CGROUP_FS}, expected cgroup2fs (cgroup v2 required for pids-limit/memory)"
fi

CGROUP_DRIVER=$(docker info --format '{{.CgroupDriver}}' 2>/dev/null || echo "unknown")
if [[ "${CGROUP_DRIVER}" == "systemd" ]]; then
    report_pass "Docker cgroup driver is systemd"
else
    report_warn "Docker cgroup driver" "Found ${CGROUP_DRIVER}, recommended systemd"
fi

STORAGE_DRIVER=$(docker info --format '{{.Driver}}' 2>/dev/null || echo "unknown")
if [[ "${STORAGE_DRIVER}" == "overlay2" ]]; then
    report_pass "Docker storage driver is overlay2"
else
    report_warn "Docker storage driver" "Found ${STORAGE_DRIVER}, expected overlay2"
fi

# 4. Candidate Sandbox Image
echo ""
echo "--- 4. Candidate Execution Sandbox Image ---"
CANDIDATE_IMG="verniq-judge-sandbox:latest"
if docker image inspect "${CANDIDATE_IMG}" > /dev/null 2>&1; then
    IMG_SIZE_MB=$(docker image inspect "${CANDIDATE_IMG}" --format '{{.Size}}' 2>/dev/null | awk '{print int($1/1024/1024)}')
    report_pass "Candidate execution image present: ${CANDIDATE_IMG} (${IMG_SIZE_MB} MB)"
    
    # Non-destructive test of non-root user inside candidate container
    RUN_USER=$(docker run --rm --network none --read-only --tmpfs /tmp:rw,size=16m --cap-drop ALL "${CANDIDATE_IMG}" id -u 2>/dev/null || echo "failed")
    if [[ "${RUN_USER}" == "1000" ]]; then
        report_pass "Candidate container executes as UID 1000 (sandboxuser)"
    else
        report_fail "Candidate user" "Expected UID 1000, got ${RUN_USER}"
    fi

    # Non-destructive test of air-gapping inside candidate container
    NET_STATUS=$(docker run --rm --network none --read-only --tmpfs /tmp:rw,size=16m --cap-drop ALL "${CANDIDATE_IMG}" ip link show 2>/dev/null | grep -c "eth0" || echo 0)
    if [[ "${NET_STATUS}" -eq 0 ]]; then
        report_pass "Candidate container air-gapping verified (no eth0 interface)"
    else
        report_fail "Air-gapping" "Found network interface eth0 in --network none container"
    fi
else
    report_warn "Candidate image" "${CANDIDATE_IMG} not found locally (will build during deployment step)"
fi

# 5. Production Directories & Permissions
echo ""
echo "--- 5. Production Directories & Security Permissions ---"
BASE_DIR="/opt/chakriva-judge"
for dir in "${BASE_DIR}" "${BASE_DIR}/app" "${BASE_DIR}/logs" "${BASE_DIR}/data" "${BASE_DIR}/tmp"; do
    if [[ -d "${dir}" ]]; then
        DIR_PERMS=$(stat -c %a "${dir}" 2>/dev/null || echo "unknown")
        # Ensure world cannot write
        WORLD_WRITE=$(echo "${DIR_PERMS}" | awk '{print substr($0,3,1)}')
        if [[ "${WORLD_WRITE}" =~ [0-3] ]]; then
            report_pass "Directory ${dir} exists with safe permissions (${DIR_PERMS})"
        else
            report_warn "Directory ${dir}" "World-writable permissions detected (${DIR_PERMS})"
        fi
    else
        report_warn "Directory missing" "${dir} does not exist (run setup_ec2_host.sh)"
    fi
done

ENV_FILE="${BASE_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
    ENV_PERMS=$(stat -c %a "${ENV_FILE}" 2>/dev/null || echo "unknown")
    if [[ "${ENV_PERMS}" == "600" || "${ENV_PERMS}" == "400" ]]; then
        report_pass "Environment secret file ${ENV_FILE} has strict permissions (${ENV_PERMS})"
    else
        report_warn "Secret file permissions" "${ENV_FILE} has permissions ${ENV_PERMS} (should be 0600)"
    fi
else
    report_warn "Secret file missing" "${ENV_FILE} does not exist yet"
fi

# 6. Network Exposure & Listening Ports
echo ""
echo "--- 6. Host Network Exposure & Security Audit ---"
# Check if Docker TCP socket is mistakenly exposed
if ss -tulpn 2>/dev/null | grep -E "(:2375|:2376)" | grep -v "127.0.0.1" > /dev/null 2>&1; then
    report_fail "Docker API Exposure" "Docker TCP socket (2375/2376) is publicly exposed!"
else
    report_pass "Docker daemon TCP socket is not exposed to public network"
fi

# Check if judge internal HTTP endpoints are publicly bound
if ss -tulpn 2>/dev/null | grep ":8085" | grep "0.0.0.0" > /dev/null 2>&1; then
    report_warn "Judge HTTP port" "Port 8085 is bound to 0.0.0.0 (should bind to 127.0.0.1)"
else
    report_pass "Judge HTTP port 8085 is not bound to public 0.0.0.0"
fi

# Check Redis port 6379 exposure
if ss -tulpn 2>/dev/null | grep ":6379" | grep "0.0.0.0" > /dev/null 2>&1; then
    report_warn "Redis exposure" "Port 6379 is bound to 0.0.0.0 (Redis should not be publicly accessible)"
else
    report_pass "Redis port 6379 is not bound to public 0.0.0.0"
fi

# 7. Summary
echo ""
echo "============================================================"
echo "Verification Summary:"
echo "  Total Checks:  ${TOTAL_CHECKS}"
echo -e "  Passed:        \033[32m${PASSED_CHECKS}\033[0m"
echo -e "  Warnings:      \033[33m${WARNED_CHECKS}\033[0m"
echo -e "  Failures:      \033[31m${FAILED_CHECKS}\033[0m"
echo "============================================================"

if [[ "${FAILED_CHECKS}" -eq 0 ]]; then
    echo -e "Overall Assessment: \033[32mREADY FOR PHASE J.7.2 DEPLOYMENT\033[0m"
    exit 0
else
    echo -e "Overall Assessment: \033[31mBLOCKED (Resolve failures before deployment)\033[0m"
    exit 1
fi

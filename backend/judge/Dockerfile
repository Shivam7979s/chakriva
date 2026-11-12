# ==============================================================================
# CHAKRIVA Online Judge — Worker & Sandbox Container
# Languages: GCC 14 (C++20), OpenJDK 21, Python 3.12,
#            Node.js 20/tsx, Go 1.22
# ==============================================================================

FROM ubuntu:24.04

# Prevent interactive debconf prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# ------------------------------------------------------------------------------
# Install core development toolchains
# ------------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc-14 \
    g++-14 \
    openjdk-21-jdk-headless \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    golang-go \
    curl \
    git \
    ca-certificates \
    && update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 100 \
    && update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-14 100 \
    && npm install -g tsx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------------------------
# Create isolated non-root worker/sandbox user
# ------------------------------------------------------------------------------
RUN useradd -m -s /bin/bash sandboxuser

# ------------------------------------------------------------------------------
# Application directory
# ------------------------------------------------------------------------------
WORKDIR /app

# ------------------------------------------------------------------------------
# Install Python dependencies
# ------------------------------------------------------------------------------
COPY requirements.txt .

RUN pip3 install \
    --no-cache-dir \
    -r requirements.txt \
    --break-system-packages

# ------------------------------------------------------------------------------
# Copy judge worker source
# ------------------------------------------------------------------------------
COPY . .

# ------------------------------------------------------------------------------
# Prepare writable application cache BEFORE dropping privileges
#
# The worker's CompilationCache creates /app/.cache at startup.
# sandboxuser must own /app so the worker can create/use its cache
# without running as root.
# ------------------------------------------------------------------------------
RUN mkdir -p /app/.cache \
    && chown -R sandboxuser:sandboxuser /app

# ------------------------------------------------------------------------------
# Drop privileges
# ------------------------------------------------------------------------------
USER sandboxuser

# ------------------------------------------------------------------------------
# Start worker
# ------------------------------------------------------------------------------
CMD ["python3", "-m", "src.worker"]
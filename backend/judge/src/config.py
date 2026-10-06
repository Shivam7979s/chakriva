import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field

# Ensure .env variables are loaded into environment
for _env_path in [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent.parent / ".env"
]:
    if _env_path.exists():
        try:
            with open(_env_path, "r", encoding="utf-8") as _f:
                for _line in _f:
                    _line = _line.strip()
                    if _line and not _line.startswith("#") and "=" in _line:
                        _k, _v = _line.split("=", 1)
                        _k = _k.strip()
                        _v = _v.strip().strip("'").strip('"')
                        if _k and _k not in os.environ:
                            os.environ[_k] = _v
        except Exception:
            pass

class JudgeConfig(BaseModel):
    supabase_url: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
    )
    supabase_service_role_key: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    supabase_anon_key: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_ANON_KEY", "")
    )
    poll_interval_seconds: float = Field(
        default_factory=lambda: float(os.getenv("POLL_INTERVAL_SECONDS", "1.0"))
    )
    max_cpu_time_seconds: float = Field(
        default_factory=lambda: float(os.getenv("MAX_CPU_TIME_SECONDS", "2.0"))
    )
    max_memory_mb: int = Field(
        default_factory=lambda: int(os.getenv("MAX_MEMORY_MB", "256"))
    )
    worker_id: str = Field(
        default_factory=lambda: os.getenv("WORKER_ID", "judge-worker-1")
    )
    worker_concurrency: int = Field(
        default_factory=lambda: int(os.getenv("WORKER_CONCURRENCY", "1"))
    )
    docker_enabled: bool = Field(
        default_factory=lambda: os.getenv("JUDGE_DOCKER_ENABLED", "true").lower() in ("true", "1")
    )
    docker_image: str = Field(
        default_factory=lambda: os.getenv("JUDGE_DOCKER_IMAGE", "verniq-judge-sandbox:latest")
    )
    docker_cpus: float = Field(
        default_factory=lambda: float(os.getenv("JUDGE_DOCKER_CPUS", "1.0"))
    )
    docker_memory_mb: int = Field(
        default_factory=lambda: int(os.getenv("JUDGE_DOCKER_MEMORY_MB", "256"))
    )
    docker_pids_limit: int = Field(
        default_factory=lambda: int(os.getenv("JUDGE_DOCKER_PIDS_LIMIT", "64"))
    )
    docker_user: str = Field(
        default_factory=lambda: os.getenv("JUDGE_DOCKER_USER", "1000:1000")
    )
    docker_tmpfs_size_mb: int = Field(
        default_factory=lambda: int(os.getenv("JUDGE_DOCKER_TMPFS_SIZE_MB", "64"))
    )
    docker_output_limit_bytes: int = Field(
        default_factory=lambda: int(os.getenv("JUDGE_DOCKER_OUTPUT_LIMIT_BYTES", str(1024 * 1024)))
    )
    cache_enabled: bool = Field(
        default_factory=lambda: os.getenv("COMPILATION_CACHE_ENABLED", "true").lower() in ("true", "1")
    )
    cache_dir: str = Field(
        default_factory=lambda: os.getenv(
            "COMPILATION_CACHE_DIR",
            str(Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / ".cache")
        )
    )
    cache_max_entries: int = Field(
        default_factory=lambda: int(os.getenv("COMPILATION_CACHE_MAX_ENTRIES", "500"))
    )
    http_host: str = Field(
        default_factory=lambda: os.getenv("JUDGE_HTTP_HOST", "127.0.0.1")
    )
    http_port: int = Field(
        default_factory=lambda: int(os.getenv("JUDGE_HTTP_PORT", "8085"))
    )
    redis_url: Optional[str] = Field(
        default_factory=lambda: os.getenv("REDIS_URL")
    )
    redis_host: str = Field(
        default_factory=lambda: os.getenv("REDIS_HOST", "localhost")
    )
    redis_port: int = Field(
        default_factory=lambda: int(os.getenv("REDIS_PORT", "6379"))
    )
    redis_db: int = Field(
        default_factory=lambda: int(os.getenv("REDIS_DB", "0"))
    )
    redis_password: Optional[str] = Field(
        default_factory=lambda: os.getenv("REDIS_PASSWORD")
    )
    redis_queue_name: str = Field(
        default_factory=lambda: (os.getenv("JUDGE_QUEUE_NAME") or os.getenv("REDIS_QUEUE_NAME") or "verniq:submissions:queue").strip()
    )
    redis_socket_timeout: float = Field(
        default_factory=lambda: float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
    )
    redis_connect_timeout: float = Field(
        default_factory=lambda: float(os.getenv("REDIS_CONNECT_TIMEOUT", "5.0"))
    )
    blpop_timeout: int = Field(
        default_factory=lambda: int(os.getenv("BLPOP_TIMEOUT", "2"))
    )
    redis_backoff_initial: float = Field(
        default_factory=lambda: float(os.getenv("REDIS_BACKOFF_INITIAL", "1.0"))
    )
    redis_backoff_max: float = Field(
        default_factory=lambda: float(os.getenv("REDIS_BACKOFF_MAX", "10.0"))
    )
    judge_callback_url: Optional[str] = Field(
        default_factory=lambda: (os.getenv("JUDGE_CALLBACK_URL") or "").strip() or None
    )
    spring_boot_callback_url: Optional[str] = Field(
        default_factory=lambda: (os.getenv("SPRING_BOOT_CALLBACK_URL") or os.getenv("JUDGE_CALLBACK_URL") or "").strip() or None
    )
    judge_internal_secret: str = Field(
        default_factory=lambda: (os.getenv("VERNIQ_JUDGE_INTERNAL_SECRET") or os.getenv("INTERNAL_API_SECRET") or "").strip()
    )
    internal_api_secret: str = Field(
        default_factory=lambda: (os.getenv("VERNIQ_JUDGE_INTERNAL_SECRET") or os.getenv("INTERNAL_API_SECRET") or "").strip()
    )

config = JudgeConfig()


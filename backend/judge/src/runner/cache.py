"""Deterministic, secure compilation cache for compiled languages."""
import hashlib
import json
import logging
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger("judge-cache")

_compiler_version_cache: Dict[str, str] = {}
_cache_lock = threading.Lock()

def get_compiler_version(language: str) -> str:
    """Returns the cached compiler version string for a given language."""
    lang = language.lower().strip()
    if lang in _compiler_version_cache:
        return _compiler_version_cache[lang]

    version_str = "unknown"
    try:
        if lang in ("cpp", "c++"):
            res = subprocess.run(["g++", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2.0)
            if res.returncode == 0:
                version_str = res.stdout.splitlines()[0].strip()
        elif lang == "java":
            res = subprocess.run(["javac", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2.0)
            output = res.stdout or res.stderr
            if output:
                version_str = output.splitlines()[0].strip()
        elif lang in ("python", "py", "python3"):
            res = subprocess.run(["python", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2.0)
            output = res.stdout or res.stderr
            if output:
                version_str = output.splitlines()[0].strip()
        elif lang in ("typescript", "ts"):
            res = subprocess.run(["node", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2.0)
            if res.returncode == 0:
                version_str = res.stdout.splitlines()[0].strip()
    except Exception as err:
        logger.debug(f"Could not determine compiler version for {lang}: {err}")

    _compiler_version_cache[lang] = version_str
    return version_str


class CompilationCache:
    """Manages cached compilation artifacts with LRU eviction and filesystem isolation."""

    def __init__(self, cache_dir: str, max_entries: int = 500, enabled: bool = True):
        self.cache_dir = Path(cache_dir)
        self.max_entries = max_entries
        self.enabled = enabled
        self._access_times: Dict[str, float] = {}

        if self.enabled:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            self._warm_index()

    def _warm_index(self):
        """Index existing entries on startup."""
        try:
            for entry in self.cache_dir.iterdir():
                if entry.is_dir():
                    meta_file = entry / "meta.json"
                    if meta_file.exists():
                        try:
                            with open(meta_file, "r", encoding="utf-8") as f:
                                meta = json.load(f)
                            self._access_times[entry.name] = meta.get("last_accessed", time.time())
                        except Exception:
                            self._access_times[entry.name] = time.time()
        except Exception as err:
            logger.warning(f"Error warming cache index: {err}")

    def compute_key(self, language: str, source_code: str, compiler_flags: Optional[List[str]] = None, env_tag: str = "") -> str:
        """Computes a cryptographic SHA-256 cache key deterministically."""
        compiler_version = get_compiler_version(language)
        flags_str = " ".join(compiler_flags or [])
        raw = f"{language.lower().strip()}::{env_tag}::{compiler_version}::{flags_str}::{source_code.strip()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, key: str, destination_dir: str) -> Optional[List[str]]:
        """
        Retrieves compiled artifacts and copies them into the isolated destination directory.
        Returns list of copied filenames, or None if cache miss.
        """
        if not self.enabled:
            return None

        entry_dir = self.cache_dir / key
        meta_file = entry_dir / "meta.json"

        with _cache_lock:
            if not entry_dir.is_dir() or not meta_file.exists():
                return None

            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                files = meta.get("files", [])
                copied = []

                for fname in files:
                    src = entry_dir / fname
                    dst = Path(destination_dir) / fname
                    if src.exists():
                        shutil.copy2(src, dst)
                        copied.append(fname)

                if len(copied) == len(files):
                    self._access_times[key] = time.time()
                    return copied
                return None
            except Exception as err:
                logger.warning(f"Cache read error for key {key}: {err}")
                return None

    def put(self, key: str, source_dir: str, artifact_filenames: List[str], language: str):
        """Saves compiled artifacts from the temporary source directory into cache."""
        if not self.enabled or not artifact_filenames:
            return

        with _cache_lock:
            entry_dir = self.cache_dir / key
            try:
                entry_dir.mkdir(parents=True, exist_ok=True)
                saved_files = []

                for fname in artifact_filenames:
                    src = Path(source_dir) / fname
                    dst = entry_dir / fname
                    if src.exists():
                        shutil.copy2(src, dst)
                        saved_files.append(fname)

                meta = {
                    "key": key,
                    "language": language,
                    "files": saved_files,
                    "created_at": time.time(),
                    "last_accessed": time.time(),
                }
                with open(entry_dir / "meta.json", "w", encoding="utf-8") as f:
                    json.dump(meta, f)

                self._access_times[key] = time.time()
                self._prune_if_needed()
            except Exception as err:
                logger.warning(f"Cache write error for key {key}: {err}")

    def _prune_if_needed(self):
        """Evicts oldest entries when cache exceeds max capacity."""
        if len(self._access_times) <= self.max_entries:
            return

        # Sort by access time ascending
        sorted_keys = sorted(self._access_times.items(), key=lambda x: x[1])
        excess = len(self._access_times) - self.max_entries

        for key, _ in sorted_keys[:excess]:
            entry_dir = self.cache_dir / key
            try:
                if entry_dir.exists():
                    shutil.rmtree(entry_dir, ignore_errors=True)
                self._access_times.pop(key, None)
            except Exception:
                pass

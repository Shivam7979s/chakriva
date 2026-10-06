"""Language compilation and execution profiles."""
import shutil
import sys
from typing import List, Optional
from pydantic import BaseModel

class LanguageProfile(BaseModel):
    name: str
    source_filename: str
    compile_cmd: Optional[List[str]] = None
    run_cmd: List[str]
    time_limit_multiplier: float = 1.0

def get_language_profile(language: str) -> LanguageProfile:
    lang = language.lower().strip()
    is_windows = sys.platform == "win32"

    if lang in ("cpp", "c++"):
        binary_name = "solution.exe" if is_windows else "./solution"
        return LanguageProfile(
            name="cpp",
            source_filename="Solution.cpp",
            compile_cmd=["g++", "-O2", "-std=c++17", "Solution.cpp", "-o", "solution"],
            run_cmd=[binary_name],
            time_limit_multiplier=1.0,
        )

    elif lang == "java":
        return LanguageProfile(
            name="java",
            source_filename="Main.java",
            compile_cmd=["javac", "Main.java"],
            run_cmd=["java", "-XX:+TieredCompilation", "-XX:TieredStopAtLevel=1", "-Xmx256m", "-Xss64m", "-cp", ".", "Main"],
            time_limit_multiplier=1.5,
        )

    elif lang in ("python", "py", "python3"):
        python_bin = "python" if is_windows or not shutil.which("python3") else "python3"
        return LanguageProfile(
            name="python",
            source_filename="solution.py",
            compile_cmd=None,
            run_cmd=[python_bin, "-u", "solution.py"],
            time_limit_multiplier=2.0,
        )

    elif lang in ("typescript", "ts"):
        node_bin = shutil.which("node") or "node"
        return LanguageProfile(
            name="typescript",
            source_filename="solution.ts",
            compile_cmd=None,
            run_cmd=[node_bin, "--experimental-strip-types", "solution.ts"],
            time_limit_multiplier=1.5,
        )

    elif lang == "go":
        binary_name = "solution.exe" if is_windows else "./solution"
        return LanguageProfile(
            name="go",
            source_filename="main.go",
            compile_cmd=["go", "build", "-o", "solution.exe" if is_windows else "solution", "main.go"],
            run_cmd=[binary_name],
            time_limit_multiplier=1.5,
        )

    else:
        raise ValueError(f"Unsupported programming language: {language}")

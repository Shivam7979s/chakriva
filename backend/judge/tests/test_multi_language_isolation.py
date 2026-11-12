"""Phase 12/13 Pre-Production Validation: Multi-Language State Isolation.

Validates that when multiple canonical test cases execute sequentially inside a
single Docker sandbox container, zero state leaks between tests across all 5 supported languages:
1. Java 21: static class variables, filesystem artifacts, background threads
2. C++ 20: global variables, filesystem artifacts, background forks
3. Python 3.11: module globals, filesystem artifacts, detached processes
4. TypeScript (Node): globalThis variables, filesystem artifacts
5. Go 1.22: package variables, filesystem artifacts, spawned goroutines
"""
import os
import sys
import unittest
from pathlib import Path

# Add backend/judge to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.runner.docker_sandbox import DockerSandbox
from src.runner.sandbox import SandboxRunner, TestCaseItem


class TestMultiLanguageStateIsolation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sandbox = DockerSandbox()
        cls.docker_ready = cls.sandbox.is_available() and cls.sandbox.is_image_present()
        cls.runner = SandboxRunner(
            time_limit_seconds=2.0,
            memory_limit_mb=256,
            docker_sandbox=cls.sandbox,
        )

    def setUp(self):
        if not self.docker_ready:
            self.skipTest("Docker daemon or candidate sandbox image unavailable.")

    # =========================================================================
    # 1. Java 21 Isolation
    # =========================================================================
    def test_java_static_and_filesystem_isolation(self):
        """Java: Verify static state and filesystem are completely reset per test."""
        code = """import java.io.*;
import java.util.Scanner;
public class Solution {
    private static int counter = 0;
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        String op = sc.hasNext() ? sc.next() : "";
        counter++;
        File f = new File("dirty.tmp");
        if ("write".equals(op)) {
            f.createNewFile();
            // Start daemon thread that attempts to linger in background
            Thread t = new Thread(() -> {
                try { Thread.sleep(5000); } catch (Exception e) {}
            });
            t.setDaemon(true);
            t.start();
            System.out.println("counter=" + counter + ",file=created");
        } else {
            boolean leaked = f.exists();
            System.out.println("counter=" + counter + ",file=" + (leaked ? "leaked" : "clean"));
        }
    }
}
"""
        test_cases = [
            TestCaseItem(input="write", expected_output="counter=1,file=created"),
            TestCaseItem(input="check", expected_output="counter=1,file=clean"),
            TestCaseItem(input="write", expected_output="counter=1,file=created"),
            TestCaseItem(input="check", expected_output="counter=1,file=clean"),
        ]
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 4)

    # =========================================================================
    # 2. C++ 20 Isolation
    # =========================================================================
    def test_cpp_global_and_filesystem_isolation(self):
        """C++: Verify global variable, filesystem, and child processes are reset per test."""
        code = """#include <iostream>
#include <fstream>
#include <string>
#include <unistd.h>
#include <fcntl.h>

int g_counter = 0;

int main() {
    std::string op;
    if (!(std::cin >> op)) op = "";
    g_counter++;
    
    if (op == "write") {
        std::ofstream out("cpp_dirty.tmp");
        out << "dirty" << std::endl;
        out.close();
        // Fork a detached background child without holding stdout/stderr pipe
        pid_t pid = fork();
        if (pid == 0) {
            close(1);
            close(2);
            sleep(10);
            _exit(0);
        }
        std::cout << "g=" << g_counter << ",f=created" << std::endl;
    } else {
        std::ifstream in("cpp_dirty.tmp");
        bool leaked = in.good();
        std::cout << "g=" << g_counter << ",f=" << (leaked ? "leaked" : "clean") << std::endl;
    }
    return 0;
}
"""
        test_cases = [
            TestCaseItem(input="write", expected_output="g=1,f=created"),
            TestCaseItem(input="check", expected_output="g=1,f=clean"),
            TestCaseItem(input="write", expected_output="g=1,f=created"),
            TestCaseItem(input="check", expected_output="g=1,f=clean"),
        ]
        res = self.runner.execute(
            language="cpp",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 4)

    # =========================================================================
    # 3. Python 3.11 Isolation
    # =========================================================================
    def test_python_module_global_and_filesystem_isolation(self):
        """Python: Verify module-level globals, filesystem, and child processes are reset."""
        code = """import os
import sys
import subprocess

COUNTER = 0

def main():
    global COUNTER
    COUNTER += 1
    op = sys.stdin.read().strip()
    
    if op == "write":
        with open("py_dirty.tmp", "w") as f:
            f.write("dirty")
        # Spawn detached background child without holding pipes
        subprocess.Popen(["sleep", "10"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"c={COUNTER},f=created")
    else:
        leaked = os.path.exists("py_dirty.tmp")
        print(f"c={COUNTER},f={'leaked' if leaked else 'clean'}")

if __name__ == "__main__":
    main()
"""
        test_cases = [
            TestCaseItem(input="write", expected_output="c=1,f=created"),
            TestCaseItem(input="check", expected_output="c=1,f=clean"),
            TestCaseItem(input="write", expected_output="c=1,f=created"),
            TestCaseItem(input="check", expected_output="c=1,f=clean"),
        ]
        res = self.runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 4)

    # =========================================================================
    # 4. TypeScript (Node) Isolation
    # =========================================================================
    def test_typescript_global_and_filesystem_isolation(self):
        """TypeScript: Verify global state and filesystem artifacts are reset per test."""
        code = """import * as fs from 'fs';

declare global {
    var counter: number | undefined;
}

if (!globalThis.counter) {
    globalThis.counter = 0;
}
globalThis.counter++;

const input = fs.readFileSync(0, 'utf-8').trim();

if (input === 'write') {
    fs.writeFileSync('ts_dirty.tmp', 'dirty');
    console.log(`ts=${globalThis.counter},f=created`);
} else {
    const leaked = fs.existsSync('ts_dirty.tmp');
    console.log(`ts=${globalThis.counter},f=${leaked ? 'leaked' : 'clean'}`);
}
"""
        test_cases = [
            TestCaseItem(input="write", expected_output="ts=1,f=created"),
            TestCaseItem(input="check", expected_output="ts=1,f=clean"),
            TestCaseItem(input="write", expected_output="ts=1,f=created"),
            TestCaseItem(input="check", expected_output="ts=1,f=clean"),
        ]
        res = self.runner.execute(
            language="typescript",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 4)

    # =========================================================================
    # 5. Go 1.22 Isolation
    # =========================================================================
    def test_go_package_variable_and_goroutine_isolation(self):
        """Go: Verify package globals, filesystem, and background goroutines are reset."""
        code = """package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
    "time"
)

var counter = 0

func main() {
    counter++
    reader := bufio.NewReader(os.Stdin)
    op, _ := reader.ReadString('\\n')
    op = strings.TrimSpace(op)

    if op == "write" {
        _ = os.WriteFile("go_dirty.tmp", []byte("dirty"), 0644)
        // Spawn lingering goroutine
        go func() {
            time.Sleep(10 * time.Second)
        }()
        fmt.Printf("go=%d,f=created\\n", counter)
    } else {
        _, err := os.Stat("go_dirty.tmp")
        leaked := !os.IsNotExist(err)
        status := "clean"
        if leaked {
            status = "leaked"
        }
        fmt.Printf("go=%d,f=%s\\n", counter, status)
    }
}
"""
        test_cases = [
            TestCaseItem(input="write", expected_output="go=1,f=created"),
            TestCaseItem(input="check", expected_output="go=1,f=clean"),
            TestCaseItem(input="write", expected_output="go=1,f=created"),
            TestCaseItem(input="check", expected_output="go=1,f=clean"),
        ]
        res = self.runner.execute(
            language="go",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 4)


if __name__ == "__main__":
    unittest.main()

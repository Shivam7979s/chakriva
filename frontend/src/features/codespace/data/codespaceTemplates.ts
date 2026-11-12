export interface LanguageSpec {
  id: 'java' | 'cpp' | 'python' | 'typescript' | 'go';
  label: string;
  shortLabel: string;
  ext: string;
  runtimeLabel: string;
  badgeClass: string;
  dotClass: string;
  defaultTemplate: string;
}

export const CODESPACE_LANGUAGES: Record<LanguageSpec['id'], LanguageSpec> = {
  java: {
    id: 'java',
    label: 'Java (OpenJDK 21)',
    shortLabel: 'Java 21',
    ext: 'java',
    runtimeLabel: 'OpenJDK 21',
    badgeClass: 'text-[#FBBF24] bg-[#241A08] border-[#422F0F]',
    dotClass: 'bg-[#F59E0B]',
    defaultTemplate: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("Hello, Chakriva CodeSpace (Java 21)!");

        if (scanner.hasNextLine()) {
            System.out.println("Input received: " + scanner.nextLine());
        }
    }
}`,
  },
  cpp: {
    id: 'cpp',
    label: 'C++ (GCC 14)',
    shortLabel: 'C++ 14',
    ext: 'cpp',
    runtimeLabel: 'GCC 14 (-O2)',
    badgeClass: 'text-[#60A5FA] bg-[#131F3A] border-[#243B6B]',
    dotClass: 'bg-[#3B82F6]',
    defaultTemplate: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    cout << "Hello, Chakriva CodeSpace (GCC 14)!\\n";

    string inputLine;
    if (getline(cin, inputLine)) {
        cout << "Input received: " << inputLine << "\\n";
    }
    return 0;
}`,
  },
  python: {
    id: 'python',
    label: 'Python 3.12',
    shortLabel: 'Python 3.12',
    ext: 'py',
    runtimeLabel: 'CPython 3.12',
    badgeClass: 'text-[#00B8A3] bg-[#0B2421] border-[#15423D]',
    dotClass: 'bg-[#00B8A3]',
    defaultTemplate: `import sys

def main():
    print("Hello, Chakriva CodeSpace (Python 3.12)!")

    input_data = sys.stdin.read().strip()
    if input_data:
        print(f"Input received:\\n{input_data}")

if __name__ == "__main__":
    main()`,
  },
  typescript: {
    id: 'typescript',
    label: 'TypeScript 5.7',
    shortLabel: 'TS 5.7',
    ext: 'ts',
    runtimeLabel: 'Node TS 5.7',
    badgeClass: 'text-[#38BDF8] bg-[#0D2133] border-[#1A3B59]',
    dotClass: 'bg-[#38BDF8]',
    defaultTemplate: `function solve(input: string): void {
    console.log("Hello, Chakriva CodeSpace (TypeScript)!");
    if (input.trim()) {
        const lines = input.trim().split("\\n");
        console.log(\`Processed \${lines.length} lines of input.\`);
        lines.forEach((l, i) => console.log(\`[\${i + 1}] \${l}\`));
    }
}

const stdinInput = "Sample Test Input";
solve(stdinInput);`,
  },
  go: {
    id: 'go',
    label: 'Go 1.23',
    shortLabel: 'Go 1.23',
    ext: 'go',
    runtimeLabel: 'Go 1.23',
    badgeClass: 'text-[#2DD4BF] bg-[#0B2223] border-[#143F40]',
    dotClass: 'bg-[#2DD4BF]',
    defaultTemplate: `package main

import (
\t"bufio"
\t"fmt"
\t"os"
)

func main() {
\tfmt.Println("Hello, Chakriva CodeSpace (Go 1.23)!")
\tscanner := bufio.NewScanner(os.Stdin)
\tif scanner.Scan() {
\t\tfmt.Printf("Input received: %s\\n", scanner.Text())
\t}
}`,
  },
};

export interface QuickStarterTemplate {
  id: string;
  title: string;
  description: string;
  language: LanguageSpec['id'];
  tags: string[];
  stdin: string;
  code: string;
}

export const QUICK_STARTER_TEMPLATES: QuickStarterTemplate[] = [
  {
    id: 'fast-io-cpp',
    title: 'Fast I/O Harness',
    description: 'Untied cin/cout buffer with test-case loop ready for contests.',
    language: 'cpp',
    tags: ['fast-io', 'cp', 'harness'],
    stdin: '2\n4 9\n1 2 3 4',
    code: `#include <iostream>
#include <vector>
using namespace std;

void solve() {
    int n;
    long long target;
    if (!(cin >> n >> target)) return;
    vector<long long> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];
    cout << "n=" << n << ", target=" << target << "\\n";
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t = 1;
    if (cin >> t) {
        while (t--) solve();
    }
    return 0;
}`,
  },
  {
    id: 'binary-search-predicate',
    title: 'Monotonic Binary Search',
    description: 'Clean lower-bound invariant template on answer space [lo, hi].',
    language: 'java',
    tags: ['binary-search', 'predicate'],
    stdin: '1 2 4 8 16',
    code: `import java.util.*;

public class Main {
    static boolean feasible(long mid) {
        return mid * mid >= 50;
    }

    public static void main(String[] args) {
        long lo = 0, hi = 1_000_000_000L, ans = hi;
        while (lo <= hi) {
            long mid = lo + ((hi - lo) >>> 1);
            if (feasible(mid)) {
                ans = mid;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        System.out.println("Minimum feasible value: " + ans);
    }
}`,
  },
  {
    id: 'bfs-shortest-path',
    title: 'BFS Level-Order Traversal',
    description: 'Unweighted shortest-path queue skeleton with visited guard.',
    language: 'python',
    tags: ['graphs', 'bfs', 'shortest-path'],
    stdin: '4 3\n0 1\n1 2\n2 3',
    code: `from collections import deque, defaultdict
import sys

def bfs_distances(n: int, edges: list[tuple[int, int]], start: int = 0) -> list[int]:
    adj = defaultdict(list)
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)

    dist = [-1] * n
    dist[start] = 0
    q = deque([start])

    while q:
        node = q.popleft()
        for nxt in adj[node]:
            if dist[nxt] == -1:
                dist[nxt] = dist[node] + 1
                q.append(nxt)
    return dist

if __name__ == "__main__":
    tokens = sys.stdin.read().split()
    if tokens:
        n, m = int(tokens[0]), int(tokens[1])
        edges = [(int(tokens[2 + 2 * i]), int(tokens[3 + 2 * i])) for i in range(m)]
        print("Distances:", bfs_distances(n, edges))`,
  },
];

export function getLanguageSpec(lang: string): LanguageSpec {
  const key = (lang || '').toLowerCase() as LanguageSpec['id'];
  return (
    CODESPACE_LANGUAGES[key] || {
      id: 'java',
      label: lang.toUpperCase(),
      shortLabel: lang.toUpperCase(),
      ext: 'txt',
      runtimeLabel: lang.toUpperCase(),
      badgeClass: 'text-[#94A1B8] bg-[#141A29] border-[#212B42]',
      dotClass: 'bg-[#7C8BA6]',
      defaultTemplate: '',
    }
  );
}


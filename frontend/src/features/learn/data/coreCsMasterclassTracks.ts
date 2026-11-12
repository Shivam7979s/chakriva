import type { LearnTrack } from '../types/learn';

export const CORE_CS_AND_MASTERCLASS_TRACKS: LearnTrack[] = [
  // =========================================================================
  // SYSTEM DESIGN TAB (?open=system-design)
  // =========================================================================
  {
    id: 'track-oop',
    slug: 'oop',
    subjectId: 'oop',
    category: 'system_design',
    sectionLabel: 'In-Depth Learning',
    iconKey: 'oop',
    title: 'OOP: Dispatch, Interfaces & Concurrency Safety',
    shortTitle: 'OOP',
    subtitle:
      'Contrast static overloading vs runtime vtable dispatch, composition over inheritance, and thread-safe immutable objects.',
    levelBadge: 'Design Core · Language Runtime',
    totalMinutes: 60,
    prerequisites: ['Classes & Interfaces'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'oop-dispatch-contracts',
        slug: 'polymorphism-vtable-liskov',
        moduleTitle: 'Module 1 · Polymorphism & Runtime Dispatch',
        title: 'Polymorphism, Virtual Dispatch & Interface Contracts',
        summary:
          'Reason about compile-time overload resolution vs runtime dynamic vtable lookup.',
        estimatedMinutes: 30,
        difficulty: 'foundation',
        keyInvariant:
          'Method overloading resolves at compile time from static variable types; overriding resolves at runtime from the concrete heap object vtable.',
        mentalModel:
          'Use inheritance only for genuine behavioral IS-A subtypes; prefer small interfaces + composition for HAS-A capabilities.',
        sections: [
          {
            heading: 'Vtable Lookup Cost & Devirtualization',
            body: 'Virtual calls add one pointer dereference via the object vptr, which modern JITs (JVM/V8) inline speculatively when monomorphic.',
          },
        ],
        linkedTopics: ['OOP Concepts'],
      },
      {
        id: 'oop-immutability-threads',
        slug: 'immutability-composition-thread-safety',
        moduleTitle: 'Module 2 · State Safety & Concurrency',
        title: 'Immutability, Composition & Thread Safety',
        summary:
          'Eliminate race conditions structurally with final fields, defensive copies, and narrow lock scopes.',
        estimatedMinutes: 30,
        difficulty: 'intermediate',
        keyInvariant:
          'An object is thread-safe by construction if its state is immutable after constructor completion and its `this` reference never escapes mid-construction.',
        mentalModel:
          'Shared mutable state is the root of concurrency bugs; make domain value objects immutable whenever practical.',
        sections: [
          {
            heading: 'Defensive Copying at Boundaries',
            body: 'Never return raw references to internal mutable Lists or Maps from getters—return unmodifiable views or copies.',
          },
        ],
        linkedTopics: ['OOP Concepts'],
      },
    ],
  },
  {
    id: 'track-system-design',
    slug: 'system-design',
    subjectId: 'system_design',
    category: 'system_design',
    sectionLabel: 'In-Depth Learning',
    iconKey: 'lld',
    title: 'Low-Level & High-Level System Design',
    shortTitle: 'LLD & HLD Architecture',
    subtitle:
      'Design extensible object models, consistent hash rings, replication quorums, distributed rate limiters, and cache eviction trade-offs.',
    levelBadge: 'LLD + HLD Architecture',
    totalMinutes: 135,
    prerequisites: ['HTTP & Relational Databases', 'Concurrency Basics'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'sd-lld-solid-strategy',
        slug: 'lld-solid-strategy-composition',
        moduleTitle: 'Module 1 · Low-Level Design (LLD)',
        title: 'LLD Foundations: SOLID, Composition & Strategy Patterns',
        summary:
          'Replace brittle switch-case monoliths with clean interface contracts and composable strategies.',
        estimatedMinutes: 40,
        difficulty: 'foundation',
        keyInvariant:
          'Depend on behavior interfaces, not concrete subclasses; compose interchangeable policies at runtime rather than multiplying inheritance trees.',
        mentalModel:
          'If adding one new pricing rule or payment gateway forces edits across five switch statements, extract a Strategy interface.',
        sections: [
          {
            heading: 'High-Leverage LLD Design Principles',
            body: 'Interviewers evaluate whether your classes survive requirement changes cleanly.',
            bullets: [
              'Single Responsibility: separate state storage from transport formatting and validation rules.',
              'Open/Closed via Strategy: inject eviction policies (LRU, LFU, TTL) behind a shared `EvictionPolicy<K>` contract.',
              'Liskov Substitution: never throw `UnsupportedOperationException` on inherited methods.',
            ],
          },
        ],
        pitfalls: [
          'Over-engineering abstract factories when two clean constructor-injected dependencies suffice.',
          'Mutable shared state across singleton strategy instances under concurrent requests.',
        ],
        microCheck: {
          prompt: 'Which pattern cleanly lets a Cache class switch between LRU and LFU eviction without modifying Cache core lookup logic?',
          options: ['Singleton', 'Strategy Pattern (interface injection)', 'Deep multi-level inheritance'],
          correctIndex: 1,
          explanation: 'Strategy encapsulates the eviction policy behind a small interface (`onAccess(key)`, `evict()`).',
        },
        linkedTopics: ['System Design (LLD)'],
      },
      {
        id: 'sd-consistent-hashing',
        slug: 'hld-consistent-hashing-sharding',
        moduleTitle: 'Module 2 · Distributed Partitioning & Quorums',
        title: 'Consistent Hashing, Virtual Nodes & Replication Quorums',
        summary:
          'Partition petabyte datasets horizontally while minimizing key movement during node scale-ups and failures.',
        estimatedMinutes: 50,
        difficulty: 'intermediate',
        keyInvariant:
          'Adding or removing 1 node out of N moves only ~1/N keys on a consistent hash ring—unlike modulo hashing which reshuffles ~(N-1)/N keys.',
        mentalModel:
          'Map both servers (with virtual nodes) and keys onto a [0, 2^32) clock face; every key walks clockwise to the first physical node.',
        sections: [
          {
            heading: 'Virtual Nodes & Balanced Variance',
            body: 'Assigning 100–200 virtual node tokens per server smooths shard distribution variance below 5% and accelerates failover rebalance.',
          },
          {
            heading: 'Dynamo-Style Quorum Math (W + R > N)',
            body: 'When replicating across N nodes, requiring write acks W + read responses R > N guarantees the read set overlaps the latest write node.',
          },
        ],
        interactiveTrace: {
          title: 'Cluster Ring Simulation: Adding Node D to {A, B, C}',
          subtitle: 'Compare modulo hashing vs consistent hashing on 1,000,000 cache keys.',
          steps: [
            {
              stepNumber: 1,
              title: 'Modulo hash(k) % 3 -> hash(k) % 4',
              stateSummary: '75%+ of keys map to new buckets -> massive cache stampede against DB.',
              highlights: [
                { label: 'Keys Remapped', value: '~750,000 (75%)', tone: 'amber' },
                { label: 'DB Load Spike', value: 'Critical Cache Stampede', tone: 'amber' },
              ],
              pointerNote: 'Naive modulo fails horizontally elastic caches.',
            },
            {
              stepNumber: 2,
              title: 'Consistent Ring + 150 vnodes per server',
              stateSummary: 'Only keys immediately counter-clockwise of Node D virtual tokens migrate.',
              highlights: [
                { label: 'Keys Remapped', value: '~250,000 (1/4)', tone: 'teal' },
                { label: 'Skew Variance', value: '< 4% across shards', tone: 'sapphire' },
              ],
              pointerNote: 'Other unaffected shards keep 100% cache hit ratio.',
            },
          ],
        },
        microCheck: {
          prompt: 'With replication factor N=5 and write quorum W=3, what minimum R guarantees reading the newest acknowledged write?',
          options: ['R = 2', 'R = 3', 'R = 5'],
          correctIndex: 1,
          explanation: 'Pigeonhole principle requires W + R > N -> 3 + R > 5 -> R = 3 overlaps at least one up-to-date replica.',
        },
        linkedProblemSlugs: ['lru-cache'],
        linkedTopics: ['System Design (HLD)'],
      },
      {
        id: 'sd-rate-limiter-caching',
        slug: 'rate-limiter-cache-eviction',
        moduleTitle: 'Module 3 · Traffic Shaping & Edge Caching',
        title: 'Rate Limiters & Cache Eviction Policies',
        summary:
          'Compare Token Bucket, Leaky Bucket, Sliding Window Log/Counter, and Cache-Aside vs Write-Through consistency.',
        estimatedMinutes: 45,
        difficulty: 'intermediate',
        keyInvariant:
          'Token Bucket permits controlled bursts up to bucket capacity; Sliding Window Log eliminates fixed-boundary 2x burst spikes.',
        mentalModel:
          'Distributed rate limiting runs atomic Lua scripts inside Redis (`INCR` + `EXPIRE` or token refill math) at the API Gateway edge.',
        sections: [
          {
            heading: 'Cache Invalidation Patterns',
            body: 'Choose Cache-Aside for read-heavy workloads where stale reads can be tolerated via TTLs; use Write-Through + single-flight coalescing when stampede protection is critical.',
          },
        ],
        linkedProblemSlugs: ['lru-cache'],
        linkedTopics: ['System Design (HLD)'],
      },
    ],
  },

  // =========================================================================
  // DATA & SQL TAB (?open=data-sql)
  // =========================================================================
  {
    id: 'track-sql',
    slug: 'sql',
    subjectId: 'sql',
    category: 'data_sql',
    sectionLabel: 'In-Depth Learning',
    iconKey: 'sql',
    title: 'SQL: Basic to Production Engineering',
    shortTitle: 'SQL Production Engineering',
    subtitle:
      'Master window functions (RANK, DENSE_RANK, ROW_NUMBER), recursive CTEs, NULL join traps, and sargable index predicates.',
    levelBadge: 'Data Engineering · Full Track',
    totalMinutes: 65,
    prerequisites: ['Basic SELECT / GROUP BY'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'sql-window-ctes',
        slug: 'window-functions-ctes',
        moduleTitle: 'Module 1 · Analytical Window Functions & CTEs',
        title: 'Window Functions & Recursive CTEs',
        summary:
          'Compute Top-N per group, running totals, and hierarchical queries cleanly without correlated subquery N^2 scans.',
        estimatedMinutes: 35,
        difficulty: 'foundation',
        keyInvariant:
          'Window functions evaluate AFTER `WHERE` and `GROUP BY`, preserving row grain while computing partitions via `OVER (PARTITION BY ... ORDER BY ...)`.',
        mentalModel:
          '`ROW_NUMBER()` gives strict 1,2,3; `RANK()` leaves gaps on ties (1,1,3); `DENSE_RANK()` skips no ranks (1,1,2).',
        sections: [
          {
            heading: 'SQL Execution Order Cheat Sheet',
            body: 'FROM / JOIN -> WHERE -> GROUP BY -> HAVING -> WINDOW -> SELECT -> DISTINCT -> ORDER BY -> LIMIT.',
          },
        ],
        linkedTopics: ['SQL Queries'],
      },
      {
        id: 'sql-joins-nulls',
        slug: 'join-strategies-null-traps',
        moduleTitle: 'Module 2 · Join Pitfalls & Index Sargability',
        title: 'Join Semantics, NULL Propagation & Index Sargability',
        summary:
          'Avoid silently turning LEFT JOINs into INNER JOINs and stop `NOT IN (NULL)` bugs.',
        estimatedMinutes: 30,
        difficulty: 'intermediate',
        keyInvariant:
          'Putting right-table filters in `WHERE` after a `LEFT JOIN` drops unmatched NULL rows—place outer-table filters inside the `ON` clause.',
        mentalModel:
          'Write `WHERE created_at >= "2026-01-01"` instead of `WHERE YEAR(created_at) = 2026` so B+ Tree indexes stay usable.',
        sections: [
          {
            heading: 'Why NOT IN Fails on NULLs',
            body: '`x NOT IN (1, NULL)` evaluates to `UNKNOWN` for every row. Always prefer `NOT EXISTS`.',
          },
        ],
        linkedTopics: ['SQL Queries'],
      },
    ],
  },
  {
    id: 'track-sql-75',
    slug: 'sql-75-interview-revision',
    category: 'data_sql',
    sectionLabel: 'Interview Revision',
    iconKey: 'sql',
    title: 'SQL High-Yield Interview Patterns',
    shortTitle: 'SQL High-Yield',
    subtitle:
      'Curated query patterns asked in backend and data interviews: Second highest salary, gap-and-island streaks, and self-join hierarchies.',
    levelBadge: 'Interview Prep · Quick Revision',
    totalMinutes: 45,
    prerequisites: ['Joins & Aggregations'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'sql-rev-top-n',
        slug: 'top-n-gaps-islands-patterns',
        moduleTitle: 'Module 1 · Top-N & Gaps-and-Islands',
        title: 'Top-N Per Category & Gaps-and-Islands Streaks',
        summary: 'Use `DENSE_RANK()` for N-th highest ties and `row_id - ROW_NUMBER()` to group consecutive days.',
        estimatedMinutes: 25,
        difficulty: 'intermediate',
        keyInvariant: 'Subtracting a dense contiguous `ROW_NUMBER()` from a contiguous sequence turns consecutive runs into identical constant keys.',
        mentalModel: 'Any consecutive sequence `date - ROW_NUMBER()` stays constant across uninterrupted streaks.',
        sections: [
          {
            heading: 'Second Highest Without NULL Edge Failures',
            body: 'Wrap scalar `SELECT DISTINCT salary ... LIMIT 1 OFFSET 1` inside an outer `SELECT (...) AS SecondHighestSalary` so empty results return NULL cleanly.',
          },
        ],
        linkedTopics: ['SQL Queries'],
      },
      {
        id: 'sql-rev-self-joins',
        slug: 'self-joins-running-totals',
        moduleTitle: 'Module 2 · Running Aggregates & Pivots',
        title: 'Running Totals & Conditional Aggregation Pivots',
        summary: 'Replace multiple table scans with `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`.',
        estimatedMinutes: 20,
        difficulty: 'foundation',
        keyInvariant: 'Conditional aggregation computes multiple cohort metrics in a single sequential/index pass.',
        mentalModel: '`COUNT(CASE WHEN status = "failed" THEN 1 END)` ignores NULLs automatically.',
        sections: [
          {
            heading: 'COUNT(*) vs COUNT(col)',
            body: '`COUNT(*)` counts every row including NULLs; `COUNT(col)` skips rows where `col IS NULL`.',
          },
        ],
        linkedTopics: ['SQL Queries'],
      },
    ],
  },

  // =========================================================================
  // SYSTEMS LABS TAB (?open=systems-labs)
  // =========================================================================
  {
    id: 'track-database-internals-rust',
    slug: 'database-internals-rust',
    category: 'systems_labs',
    sectionLabel: 'Systems Architecture Tracks',
    iconKey: 'rust',
    title: 'Database Internals from First Principles',
    shortTitle: 'DB Storage Engine',
    subtitle:
      'Build an ACID-compliant B+ Tree storage engine in Rust with slotted pages, Write-Ahead Logging (WAL), and MVCC.',
    levelBadge: 'Systems Lab · Rust',
    totalMinutes: 140,
    prerequisites: ['Memory Models & Pointers', 'File I/O'],
    environmentLabel: 'Rust 1.78 Cargo Architecture',
    isJudgeBacked: false,
    lessons: [
      {
        id: 'mc-db-slotted-pages',
        slug: 'slotted-pages-buffer-pool',
        moduleTitle: 'Module 1 · On-Disk Slotted Pages & Buffer Pool',
        title: 'Slotted Page Layouts & Buffer Pool Pinning',
        summary:
          'Organize variable-length tuples inside fixed 4KB/8KB disk pages and coordinate dirty-page eviction cleanly.',
        estimatedMinutes: 70,
        difficulty: 'advanced',
        keyInvariant:
          'Slot directory grows downward from page header while tuple payloads grow upward from page end—preserving external Slot IDs across compaction.',
        mentalModel:
          'Pin buffer frames with atomic `pin_count > 0` before any read/write so Clock eviction never steals an active page.',
        sections: [
          {
            heading: 'Pin Counts & Clock Eviction',
            body: 'Only frames with `pin_count == 0` are eviction candidates; dirty frames must flush corresponding WAL LSNs (`wal_flush_lsn >= page_lsn`) before hitting disk.',
          },
        ],
      },
      {
        id: 'mc-db-wal-aries',
        slug: 'wal-aries-recovery',
        moduleTitle: 'Module 2 · Crash Recovery (WAL & ARIES)',
        title: 'Write-Ahead Logging (WAL) & ARIES Crash Recovery',
        summary:
          'Guarantee Atomicity & Durability across abrupt power loss using Analysis, Redo, and Undo phases.',
        estimatedMinutes: 70,
        difficulty: 'advanced',
        keyInvariant:
          'WAL Rule: A dirty page may NEVER be flushed to disk until every log record up to `pageLSN` is fsynced to stable storage.',
        mentalModel:
          'Redo repeats history forward from `RecLSN`; Undo rolls back uncommitted losers backward using `prevLSN` chains.',
        sections: [
          {
            heading: 'Three Passes of ARIES',
            body: '1) Analysis finds Dirty Page Table & active txns; 2) Redo replays idempotently; 3) Undo writes CLRs so repeated crashes never undo twice.',
          },
        ],
      },
    ],
  },
  {
    id: 'track-distributed-raft',
    slug: 'distributed-consensus-raft',
    category: 'systems_labs',
    sectionLabel: 'Systems Architecture Tracks',
    iconKey: 'raft',
    title: 'Distributed Consensus: Raft & Paxos',
    shortTitle: 'Raft Consensus',
    subtitle:
      'Implement a replicated state machine in Go with randomized election timers, AppendEntries log consistency, and snapshot compaction.',
    levelBadge: 'Systems Lab · Distributed',
    totalMinutes: 120,
    prerequisites: ['Concurrency & Network RPCs'],
    environmentLabel: 'Go 1.23 Fault Injection Labs',
    isJudgeBacked: false,
    lessons: [
      {
        id: 'mc-raft-leader-election',
        slug: 'raft-terms-leader-election',
        moduleTitle: 'Module 1 · Leader Election & Safety',
        title: 'Randomized Terms & Split-Vote Prevention',
        summary:
          'Elect at most one leader per term even under asymmetric network partitions.',
        estimatedMinutes: 60,
        difficulty: 'advanced',
        keyInvariant:
          'Each server votes for at most ONE candidate per term on persistent storage (`votedFor`) and rejects candidates with older logs.',
        mentalModel:
          'Terms act as logical clocks; any node discovering a higher term immediately reverts to Follower.',
        sections: [
          {
            heading: 'Log Up-to-Date Comparison',
            body: 'Compare `(lastLogTerm, lastLogIndex)` lexicographically: higher last term wins; ties break on longer log length.',
          },
        ],
      },
      {
        id: 'mc-raft-log-replication',
        slug: 'raft-log-replication-compaction',
        moduleTitle: 'Module 2 · Log Replication & Snapshots',
        title: 'Log Replication, Commit Index & Snapshotting',
        summary:
          'Advance `commitIndex` safely on majority ACKs while truncating divergent follower suffixes.',
        estimatedMinutes: 60,
        difficulty: 'advanced',
        keyInvariant:
          'A leader NEVER marks entries from prior terms committed merely by counting replicas—only current-term entries commit via majority.',
        mentalModel:
          'AppendEntries acts as both heartbeat and inductive proof (`prevLogIndex`, `prevLogTerm`) that follower prefix matches leader.',
        sections: [
          {
            heading: 'Installing Snapshots for Lagging Followers',
            body: 'When a follower falls behind the compacted log base, ship `InstallSnapshot` chunks atomically.',
          },
        ],
      },
    ],
  },
  {
    id: 'track-go-grpc',
    slug: 'go-grpc-microservices',
    category: 'systems_labs',
    sectionLabel: 'Systems Architecture Tracks',
    iconKey: 'grpc',
    title: 'High-Throughput Microservices in Go & gRPC',
    shortTitle: 'Go & gRPC Services',
    subtitle:
      'Architect production backends with HTTP/2 stream multiplexing, Protobuf wire framing, bounded worker pools, and circuit breakers.',
    levelBadge: 'Systems Lab · Backend',
    totalMinutes: 95,
    prerequisites: ['HTTP/2 & Thread Pooling'],
    environmentLabel: 'Go 1.23 / Protobuf v3',
    isJudgeBacked: false,
    lessons: [
      {
        id: 'mc-grpc-multiplexing',
        slug: 'protobuf-http2-backpressure',
        moduleTitle: 'Module 1 · Wire Framing & Deadlines',
        title: 'Protobuf Wire Framing, Deadlines & Flow Control',
        summary:
          'Propagate `context.Context` deadlines across RPC hops to stop cascading timeout storms.',
        estimatedMinutes: 50,
        difficulty: 'intermediate',
        keyInvariant:
          'Every outbound RPC MUST carry a bounded deadline shorter than or equal to its remaining parent context budget.',
        mentalModel:
          'HTTP/2 multiplexes concurrent gRPC frames over one persistent TCP connection.',
        sections: [
          {
            heading: 'Circuit Breakers & Hedged Requests',
            body: 'Trip circuit breakers after rolling 5xx error thresholds so failing downstreams recover.',
          },
        ],
      },
      {
        id: 'mc-grpc-telemetry',
        slug: 'circuit-breakers-opentelemetry',
        moduleTitle: 'Module 2 · Resilience & Telemetry',
        title: 'Graceful Shutdown, Rate Limiting & OpenTelemetry Spans',
        summary:
          'Drain in-flight gRPC streams cleanly on SIGTERM and correlate p99 tail latency with distributed trace IDs.',
        estimatedMinutes: 45,
        difficulty: 'intermediate',
        keyInvariant:
          'Stop accepting new readiness probes (`NOT_SERVING`) BEFORE calling `GracefulStop()` so orchestrators drain traffic cleanly.',
        mentalModel:
          'Trace context headers (`traceparent`) follow requests across queues, caches, and databases.',
        sections: [
          {
            heading: 'Zero-Downtime Rollout Checklist',
            body: 'PreStop hook -> readiness probe failure -> `GracefulStop()` drain with hard timeout fallback.',
          },
        ],
      },
    ],
  },
  {
    id: 'track-compiler-llvm',
    slug: 'compiler-llvm-ir',
    category: 'systems_labs',
    sectionLabel: 'Systems Architecture Tracks',
    iconKey: 'llvm',
    title: 'Compiler Construction: Lexing to LLVM IR',
    shortTitle: 'Compilers & LLVM',
    subtitle:
      'Build a statically-typed language frontend with recursive-descent Pratt parsing, Hindley-Milner type checking, and SSA IR lowering.',
    levelBadge: 'Systems Lab · Compilers',
    totalMinutes: 110,
    prerequisites: ['Context-Free Grammars & ASTs'],
    environmentLabel: 'LLVM 18 / Clang C++ Toolchain',
    isJudgeBacked: false,
    lessons: [
      {
        id: 'mc-compiler-pratt',
        slug: 'pratt-parsing-ast-typing',
        moduleTitle: 'Module 1 · Parsing & Type Checking',
        title: 'Pratt Expression Parsing & Scoped Type Inference',
        summary:
          'Handle operator precedence & associativity cleanly without tangled grammar stratification.',
        estimatedMinutes: 55,
        difficulty: 'advanced',
        keyInvariant:
          'Each token carries a left/right binding power; recursive Pratt descent parses arbitrarily nested binary expressions in linear O(tokens) time.',
        mentalModel:
          'Use lexical symbol-table scopes (stack of hash maps) to enforce shadow-safe binding resolution.',
        sections: [
          {
            heading: 'Error Recovery Without Cascading Panic',
            body: 'Synchronize at statement boundaries (`;`, `}`) so one missing token does not emit false syntax errors.',
          },
        ],
      },
      {
        id: 'mc-compiler-ssa',
        slug: 'ssa-cfg-llvm-lowering',
        moduleTitle: 'Module 2 · SSA IR & Optimization',
        title: 'SSA Form, Basic Blocks & LLVM IR Codegen',
        summary:
          'Lower control flow graphs (`if/while`) into static single assignment virtual registers with `alloca` + `mem2reg`.',
        estimatedMinutes: 55,
        difficulty: 'advanced',
        keyInvariant:
          'In SSA form every virtual register is assigned exactly once, simplifying constant propagation and dead-code elimination.',
        mentalModel:
          'Emit stack `alloca` slots during initial AST walk for local variables and let `mem2reg` promote them to SSA phi nodes.',
        sections: [
          {
            heading: 'Terminator Invariant on Every Basic Block',
            body: 'Every LLVM BasicBlock must end with an explicit control terminator (`br`, `cond_br`, `ret`).',
          },
        ],
      },
    ],
  },
];

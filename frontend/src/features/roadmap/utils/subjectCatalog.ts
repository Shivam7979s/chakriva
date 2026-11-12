/**
 * CHAKRIVA Preparation Subject Catalog
 * ====================================
 * Defines supported preparation tracks and honestly distinguishes
 * Judge-Verified coding tracks (DSA) from structured concept/study tracks
 * where CHAKRIVA does not yet host an execution judge.
 */

import type { SubjectId, SubjectProficiency } from '../types/adaptive';

export interface SubjectModuleSpec {
  title: string;
  topic: string;
  estimatedMinutes: number;
  summary: string;
}

export interface PreparationSubjectMeta {
  id: SubjectId;
  label: string;
  shortLabel: string;
  category: 'coding' | 'core_cs' | 'architecture' | 'aptitude';
  description: string;
  isJudgeBacked: boolean;
  availabilityNote: string;
  estimatedAdditionalHours: number;
  modules: SubjectModuleSpec[];
}

export const PREPARATION_SUBJECTS: PreparationSubjectMeta[] = [
  {
    id: 'dsa',
    label: 'DSA & Algorithms',
    shortLabel: 'DSA',
    category: 'coding',
    description: 'Problem-solving patterns, prerequisite graphs, and execution-verified coding problems.',
    isJudgeBacked: true,
    availabilityNote: 'Backed by canonical VRQ problem catalog & CHAKRIVA container judge.',
    estimatedAdditionalHours: 0,
    modules: [],
  },
  {
    id: 'system_design',
    label: 'System Design (LLD & HLD)',
    shortLabel: 'System Design',
    category: 'architecture',
    description: 'Concurrency primitives, caching/LRU mechanics, load balancing, partitioning, and scalable schemas.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as structured architecture reading & design review sessions (no automated judge yet).',
    estimatedAdditionalHours: 12,
    modules: [
      {
        title: 'LLD Concept: SOLID, Composition & Strategy Patterns',
        topic: 'System Design (LLD)',
        estimatedMinutes: 30,
        summary: 'Design extensible class hierarchies and decouple state transitions cleanly in interviews.',
      },
      {
        title: 'HLD Concept: Consistent Hashing, Sharding & Replication',
        topic: 'System Design (HLD)',
        estimatedMinutes: 35,
        summary: 'Understand virtual nodes, leader-follower trade-offs, and read/write quorum guarantees.',
      },
      {
        title: 'Design Review: Rate Limiter & Cache Eviction Trade-offs',
        topic: 'System Design (HLD)',
        estimatedMinutes: 30,
        summary: 'Compare token bucket vs sliding window log and cache-aside vs write-through policies.',
      },
    ],
  },
  {
    id: 'oop',
    label: 'Object-Oriented Programming (OOP)',
    shortLabel: 'OOP',
    category: 'core_cs',
    description: 'Encapsulation, polymorphism, virtual dispatch, memory model, and concurrency safety.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as structured concept study & oral interview drill sessions.',
    estimatedAdditionalHours: 5,
    modules: [
      {
        title: 'OOP Concept: Polymorphism, Dispatch & Interface Contracts',
        topic: 'OOP Concepts',
        estimatedMinutes: 25,
        summary: 'Contrast compile-time overloading vs runtime vtable dispatch and Liskov substitution.',
      },
      {
        title: 'OOP Review: Immutability, Composition & Thread Safety',
        topic: 'OOP Concepts',
        estimatedMinutes: 25,
        summary: 'Identify shared-state invariants and prefer composition over fragile inheritance.',
      },
    ],
  },
  {
    id: 'dbms',
    label: 'Database Management (DBMS)',
    shortLabel: 'DBMS',
    category: 'core_cs',
    description: 'ACID transactions, B+ Tree indexes, isolation anomalies, normalization, and MVCC.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as structured concept study & query indexing review sessions.',
    estimatedAdditionalHours: 6,
    modules: [
      {
        title: 'DBMS Concept: B+ Tree Indexing & Query Execution Plans',
        topic: 'DBMS Internals',
        estimatedMinutes: 30,
        summary: 'Trace clustered vs secondary index lookups and avoid full-table sequential scans.',
      },
      {
        title: 'DBMS Review: ACID, Isolation Levels & Lock Contention',
        topic: 'DBMS Internals',
        estimatedMinutes: 25,
        summary: 'Differentiate dirty reads, non-repeatable reads, phantom reads, and snapshot isolation.',
      },
    ],
  },
  {
    id: 'os',
    label: 'Operating Systems (OS)',
    shortLabel: 'OS',
    category: 'core_cs',
    description: 'Processes vs threads, CPU scheduling, virtual memory paging, deadlocks, and mutexes.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as structured OS systems concept study.',
    estimatedAdditionalHours: 6,
    modules: [
      {
        title: 'OS Concept: Virtual Memory, TLB & Page Replacement',
        topic: 'Operating Systems',
        estimatedMinutes: 30,
        summary: 'Follow multi-level page table translation, TLB hit/miss cost, and LRU page fault handling.',
      },
      {
        title: 'OS Review: Deadlock Coffman Conditions & Synchronization',
        topic: 'Operating Systems',
        estimatedMinutes: 25,
        summary: 'Prevent circular wait and verify producer-consumer invariants with mutexes and condition vars.',
      },
    ],
  },
  {
    id: 'cn',
    label: 'Computer Networks (CN)',
    shortLabel: 'CN',
    category: 'core_cs',
    description: 'TCP handshake/congestion control, HTTP/2 & HTTP/3, DNS resolution, TLS, and CDN routing.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as structured networking protocol study.',
    estimatedAdditionalHours: 5,
    modules: [
      {
        title: 'CN Concept: TCP State Machine, Flow & Congestion Control',
        topic: 'Computer Networks',
        estimatedMinutes: 25,
        summary: 'Explain 3-way handshake, AIMD congestion window backoff, and TIME_WAIT semantics.',
      },
      {
        title: 'CN Review: DNS, TLS Handshake & HTTP Lifecycle',
        topic: 'Computer Networks',
        estimatedMinutes: 25,
        summary: 'Trace end-to-end latency from recursive DNS lookup through TLS 1.3 and reverse proxy.',
      },
    ],
  },
  {
    id: 'sql',
    label: 'SQL & Relational Queries',
    shortLabel: 'SQL',
    category: 'core_cs',
    description: 'Joins, window functions, CTEs, query aggregation, and relational schema design.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as structured query pattern & schema drills (automated SQL judge not yet active).',
    estimatedAdditionalHours: 5,
    modules: [
      {
        title: 'SQL Concept: Window Functions (RANK, ROW_NUMBER) & CTEs',
        topic: 'SQL Queries',
        estimatedMinutes: 30,
        summary: 'Write top-N-per-group queries cleanly with PARTITION BY and recursive CTEs.',
      },
      {
        title: 'SQL Review: Join Strategies & Aggregation Edge Cases',
        topic: 'SQL Queries',
        estimatedMinutes: 25,
        summary: 'Handle NULL propagation in LEFT JOIN vs WHERE filters and HAVING clauses.',
      },
    ],
  },
  {
    id: 'cs_fundamentals',
    label: 'CS Fundamentals Bundle',
    shortLabel: 'CS Core',
    category: 'core_cs',
    description: 'Rapid revision across core OOP, DBMS, OS, and Computer Networks interview questions.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as condensed core CS interview revision sessions.',
    estimatedAdditionalHours: 8,
    modules: [
      {
        title: 'CS Core Revision: Memory, Processes & Synchronization',
        topic: 'CS Fundamentals',
        estimatedMinutes: 30,
        summary: 'Consolidate high-frequency campus & product SDE theory checkpoints.',
      },
    ],
  },
  {
    id: 'aptitude',
    label: 'Quantitative & Logical Aptitude',
    shortLabel: 'Aptitude',
    category: 'aptitude',
    description: 'Probability, combinatorics, permutations, puzzles, and OA speed drills.',
    isJudgeBacked: false,
    availabilityNote: 'Scheduled as structured online-assessment probability & logic drills.',
    estimatedAdditionalHours: 5,
    modules: [
      {
        title: 'Aptitude Drill: Combinatorics, Probability & Expectation',
        topic: 'Quantitative Aptitude',
        estimatedMinutes: 25,
        summary: 'Practice conditional probability and counting invariants common in OA screenings.',
      },
    ],
  },
];

export function getSubjectMeta(id: SubjectId): PreparationSubjectMeta | undefined {
  return PREPARATION_SUBJECTS.find((s) => s.id === id);
}

export function getSubjectProficiencyMultiplier(prof?: SubjectProficiency): number {
  switch (prof) {
    case 'advanced':
      return 0.45;
    case 'intermediate':
      return 0.75;
    case 'beginner':
      return 1.1;
    case 'not_started':
    default:
      return 1.0;
  }
}


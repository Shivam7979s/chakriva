import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data/Card';
import { Badge } from '@/components/ui/data/Badge';
import { Button } from '@/components/ui/actions/Button';
import {
  Layers,
  Clock,
  ArrowRight,
  Compass,
} from 'lucide-react';

interface MasterclassTrack {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  modules: number;
  duration: string;
  topics: string[];
  sandboxEnv: string;
}

export const LearnView: React.FC = () => {
  const masterclasses: MasterclassTrack[] = [
    {
      id: 'course-1',
      title: 'Database Internals from First Principles',
      subtitle: 'Build an ACID-compliant B+ Tree storage engine in Rust with write-ahead logging (WAL) and MVCC.',
      level: 'Advanced Systems',
      modules: 12,
      duration: '36 hours',
      topics: ['B+ Trees', 'WAL & ARIES', 'Buffer Pool', 'MVCC Isolation'],
      sandboxEnv: 'Rust 1.78 Cargo Toolchain',
    },
    {
      id: 'course-2',
      title: 'Distributed Consensus: Raft & Paxos',
      subtitle: 'Implement a distributed key-value store with leader election, log replication, snapshotting, and fault injection testing.',
      level: 'Distributed Systems',
      modules: 8,
      duration: '24 hours',
      topics: ['Leader Election', 'Log Compaction', 'Network Partitions', 'Jepsen Tests'],
      sandboxEnv: 'Go 1.23 Sandbox',
    },
    {
      id: 'course-3',
      title: 'High-Throughput Microservices in Go & gRPC',
      subtitle: 'Production design patterns for connection pooling, streaming protobufs, rate limiting, and zero-downtime rolling updates.',
      level: 'Backend Architecture',
      modules: 10,
      duration: '28 hours',
      topics: ['Protobuf v3', 'gRPC Streams', 'Circuit Breakers', 'OpenTelemetry'],
      sandboxEnv: 'Go 1.23 / Protobuf v3',
    },
    {
      id: 'course-4',
      title: 'Compiler Construction: Lexing to LLVM IR',
      subtitle: 'Design a statically-typed language frontend with recursive descent parsing, AST semantic analysis, and LLVM code generation.',
      level: 'Systems & Compilers',
      modules: 14,
      duration: '42 hours',
      topics: ['Lexical Analysis', 'Type Inference', 'CFG Optimization', 'LLVM Target'],
      sandboxEnv: 'LLVM 18 / Clang Toolchain',
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Learn' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                Foundational Curriculum
              </span>
              <span className="text-xs font-mono text-neutral-400">
                Rigorous Systems & Algorithmic Concepts
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Learn & Engineering Masterclasses
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              Deep conceptual curricula combining algorithmic invariant proofs with real-world systems architecture, compilers, and distributed consensus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/roadmap">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Compass className="w-4 h-4 text-emerald-400" />}
                className="text-xs"
              >
                Adaptive Roadmap
              </Button>
            </Link>
          </div>
        </div>

        {/* Masterclasses Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-300 font-semibold">
            Systems Architecture Tracks
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {masterclasses.map((course) => (
              <Card
                key={course.id}
                className="bg-[#0F121A] border-white/[0.08] hover:border-white/[0.18] transition-all flex flex-col justify-between"
              >
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      {course.level}
                    </Badge>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {course.modules} modules
                      </span>
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-base text-white font-bold">{course.title}</CardTitle>
                    <CardDescription className="text-xs text-neutral-400 leading-relaxed mt-1">
                      {course.subtitle}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {course.topics.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.03] border border-white/[0.06] text-neutral-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-mono flex items-center justify-between">
                    <span className="text-neutral-500">ENVIRONMENT</span>
                    <span className="text-sky-400 font-semibold">{course.sandboxEnv}</span>
                  </div>

                  <div className="pt-2">
                    <Link to="/courses">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs justify-center"
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        View Syllabus & Masterclass Tracks
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LearnView;

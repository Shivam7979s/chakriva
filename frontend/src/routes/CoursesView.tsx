import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/layout/Container';
import { PageHeader } from '@/components/ui/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data/Card';
import { Badge } from '@/components/ui/data/Badge';
import { Button } from '@/components/ui/actions/Button';
import { Layers, Clock, ArrowRight, Terminal, CheckCircle2, Compass } from 'lucide-react';

interface CourseTrack {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  modules: number;
  duration: string;
  labSandbox: string;
  prerequisite: string;
  topics: string[];
}

export const CoursesView: React.FC = () => {
  const [enrolledIds, setEnrolledIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('chakriva_enrolled_courses');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleEnroll = (id: string) => {
    setEnrolledIds((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('chakriva_enrolled_courses', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  const courses: CourseTrack[] = [
    {
      id: 'course-1',
      title: 'Database Internals from First Principles',
      subtitle: 'Build an ACID-compliant B+ Tree storage engine in Rust with write-ahead logging (WAL) and MVCC.',
      level: 'Advanced Systems',
      modules: 12,
      duration: '36 hours',
      labSandbox: 'Rust 1.78 / Cargo Toolchain',
      prerequisite: 'Memory Models & Pointers',
      topics: ['B+ Trees', 'WAL & ARIES', 'Buffer Pool', 'MVCC Isolation'],
    },
    {
      id: 'course-2',
      title: 'Distributed Consensus: Raft & Paxos',
      subtitle: 'Implement a distributed key-value store with leader election, log replication, snapshotting, and fault injection testing.',
      level: 'Distributed Systems',
      modules: 8,
      duration: '24 hours',
      labSandbox: 'Go 1.23 / Chaos Network Sim',
      prerequisite: 'Concurrency & Network Sockets',
      topics: ['Leader Election', 'Log Compaction', 'Network Partitions', 'Jepsen Tests'],
    },
    {
      id: 'course-3',
      title: 'High-Throughput Microservices in Go & gRPC',
      subtitle: 'Production design patterns for connection pooling, streaming protobufs, rate limiting, and zero-downtime rolling updates.',
      level: 'Backend Architecture',
      modules: 10,
      duration: '28 hours',
      labSandbox: 'Go 1.23 / Protobuf v3',
      prerequisite: 'HTTP/2 & Thread Pooling',
      topics: ['Protobuf v3', 'gRPC Streams', 'Circuit Breakers', 'OpenTelemetry'],
    },
    {
      id: 'course-4',
      title: 'Compiler Construction: Lexing to LLVM IR',
      subtitle: 'Design a statically-typed language frontend with recursive descent parsing, AST semantic analysis, and LLVM code generation.',
      level: 'Compilers & Languages',
      modules: 14,
      duration: '42 hours',
      labSandbox: 'LLVM 18 / Clang C++ Toolchain',
      prerequisite: 'Context-Free Grammars',
      topics: ['Lexical Analysis', 'Type Inference', 'CFG Optimization', 'LLVM Target'],
    },
  ];

  return (
    <div className="py-8 space-y-8 text-left">
      <Container size="xl">
        {/* Standardized Sleek Page Header */}
        <PageHeader
          badge="Engineering Masterclasses"
          title="Advanced Systems & Engineering Tracks"
          subtitle="Comprehensive, code-intensive masterclasses taught through real-world systems implementations, test fixtures, and architectural diagrams."
        />

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => {
            const isEnrolled = Boolean(enrolledIds[course.id]);
            return (
              <Card key={course.id} className="hover:border-border-strong transition-colors flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="neutral">{course.level}</Badge>
                    <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
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
                  <CardTitle className="text-base text-text-primary">{course.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1">
                    {course.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {course.topics.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-subtle border border-border text-text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2.5 rounded-lg bg-surface-subtle/60 border border-border/60">
                    <div>
                      <span className="text-text-muted block text-[10px]">PREREQUISITE</span>
                      <span className="text-text-primary font-medium">{course.prerequisite}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">LAB SANDBOX</span>
                      <span className="text-sky-400 font-medium flex items-center gap-1">
                        <Terminal className="w-3 h-3" />
                        {course.labSandbox}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <Link to="/roadmaps" className="text-[11px] text-text-muted hover:text-text-primary font-mono flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-accent" />
                      <span>View Roadmap DAG</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isEnrolled ? 'secondary' : 'primary'}
                        onClick={() => toggleEnroll(course.id)}
                        leftIcon={isEnrolled ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : undefined}
                        rightIcon={!isEnrolled ? <ArrowRight className="w-3.5 h-3.5" /> : undefined}
                      >
                        {isEnrolled ? 'Enrolled in Track' : 'Enroll in Syllabus'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </div>
  );
};

import React, { useState } from 'react';
import { Container } from '@/components/ui/layout/Container';
import { PageHeader } from '@/components/ui/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data/Card';
import { Button } from '@/components/ui/actions/Button';
import { IconButton } from '@/components/ui/actions/IconButton';
import { Input } from '@/components/ui/forms/Input';
import { FormField } from '@/components/ui/forms/FormField';
import { Select } from '@/components/ui/forms/Select';
import { Checkbox } from '@/components/ui/forms/Checkbox';
import { Switch } from '@/components/ui/forms/Switch';
import { Alert } from '@/components/ui/feedback/Alert';
import { Modal } from '@/components/ui/feedback/Modal';
import { Tooltip } from '@/components/ui/feedback/Tooltip';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { ErrorState } from '@/components/ui/feedback/ErrorState';
import { Badge } from '@/components/ui/data/Badge';
import { Progress } from '@/components/ui/data/Progress';
import { Stat } from '@/components/ui/data/Stat';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/data/Table';
import { Tabs } from '@/components/ui/navigation/Tabs';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { CompletionIndicator } from '@/components/learning/CompletionIndicator';
import { ProblemCard } from '@/components/learning/ProblemCard';
import { TopicCard } from '@/components/learning/TopicCard';
import { RoadmapNode } from '@/components/learning/RoadmapNode';
import { useToast } from '@/components/ui/feedback/Toast';
import { useTheme } from '@/hooks/useTheme';
import {
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  BookOpen,
  Code2,
  Sun,
  Moon,
  Info,
} from 'lucide-react';

export const FoundationView: React.FC = () => {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [switchVal, setSwitchVal] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const tabs = [
    { id: 'overview', label: '0.1 - 0.3 Architecture & Philosophy', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'tokens', label: '0.4 - 0.6 Tokens & Palette', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'primitives', label: '0.7 UI Primitives', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'learning', label: '0.7 Pedagogical Domain Primitives', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'states', label: '0.8 - 0.10 A11y & States', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="py-8 space-y-10">
      <Container size="xl">
        {/* Standardized Sleek Page Header */}
        <PageHeader
          badge="Engineering Foundation"
          title="CHAKRIVA Engineering Foundation"
          subtitle="Production-grade architecture, systematic design tokens, WCAG 2.2 AA accessibility, and zero vibe-coded aesthetics. All foundational primitives consume centralized semantic CSS variables."
          actions={
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="secondary"
                size="md"
                leftIcon={theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
                onClick={toggleTheme}
              >
                Theme: {theme === 'dark' ? 'Obsidian' : 'Porcelain'}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  toast({
                    type: 'success',
                    title: 'System Toast Triggered',
                    message: 'Tokens and ToastProvider are operating correctly with zero layout shift.',
                  });
                }}
              >
                Test System Toast
              </Button>
            </div>
          }
        />

        {/* Tabbed Explorer */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pill" className="mb-6" />

        {/* TAB 1: OVERVIEW & PHILOSOPHY */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Stat
                label="System Architecture"
                value="Decoupled"
                subtitle="Isolated Docker Judge + FastAPI AI Service + Supabase PostgreSQL"
                icon={<Cpu className="w-5 h-5 text-primary" />}
              />
              <Stat
                label="Security Baseline"
                value="RLS-First"
                subtitle="Zero frontend secrets. Default-deny PostgreSQL policies enforced"
                icon={<ShieldCheck className="w-5 h-5 text-success" />}
              />
              <Stat
                label="Design Standards"
                value="Anti-Vibe"
                subtitle="14 Principles: Information hierarchy and mathematical 4px spacing before decoration"
                icon={<Layers className="w-5 h-5 text-amber-500" />}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Mandatory Anti-"Vibe Coded" Standard</CardTitle>
                <CardDescription>
                  Reviewing the 14 foundational principles defined in docs/design/design-philosophy.md
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded border border-border bg-surface-elevated space-y-1.5">
                    <span className="text-xs font-mono font-bold text-primary">01. HIERARCHY OVER DECORATION</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Every element exists to aid learning and problem comprehension. Unnecessary decorative graphics and random floating cards are strictly forbidden.
                    </p>
                  </div>
                  <div className="p-4 rounded border border-border bg-surface-elevated space-y-1.5">
                    <span className="text-xs font-mono font-bold text-primary">02. SYSTEMATIC 4px SPACING</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      All padding, margins, and gaps adhere to 4, 8, 12, 16, 20, 24, 32, 48px increments. No arbitrary offsets.
                    </p>
                  </div>
                  <div className="p-4 rounded border border-border bg-surface-elevated space-y-1.5">
                    <span className="text-xs font-mono font-bold text-primary">03. ISOLATED UNTRUSTED EXECUTION</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Arbitrary user code executes solely in air-gapped sandboxes without disk persistence, network egress, or database credentials.
                    </p>
                  </div>
                  <div className="p-4 rounded border border-border bg-surface-elevated space-y-1.5">
                    <span className="text-xs font-mono font-bold text-primary">04. NO FAKE DATA POLICY</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Phase 0 establishes foundational architecture only. No fake metrics, fake reviews, or dummy dashboards are fabricated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: TOKENS & COLOR SYSTEM */}
        {activeTab === 'tokens' && (
          <div className="space-y-6 text-left">
            <Card>
              <CardHeader>
                <CardTitle>Semantic Color Tokens & Contrast Compliance</CardTitle>
                <CardDescription>
                  WCAG 2.2 AA compliant palette avoiding muddy pitch black and neon purple gradients.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h5 className="text-xs font-mono font-bold text-text-muted uppercase mb-3">
                    Surfaces & Base Neutrals
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded border border-border bg-background space-y-1">
                      <div className="text-[11px] font-mono text-text-muted">--color-background</div>
                      <div className="text-xs font-semibold text-text-primary">Viewport Base</div>
                    </div>
                    <div className="p-3 rounded border border-border bg-surface space-y-1">
                      <div className="text-[11px] font-mono text-text-muted">--color-surface</div>
                      <div className="text-xs font-semibold text-text-primary">Primary Card</div>
                    </div>
                    <div className="p-3 rounded border border-border bg-surface-elevated space-y-1">
                      <div className="text-[11px] font-mono text-text-muted">--color-surface-elevated</div>
                      <div className="text-xs font-semibold text-text-primary">Elevated Dialog</div>
                    </div>
                    <div className="p-3 rounded border border-border bg-surface-sunken space-y-1">
                      <div className="text-[11px] font-mono text-text-muted">--color-surface-sunken</div>
                      <div className="text-xs font-semibold text-text-primary">Code Gutter</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-mono font-bold text-text-muted uppercase mb-3">
                    Semantic Accents & Status Tokens
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded border border-primary/30 bg-primary/10 space-y-1">
                      <div className="text-[11px] font-mono text-primary font-bold">PRIMARY</div>
                      <div className="text-xs font-semibold text-text-primary">Precision Sapphire</div>
                    </div>
                    <div className="p-3 rounded border border-success/30 bg-success/10 space-y-1">
                      <div className="text-[11px] font-mono text-success font-bold">SUCCESS (AC)</div>
                      <div className="text-xs font-semibold text-text-primary">Emerald Passing</div>
                    </div>
                    <div className="p-3 rounded border border-warning/30 bg-warning/10 space-y-1">
                      <div className="text-[11px] font-mono text-warning font-bold">WARNING (TLE)</div>
                      <div className="text-xs font-semibold text-text-primary">Amber Attention</div>
                    </div>
                    <div className="p-3 rounded border border-error/30 bg-error/10 space-y-1">
                      <div className="text-[11px] font-mono text-error font-bold">ERROR</div>
                      <div className="text-xs font-semibold text-text-primary">Crimson Failure</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-mono font-bold text-text-muted uppercase mb-3">
                    Execution Verdict Tokens (Isolated Judge Evaluation)
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 rounded border border-verdict-ac/30 bg-verdict-ac/10 space-y-1">
                      <div className="text-[11px] font-mono text-verdict-ac font-bold">AC</div>
                      <div className="text-xs font-semibold text-text-primary">Accepted</div>
                      <div className="text-[10px] font-mono text-text-muted">--verdict-ac</div>
                    </div>
                    <div className="p-3 rounded border border-verdict-wa/30 bg-verdict-wa/10 space-y-1">
                      <div className="text-[11px] font-mono text-verdict-wa font-bold">WA</div>
                      <div className="text-xs font-semibold text-text-primary">Wrong Answer</div>
                      <div className="text-[10px] font-mono text-text-muted">--verdict-wa</div>
                    </div>
                    <div className="p-3 rounded border border-verdict-tle/30 bg-verdict-tle/10 space-y-1">
                      <div className="text-[11px] font-mono text-verdict-tle font-bold">TLE</div>
                      <div className="text-xs font-semibold text-text-primary">Time Limit</div>
                      <div className="text-[10px] font-mono text-text-muted">--verdict-tle</div>
                    </div>
                    <div className="p-3 rounded border border-verdict-mle/30 bg-verdict-mle/10 space-y-1">
                      <div className="text-[11px] font-mono text-verdict-mle font-bold">MLE</div>
                      <div className="text-xs font-semibold text-text-primary">Memory Limit</div>
                      <div className="text-[10px] font-mono text-text-muted">--verdict-mle</div>
                    </div>
                    <div className="p-3 rounded border border-verdict-ce/30 bg-verdict-ce/10 space-y-1">
                      <div className="text-[11px] font-mono text-verdict-ce font-bold">CE / RE</div>
                      <div className="text-xs font-semibold text-text-primary">Compile / Runtime</div>
                      <div className="text-[10px] font-mono text-text-muted">--verdict-ce</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-mono font-bold text-text-muted uppercase mb-3">
                    Algorithmic Difficulty Tokens
                  </h5>
                  <div className="flex items-center gap-3">
                    <DifficultyBadge difficulty="easy" />
                    <DifficultyBadge difficulty="medium" />
                    <DifficultyBadge difficulty="hard" />
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-mono font-bold text-text-muted uppercase mb-3">
                    Progress & Completion Indicator Primitives
                  </h5>
                  <div className="space-y-3 max-w-md">
                    <div className="flex items-center gap-4 text-xs font-mono text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <CompletionIndicator status="completed" />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CompletionIndicator status="in_progress" />
                        <span>In Progress</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CompletionIndicator status="pending" />
                        <span>Pending</span>
                      </div>
                    </div>
                    <Progress value={68} showLabel />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Typography Hierarchy Specimen</CardTitle>
                <CardDescription>
                  Two strictly curated typefaces: Inter for UI and JetBrains Mono for code and metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 border-b border-border pb-3">
                  <span className="text-[11px] font-mono text-text-muted">Display / 36px Bold</span>
                  <div className="text-3xl font-bold tracking-tight text-text-primary">
                    Algorithmic Rigor & Systems Engineering
                  </div>
                </div>
                <div className="space-y-2 border-b border-border pb-3">
                  <span className="text-[11px] font-mono text-text-muted">H1 / 28px Bold</span>
                  <div className="text-2xl font-bold tracking-tight text-text-primary">
                    Distributed Systems & Concurrency Masterclass
                  </div>
                </div>
                <div className="space-y-2 border-b border-border pb-3">
                  <span className="text-[11px] font-mono text-text-muted">H2 / 22px Semibold</span>
                  <div className="text-xl font-semibold tracking-tight text-text-primary">
                    Section 3: Optimizing Memory Layout in Cache-Conscious Trees
                  </div>
                </div>
                <div className="space-y-2 border-b border-border pb-3">
                  <span className="text-[11px] font-mono text-text-muted">Code Specimen (JetBrains Mono 13px)</span>
                  <pre className="p-3 rounded bg-surface-sunken border border-border text-xs font-mono text-text-primary overflow-x-auto">
{`template <typename T>
class LRUCache {
    size_t capacity;
    std::list<std::pair<int, T>> items;
    std::unordered_map<int, typename std::list<std::pair<int, T>>::iterator> cache;
};`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: UI PRIMITIVES */}
        {activeTab === 'primitives' && (
          <div className="space-y-6 text-left">
            <Card>
              <CardHeader>
                <CardTitle>Button & Action Primitives</CardTitle>
                <CardDescription>
                  Standardized variants, sizes, and accessible loading states.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary Action</Button>
                  <Button variant="secondary">Secondary Action</Button>
                  <Button variant="outline">Outline Action</Button>
                  <Button variant="ghost">Ghost Trigger</Button>
                  <Button variant="danger">Destructive Action</Button>
                  <Button variant="primary" isLoading>Submitting Code</Button>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Tooltip content="System Architecture Info">
                    <IconButton aria-label="Information" icon={<Info className="w-4 h-4" />} />
                  </Tooltip>
                  <Tooltip content="Judge Terminal">
                    <IconButton aria-label="Terminal" variant="secondary" icon={<Terminal className="w-4 h-4" />} />
                  </Tooltip>
                  <Tooltip content="Toggle Theme">
                    <IconButton aria-label="Dark mode toggle" variant="outline" icon={<Sun className="w-4 h-4" />} onClick={toggleTheme} />
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accessible Form Primitives</CardTitle>
                <CardDescription>
                  Inputs, select dropdowns, checkboxes, and switches with automatic aria-describedby linkage.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  id="demo-username"
                  label="Engineer Username"
                  required
                  helperText="Lowercase alphanumeric identifiers only."
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g. linus_torvalds"
                    />
                  )}
                </FormField>

                <FormField id="demo-language" label="Primary Compiler Target">
                  {(fieldProps) => (
                    <Select
                      {...fieldProps}
                      options={[
                        { label: 'C++ 20 (GCC 13)', value: 'cpp' },
                        { label: 'Rust 1.77 (Cargo)', value: 'rust' },
                        { label: 'Go 1.22', value: 'go' },
                        { label: 'Python 3.12', value: 'python' },
                      ]}
                    />
                  )}
                </FormField>

                <div className="space-y-3 pt-2">
                  <Checkbox
                    id="chk-terms"
                    label="Accept Sandboxed Judge Execution Policy"
                    description="Code executes under strict CPU and memory limits."
                    checked={checkboxVal}
                    onChange={(e) => setCheckboxVal(e.target.checked)}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Switch
                    id="sw-strict"
                    label="Strict Compiler Warnings (-Wall -Werror)"
                    description="Treat all compiler diagnostic warnings as errors."
                    checked={switchVal}
                    onChange={(e) => setSwitchVal(e.target.checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tabular Data Display</CardTitle>
                <CardDescription>
                  High-density, accessible table with sticky header and tabular-nums alignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Problem Identifier</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Execution Time</TableHead>
                      <TableHead>Memory Allocated</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Binary Tree Maximum Path Sum</TableCell>
                      <TableCell><DifficultyBadge difficulty="hard" /></TableCell>
                      <TableCell>14ms</TableCell>
                      <TableCell>27.4 MB</TableCell>
                      <TableCell><Badge variant="success">Accepted</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">LRU Cache Design</TableCell>
                      <TableCell><DifficultyBadge difficulty="medium" /></TableCell>
                      <TableCell>42ms</TableCell>
                      <TableCell>48.1 MB</TableCell>
                      <TableCell><Badge variant="success">Accepted</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Invert Binary Tree</TableCell>
                      <TableCell><DifficultyBadge difficulty="easy" /></TableCell>
                      <TableCell>3ms</TableCell>
                      <TableCell>8.9 MB</TableCell>
                      <TableCell><Badge variant="neutral">Pending</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: PEDAGOGICAL DOMAIN PRIMITIVES */}
        {activeTab === 'learning' && (
          <div className="space-y-6 text-left">
            <Card>
              <CardHeader>
                <CardTitle>Problem & Roadmap Primitives</CardTitle>
                <CardDescription>
                  Pedagogical UI building blocks engineered specifically for curriculum progression.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <ProblemCard
                    title="Design an In-Memory Key-Value Store with TTL"
                    slug="in-memory-kv-ttl"
                    difficulty="hard"
                    acceptanceRate={38.4}
                    tags={['Systems', 'Concurrency', 'Hash Tables']}
                    status="completed"
                  />
                  <ProblemCard
                    title="Two Sum II — Input Array Is Sorted"
                    slug="two-sum-ii"
                    difficulty="medium"
                    acceptanceRate={61.2}
                    tags={['Two Pointers', 'Array']}
                    status="in_progress"
                  />
                  <ProblemCard
                    title="Reverse Linked List"
                    slug="reverse-linked-list"
                    difficulty="easy"
                    acceptanceRate={74.8}
                    tags={['Linked List']}
                    status="pending"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <TopicCard
                title="Distributed Systems Foundations"
                description="Consensus algorithms, vector clocks, leader election, and partition tolerance models."
                slug="distributed-systems"
                totalProblems={18}
                completedProblems={6}
                icon={<Cpu className="w-4 h-4" />}
              />
              <TopicCard
                title="Advanced Dynamic Programming"
                description="Interval DP, bitmask state optimization, tree DP, and digit dynamic programming."
                slug="advanced-dp"
                totalProblems={24}
                completedProblems={18}
                icon={<Code2 className="w-4 h-4" />}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Directed Roadmap Milestone Node</CardTitle>
                <CardDescription>
                  Sequential milestone item with status indicators and connecting timeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                <RoadmapNode
                  stepNumber={1}
                  title="Computer Systems: Memory Hierarchy & CPU Cache Lines"
                  description="Understand L1/L2/L3 caching, false sharing in multi-core systems, and sequential memory access advantages."
                  duration="3 hours"
                  status="completed"
                />
                <RoadmapNode
                  stepNumber={2}
                  title="Concurrency Primitives: Mutexes, Spinlocks, and CAS"
                  description="Atomic compare-and-swap operations, lock contention overhead, and reader-writer locking semantics."
                  duration="5 hours"
                  status="in_progress"
                />
                <RoadmapNode
                  stepNumber={3}
                  title="Lock-Free Data Structures: Single-Producer Single-Consumer Queue"
                  description="Memory barriers, ring buffer ring pointers, and cache-line padding to avoid false sharing."
                  duration="6 hours"
                  status="pending"
                  isLast={true}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 5: ACCESSIBILITY, FEEDBACK & ERROR STATES */}
        {activeTab === 'states' && (
          <div className="space-y-6 text-left">
            <Card>
              <CardHeader>
                <CardTitle>Feedback & Notification Alerts</CardTitle>
                <CardDescription>
                  Semantic banners with WCAG compliant contrast ratios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="info" title="Compilation Sandbox Profile">
                  User code compiles inside an ephemeral container with gVisor sandbox kernel virtualization.
                </Alert>
                <Alert variant="success" title="Test Suite Passed">
                  All 45 hidden test cases succeeded in 18ms.
                </Alert>
                <Alert variant="warning" title="Memory Allocation Limit">
                  Solution exceeded 256MB threshold on test case 38.
                </Alert>
                <Alert variant="error" title="Segmentation Fault (SIGSEGV)">
                  Out-of-bounds pointer dereference at line 24.
                </Alert>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>Empty State Specification</CardTitle>
                  <CardDescription>
                    Pattern used when a user has no active revisions or submissions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    title="No Revisions Due Today"
                    description="You are caught up with your spaced-repetition queue. Check back tomorrow or tackle new curriculum topics."
                    actionLabel="Explore Roadmaps"
                    onAction={() => setActiveTab('learning')}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Diagnostic Error State</CardTitle>
                  <CardDescription>
                    Pattern used when judge workers or database connections encounter failures.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorState
                    title="Judge Sandbox Worker Offline"
                    message="Unable to communicate with the isolated execution daemon. The job has been safely queued in Redis."
                    errorCode="ERR_JUDGE_TIMEOUT_504"
                    onRetry={() => {
                      toast({
                        type: 'info',
                        title: 'Retry Dispatched',
                        message: 'Reconnected to Redis queue.',
                      });
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loading Placeholders</CardTitle>
                <CardDescription>
                  Eliminates Cumulative Layout Shift (CLS) by mirroring incoming content dimensions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" width={40} height={40} />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="rectangular" height={16} width="60%" />
                    <Skeleton variant="rectangular" height={12} width="40%" />
                  </div>
                </div>
                <Skeleton variant="rectangular" height={48} className="w-full" />
              </CardContent>
            </Card>

            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setIsModalOpen(true)}>
                Open Accessible Modal Preview
              </Button>
            </div>
          </div>
        )}
      </Container>

      {/* Accessible Modal Preview */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="CHAKRIVA Modal Primitive"
        description="Trapped focus, Esc-to-close, and backdrop dismissal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                toast({
                  type: 'success',
                  title: 'Action Confirmed',
                  message: 'Modal closed and focus restored.',
                });
              }}
            >
              Confirm Action
            </Button>
          </>
        }
      >
        <p className="text-text-secondary leading-relaxed">
          This dialog adheres strictly to the WCAG 2.2 dialog standard:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-text-muted">
          <li><code>role="dialog"</code> and <code>aria-modal="true"</code> applied.</li>
          <li>Focus trapped within the modal boundary.</li>
          <li>Pressing <kbd className="px-1 border border-border rounded">Escape</kbd> or clicking outside dismisses cleanly.</li>
        </ul>
      </Modal>
    </div>
  );
};

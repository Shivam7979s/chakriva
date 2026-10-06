# VERNIQ
## Production System Architecture & Design Specification

**Version:** 1.0
**Status:** Architecture Baseline
**Purpose:** Define the production-grade architecture, security model, service boundaries, data architecture, judge infrastructure, deployment strategy, scalability model, and engineering rules for the Verniq coding platform.

---

# 1. Executive Summary

Verniq is a scalable coding and learning platform built around three fundamental capabilities:

1. **Learning & Problem Platform**
2. **Secure Online Judge**
3. **User Progress / Competition / Community Platform**

The architecture is intentionally designed as a **modular monolith for the application layer** combined with a **separate Judge Execution Plane**.

The initial deployment will run the Judge locally during the development and validation period. The Judge will later be deployed to dedicated cloud compute without requiring a fundamental redesign.

### Core architectural principle

> **The application manages users and data. The Judge executes untrusted code. These responsibilities must remain isolated.**

---

# 2. Architectural Goals

## 2.1 Primary Goals

Verniq must be:

- Secure
- Scalable
- Reliable
- Maintainable
- Observable
- Cost-efficient
- Easy to deploy
- Easy to test
- Capable of handling concurrent submissions
- Capable of supporting multiple programming languages
- Capable of scaling the Judge independently from the main application

## 2.2 Non-Goals

Verniq will NOT initially attempt to:

- Build dozens of microservices
- Deploy globally
- Implement multi-region databases
- Implement Kubernetes unnecessarily
- Build a massive distributed system before users exist

The architecture must support future scale without requiring premature complexity.

---

# 3. High-Level Architecture

```text
                         INTERNET
                            │
                            ▼
                   ┌──────────────────┐
                   │   DNS / DOMAIN   │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │    CDN + WAF     │
                   └────────┬─────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
          React Frontend          API Traffic
                 │                     │
                 │                     ▼
                 │              Load Balancer
                 │                     │
                 │          ┌──────────┼──────────┐
                 │          ▼          ▼          ▼
                 │       API #1      API #2      API #N
                 │          │          │          │
                 │          └──────────┼──────────┘
                 │                     │
                 │             Spring Boot
                 │              Application
                 │                     │
                 │       ┌─────────────┼─────────────┐
                 │       │             │             │
                 │       ▼             ▼             ▼
                 │  PostgreSQL       Redis       Object Storage
                 │       │             │
                 │       │             ▼
                 │       │       Submission Queue
                 │       │             │
                 │       │       ┌─────┴─────┐
                 │       │       ▼           ▼
                 │       │    Judge #1     Judge #N
                 │       │       │           │
                 │       │       ▼           ▼
                 │       │    Sandbox     Sandbox
                 │       │       │           │
                 │       │       └─────┬─────┘
                 │       │             ▼
                 │       │       Test Engine
                 │       │             │
                 │       └─────────────▼
                 │                Result Store
                 │                     │
                 └─────────────────────▼
                              User Result
```

---

# 4. Architectural Planes

Verniq consists of two major planes.

## 4.1 Application Plane

Responsible for:

- Authentication
- Authorization
- Users
- Profiles
- Problems
- Topics
- Companies
- Roadmaps
- Progress
- Bookmarks
- Submissions metadata
- Contests
- Rankings
- Discussions
- Administration
- Analytics

## 4.2 Judge Execution Plane

Responsible for:

- Submission execution
- Compilation
- Runtime execution
- Test execution
- Hidden tests
- Resource limits
- Sandbox isolation
- Runtime measurement
- Memory measurement
- Result generation

The Judge Plane must not have unrestricted access to the Application Plane.

---

# 5. Technology Baseline

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Monaco Editor

## Backend

- Java
- Spring Boot
- Spring Security
- REST API
- WebSocket/SSE where required

## Database

- PostgreSQL
- Supabase PostgreSQL during initial deployment

## Authentication

- Supabase Auth initially
- Spring Security for backend authorization

## Cache / Queue

- Redis

## Storage

- S3-compatible object storage / Supabase Storage

## Judge

- Docker
- Dedicated Judge Workers
- Isolated execution environments

## CI/CD

- GitHub
- GitHub Actions
- Docker

## Observability

- Structured logs
- Metrics
- Distributed tracing when scale justifies it

---

# 6. Frontend Architecture

```text
frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── problems/
│   │   ├── submissions/
│   │   ├── progress/
│   │   ├── contests/
│   │   ├── discussions/
│   │   └── admin/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   └── utils/
└── public/
```

The frontend must never be considered a security boundary.

Frontend permissions exist only for UX.

Every protected operation must be revalidated by the backend.

---

# 7. Backend Architecture

Verniq will initially use a **modular monolith**.

```text
backend/
├── auth/
├── users/
├── profiles/
├── problems/
├── topics/
├── companies/
├── submissions/
├── judge/
├── progress/
├── bookmarks/
├── contests/
├── rankings/
├── discussions/
├── notifications/
├── analytics/
├── admin/
├── audit/
└── common/
```

Each module should have clear:

- Controller
- Service
- Repository
- DTO
- Domain/model
- Validation
- Authorization rules

Modules should not bypass each other's service boundaries unnecessarily.

---

# 8. API Architecture

All public APIs should use versioning.

```text
/api/v1/
```

Core endpoints:

```text
/api/v1/auth/*
/api/v1/users/*
/api/v1/problems/*
/api/v1/topics/*
/api/v1/companies/*
/api/v1/submissions/*
/api/v1/progress/*
/api/v1/bookmarks/*
/api/v1/contests/*
/api/v1/rankings/*
/api/v1/discussions/*
/api/v1/admin/*
/api/v1/health
```

Future breaking API changes should use:

```text
/api/v2/
```

---

# 9. Authentication Architecture

Authentication answers:

> Who is this user?

Initial architecture:

```text
User
 │
 ▼
Supabase Auth
 │
 ├── Signup
 ├── Login
 ├── Email verification
 ├── Password recovery
 └── Session/token management
 │
 ▼
Verniq Backend
 │
 ▼
Spring Security
```

The backend validates authentication before processing protected operations.

---

# 10. Authorization Architecture

Authorization answers:

> What is this user allowed to do?

Verniq uses:

**RBAC + Permission-based authorization**

Architecture:

```text
User
 │
 ▼
User Role
 │
 ▼
Role Permissions
 │
 ▼
Resource + Action
```

Example:

```text
problem.read
problem.create
problem.update
problem.review
problem.publish
problem.archive
```

---

# 11. Verniq Roles

Initial role model:

```text
SUPER_ADMIN
ADMIN
CONTENT_ADMIN
PROBLEM_AUTHOR
REVIEWER
MODERATOR
INSTRUCTOR
USER
```

Roles should not be unnecessarily expanded.

Additional roles may be introduced when a genuine product requirement appears.

---

# 12. Permission Model

Example:

```text
USER

problem.read
submission.create
submission.read_own
progress.read_own
progress.write_own
bookmark.create
bookmark.delete
profile.read_own
profile.update_own
discussion.create
comment.create
```

Example:

```text
PROBLEM_AUTHOR

problem.read
problem.create
problem.update
test.create
test.update
```

Example:

```text
REVIEWER

problem.read
problem.review
problem.approve
problem.reject
test.review
```

Example:

```text
ADMIN

user.manage
problem.manage
test.manage
submission.inspect
audit.read
analytics.read
```

---

# 13. Authorization Enforcement

Authorization must be enforced server-side.

Incorrect:

```text
Frontend:
if role == ADMIN:
    show button
```

Correct:

```text
Request
 ↓
Authentication
 ↓
Role resolution
 ↓
Permission check
 ↓
Resource authorization
 ↓
Operation
```

The frontend may hide unavailable functionality, but the backend remains authoritative.

---

# 14. Database Architecture

PostgreSQL is the primary source of truth.

Major entities:

```text
users
profiles
roles
permissions
user_roles
role_permissions

problems
problem_versions
problem_topics
problem_companies
problem_patterns

test_suites
test_suite_versions
test_cases

submissions
submission_results

progress
bookmarks

contests
contest_problems
contest_participants
ratings

discussions
comments

notifications

audit_logs
```

---

# 15. Problem Identity

Every problem receives a permanent Verniq identifier.

Example:

```text
VRQ-000001
VRQ-000002
VRQ-000003
...
```

The identifier must remain stable throughout the lifetime of the problem.

Changing:

- title
- difficulty
- tags
- statement
- editorial
- test suite

must not change the permanent Verniq ID.

---

# 16. Problem Lifecycle

Problems should move through controlled states.

```text
DRAFT
  ↓
CONTENT_REVIEW
  ↓
TECHNICAL_REVIEW
  ↓
APPROVED
  ↓
PUBLISHED
  ↓
ARCHIVED
```

A published problem must not be silently overwritten.

---

# 17. Problem Versioning

Each published problem should have a version.

```text
VRQ-000019
 │
 ├── Version 1
 ├── Version 2
 └── Version 3
```

Submissions should record the problem version used.

---

# 18. Canonical Test Architecture

Current Verniq canonical targets:

```text
Easy    → 80 tests
Medium  → 150 tests
Hard    → 200 tests
```

Quality and coverage are more important than raw test count.

Test categories:

```text
Sample
Visible
Boundary
Edge Case
Adversarial
Stress
Hidden
```

---

# 19. Test Suite Versioning

Every canonical suite receives a version.

```text
VRQ-000019
Test Suite v1
Test Suite v2
Test Suite v3
```

Never silently replace canonical test data.

A submission must record:

```text
problem_version
test_suite_version
judge_version
runtime_version
```

---

# 20. Submission Architecture

The submission system must be asynchronous.

```text
Browser
 │
 ▼
POST /submissions
 │
 ▼
Authentication
 │
 ▼
Authorization
 │
 ▼
Create Submission
 │
 ▼
Status = QUEUED
 │
 ▼
Queue
```

The API should return a submission ID without waiting for execution.

Example:

```json
{
  "submissionId": "sub_123",
  "status": "QUEUED"
}
```

---

# 21. Judge Pipeline

```text
Submission
    │
    ▼
Validation
    │
    ▼
Queue
    │
    ▼
Judge Worker
    │
    ▼
Create Sandbox
    │
    ▼
Compile
    │
    ├── Compilation Error
    │
    ▼
Execute
    │
    ├── Runtime Error
    ├── Timeout
    ├── Memory Limit
    │
    ▼
Run Canonical Tests
    │
    ▼
Compare Output
    │
    ▼
Generate Result
    │
    ▼
Persist Result
    │
    ▼
Notify Client
```

---

# 22. Judge Status Model

Possible statuses:

```text
QUEUED
COMPILING
RUNNING
ACCEPTED
WRONG_ANSWER
TIME_LIMIT_EXCEEDED
MEMORY_LIMIT_EXCEEDED
RUNTIME_ERROR
COMPILATION_ERROR
INTERNAL_ERROR
CANCELLED
```

---

# 23. Run Code vs Submit

## Run Code

Purpose:

> Fast developer feedback.

Uses:

- Sample tests
- Visible tests

Does not expose canonical hidden tests.

## Submit

Purpose:

> Official evaluation.

Uses:

- Complete canonical test suite
- Hidden tests
- Strict resource limits

---

# 24. Judge Sandbox Security

User code is untrusted.

Every execution must be isolated.

Minimum controls:

```text
CPU limit
Memory limit
Execution timeout
Process/PID limit
Filesystem isolation
Network disabled
Read-only base filesystem
Temporary working directory
Dropped capabilities
seccomp where supported
Linux namespaces
cgroups
```

Never execute user code directly inside the Spring Boot process.

Never execute user code directly on the API host without isolation.

---

# 25. Judge Worker Architecture

```text
Submission Queue
      │
      ├───────────────┐
      ▼               ▼
Judge Worker 1    Judge Worker 2
      │               │
      ▼               ▼
Sandbox             Sandbox
      │               │
      ▼               ▼
Runtime             Runtime
```

Workers must be independently replaceable.

---

# 26. Language Runtime Isolation

Each language should have a controlled runtime.

```text
judge-runtimes/
├── java/
├── cpp/
└── python/
```

Each runtime should specify:

- compiler/runtime version
- available libraries
- resource limits
- execution command
- environment variables
- sandbox configuration

---

# 27. Hidden Test Security

Canonical hidden tests must never be exposed to the frontend.

Correct:

```text
Frontend
 ↓
Submit
 ↓
Backend
 ↓
Queue
 ↓
Judge
 ↓
Secure Test Store
 ↓
Hidden Tests
```

Incorrect:

```text
Frontend
 ↓
GET /all-tests
```

---

# 28. Redis Architecture

Redis is used for:

```text
Caching
Rate limiting
Distributed locks
Submission queues
Temporary state
Hot data
Job status
```

Redis is not the permanent source of truth.

PostgreSQL remains authoritative.

---

# 29. Queue Architecture

Initial queue:

```text
Redis Queue
```

Future options if scale demands:

```text
Redis Streams
RabbitMQ
Amazon SQS
Kafka
NATS
```

The queue implementation should remain behind a clean internal interface so it can be replaced later.

---

# 30. Load Balancing

The API layer must be horizontally scalable.

```text
                  Load Balancer
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       API #1       API #2       API #3
```

Backend instances must be stateless.

The Load Balancer performs health checks.

Example:

```text
GET /api/v1/health
```

Unhealthy instances receive no new traffic.

---

# 31. CDN Architecture

CDN should serve:

- JavaScript
- CSS
- fonts
- images
- static assets

Dynamic API requests should pass through the application security layer.

---

# 32. WAF

The WAF provides:

- malicious request filtering
- DDoS protection
- rate limiting
- bot controls
- common web attack mitigation

WAF does not replace application-level authorization or Judge sandboxing.

---

# 33. Rate Limiting

Rate limits should exist at multiple levels.

```text
IP level
User level
Endpoint level
Global level
```

Expensive endpoints require stricter limits:

```text
/login
/signup
/run
/submit
/admin/*
```

Limits should be configurable rather than hardcoded throughout application code.

---

# 34. Caching Strategy

Cache:

```text
Popular problem metadata
Topics
Companies
Public configuration
Public leaderboard data
Frequently accessed content
```

Do not blindly cache personalized data.

Cache invalidation must be explicit.

---

# 35. Object Storage

Object storage should hold large assets.

Examples:

```text
Problem images
Avatars
PDFs
Course assets
Large exports
Media
Generated files
Archived logs
```

PostgreSQL stores metadata and object references rather than unnecessarily storing large binary files.

---

# 36. Audit Architecture

Important actions must generate audit events.

Example:

```text
ADMIN
 ↓
Changed VRQ-000019
 ↓
Audit Event
```

Audit record:

```text
actor
action
resource_type
resource_id
previous_state
new_state
timestamp
request_id
```

Critical canonical content changes must be traceable.

---

# 37. Observability

Verniq must eventually provide:

```text
Logs
Metrics
Traces
```

Important metrics:

### API

```text
Requests/sec
Latency
Error rate
HTTP status distribution
```

### Database

```text
Connection count
Query latency
CPU
Storage
Locks
```

### Redis

```text
Memory
Hit rate
Queue depth
```

### Judge

```text
Queue depth
Worker utilization
Average execution time
Compilation failures
Runtime failures
Timeout rate
Memory failures
```

---

# 38. Request Tracing

Requests should have a request ID.

Example:

```text
request_id = req_abc123
```

The same ID should appear across:

```text
Load Balancer
 ↓
API
 ↓
Submission Service
 ↓
Queue
 ↓
Judge
 ↓
Result Processor
```

This dramatically simplifies production debugging.

---

# 39. Health Checks

Every service should expose health information.

Example:

```text
/health
/ready
```

Conceptually:

```text
/health
→ process is alive

/ready
→ service is ready to receive traffic
```

The load balancer should use readiness checks.

---

# 40. CI/CD

Every pull request should run:

```text
Frontend typecheck
Frontend build
Backend compilation
Backend unit tests
Backend integration tests
Judge tests
Security checks
Migration validation
```

Only successful builds can proceed toward deployment.

---

# 41. Deployment Environments

Minimum environments:

```text
LOCAL
DEVELOPMENT
STAGING
PRODUCTION
```

Each environment should have separate configuration and data boundaries.

Production secrets must never be committed to Git.

---

# 42. Local Development Architecture

During the first month:

```text
Developer Machine
│
├── React Frontend
├── Spring Boot Backend
├── Redis
├── Judge Worker
├── Docker Sandbox
└── Supabase
```

The local Judge must use the same logical interfaces as the future cloud Judge.

---

# 43. Initial Production Deployment

After the validation period:

```text
Frontend
   ↓
CDN / Vercel
   │
   ▼
Backend
   ↓
Supabase
   ├── PostgreSQL
   └── Auth

Submission
   ↓
Redis
   ↓
Cloud Judge VM
   ↓
Docker Workers
   ↓
Sandbox
```

The Judge should be deployed separately from the application backend.

---

# 44. Judge Scaling

Initial:

```text
1 VM
1–2 workers
```

Growth:

```text
1 VM
  ↓
Multiple workers
```

Further growth:

```text
Load Balancer
     │
 ┌───┼────┐
 ▼   ▼    ▼
J1  J2    J3
```

Eventually:

```text
Auto-scaled Judge Fleet
```

Workers should scale according to queue depth and resource utilization.

---

# 45. Failure Handling

If a Judge Worker crashes:

```text
Worker
  ↓
Crash
  ↓
Job timeout / lease expiration
  ↓
Queue recovery
  ↓
Another worker
```

A submission must not remain permanently stuck in:

```text
RUNNING
```

Every execution should have a maximum lifetime.

---

# 46. Idempotency

Important operations should support idempotency where appropriate.

For example:

```text
submission_id
request_id
job_id
```

If a network retry occurs, the backend must avoid unintentionally creating duplicate jobs.

---

# 47. Database Transactions

Use database transactions for operations that must remain atomic.

Example:

```text
Create Submission
+
Create Submission Event
+
Queue Job
```

The exact transaction/queue strategy must prevent the system from creating a database record without eventually processing its job.

---

# 48. Security Rules

Never:

- commit secrets
- expose database credentials
- expose service-role keys to frontend
- execute user code inside API
- expose hidden tests
- trust frontend roles
- trust user-provided resource limits
- allow unrestricted judge networking
- allow unrestricted filesystem access

Always:

- validate input
- authenticate protected requests
- authorize every protected resource
- rate-limit expensive operations
- isolate code execution
- log security-sensitive actions
- maintain backups

---

# 49. Secret Management

Secrets include:

```text
Database credentials
JWT secrets
Service-role keys
Redis credentials
Storage credentials
Cloud credentials
Judge signing keys
```

Secrets must be provided through environment/secret management systems.

They must not be stored in Git.

---

# 50. Data Ownership Rules

### PostgreSQL

Source of truth for:

```text
Users
Problems
Submissions
Progress
Contests
Ratings
Audit records
```

### Redis

Temporary/high-speed state.

### Object Storage

Large files/assets.

### Judge filesystem

Ephemeral execution data only.

Judge containers must not become permanent storage.

---

# 51. Scalability Principles

Verniq should scale horizontally wherever possible.

```text
More traffic
    ↓
More API instances
```

```text
More submissions
    ↓
More Judge Workers
```

```text
More cache demand
    ↓
Scale Redis
```

The database should be optimized before introducing unnecessary distributed database complexity.

---

# 52. Modular Monolith → Services

Initial architecture:

```text
One Spring Boot application
```

with modules.

Later, only high-load boundaries should become independent services.

Likely candidates:

```text
Submission Service
Judge Control Service
Notification Service
Search Service
Analytics Service
Contest Service
```

Extraction should be driven by real bottlenecks.

---

# 53. Future Service Architecture

Potential future state:

```text
                     API Gateway
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
     User/Auth        Problem Service   Submission
                                            │
                                            ▼
                                         Queue
                                            │
                                            ▼
                                      Judge Service
                                            │
                                      Worker Fleet
```

This is a future evolution, not the initial implementation requirement.

---

# 54. Performance Targets

Initial engineering targets:

```text
Normal API response:
< 300 ms target

Cached reads:
< 100 ms target

Submission creation:
< 300 ms target

Queue insertion:
near-immediate

Judge:
dependent on language/problem/test suite
```

These are engineering targets, not guarantees.

Judge throughput should be measured using realistic concurrent workloads.

---

# 55. Reliability Targets

The system should aim for:

```text
No lost submissions
No permanently stuck jobs
No accidental hidden-test exposure
No cross-user data leakage
No execution escaping the sandbox
No silent canonical test modification
```

These are more important than premature high availability.

---

# 56. Disaster Recovery

Production must maintain:

```text
Database backups
Point-in-time recovery where available
Object storage durability
Canonical test backups
Problem version history
Audit history
```

Critical content must exist independently of the Judge VM.

---

# 57. Canonical Dataset Protection

The canonical problem dataset is a critical asset.

Maintain:

```text
Canonical Dataset
      │
      ├── Git/versioned metadata
      ├── PostgreSQL
      ├── Backup
      └── Controlled import pipeline
```

Published canonical data should not depend solely on one developer machine.

---

# 58. Problem Authoring Pipeline

Recommended:

```text
Author
  ↓
Draft
  ↓
Automated Validation
  ↓
Reference Solution
  ↓
Canonical Test Generation
  ↓
Reference Solver Verification
  ↓
Technical Review
  ↓
Content Review
  ↓
Approval
  ↓
Publish
```

No direct production publishing by an untrusted author role.

---

# 59. Judge Verification Pipeline

Before a canonical suite becomes active:

```text
Generate Tests
     ↓
Validate Schema
     ↓
Reference Solution
     ↓
Run Complete Suite
     ↓
Verify Expected Results
     ↓
Check Duplicate Tests
     ↓
Check Edge Coverage
     ↓
Approve
     ↓
Activate Suite
```

---

# 60. Production Architecture Principle

The most important system boundary is:

```text
                 TRUSTED ZONE
────────────────────────────────────────
Frontend
API
Auth
PostgreSQL
Redis
Admin
────────────────────────────────────────

                 UNTRUSTED ZONE
────────────────────────────────────────
User Source Code
Compiler
Runtime
Test Execution
Sandbox
────────────────────────────────────────
```

The untrusted zone must have minimal privileges.

---

# 61. Current Verniq Architecture Decision

For the next month:

```text
Frontend
→ Local/Vercel

Backend
→ Local

Database
→ Supabase

Auth
→ Supabase Auth

Redis
→ Local

Judge
→ Local machine

Sandbox
→ Docker
```

This is the development and validation environment.

---

# 62. First Cloud Deployment Architecture

After validation:

```text
Frontend
→ Vercel/CDN

Database
→ Supabase PostgreSQL

Authentication
→ Supabase Auth

Backend
→ Cloud VM/container service

Redis
→ Managed Redis or dedicated Redis

Judge
→ Separate cloud VM

Workers
→ Docker

Sandbox
→ Docker/Linux isolation
```

---

# 63. Long-Term Cloud Architecture

```text
                         USERS
                           │
                           ▼
                     DNS / CDN / WAF
                           │
                           ▼
                     LOAD BALANCER
                           │
                 ┌─────────┼─────────┐
                 ▼         ▼         ▼
                API       API       API
                 │         │         │
                 └────┬────┴────┬────┘
                      │         │
              ┌───────┘         └────────┐
              ▼                          ▼
         PostgreSQL                    Redis
              │                          │
              │                     Submission Queue
              │                          │
              │                  ┌───────┴───────┐
              │                  ▼               ▼
              │             Judge Worker     Judge Worker
              │                  │               │
              │                  ▼               ▼
              │              Sandbox          Sandbox
              │                  │               │
              └──────────────────┴───────────────┘
                                 │
                              Results
                                 │
                                 ▼
                              Users
```

---

# 64. Architectural Rules for Future Development

Every new feature must answer:

1. Which module owns this functionality?
2. Which database tables does it require?
3. What permissions are required?
4. Does it need caching?
5. Does it generate events?
6. Does it require background processing?
7. Does it expose sensitive information?
8. Does it affect the Judge?
9. Does it require audit logging?
10. Does it affect scalability?

No feature should bypass the established architecture simply because it is faster to implement.

---

# 65. Golden Rules

### Rule 1
**Frontend is never trusted.**

### Rule 2
**Backend is the authorization authority.**

### Rule 3
**PostgreSQL is the source of truth.**

### Rule 4
**Redis is not permanent storage.**

### Rule 5
**User code never executes in the API process.**

### Rule 6
**Hidden tests never reach the browser.**

### Rule 7
**Judge workers are disposable.**

### Rule 8
**Published problems are versioned.**

### Rule 9
**Canonical test suites are versioned.**

### Rule 10
**Every production-sensitive change is auditable.**

### Rule 11
**Scale the Judge independently.**

### Rule 12
**Do not introduce microservices without a demonstrated need.**

---

# 66. Final Architecture Decision

Verniq will use:

```text
React + TypeScript
        │
        ▼
CDN + WAF
        │
        ▼
Load Balancer
        │
        ▼
Spring Boot Modular Monolith
        │
   ┌────┼─────────┐
   ▼    ▼         ▼
Postgres Redis   Storage
        │
        ▼
Submission Queue
        │
        ▼
Separate Judge Plane
        │
        ▼
Dockerized Workers
        │
        ▼
Secure Sandboxes
        │
        ▼
Canonical Test Engine
```

This architecture is the **Verniq System Architecture Baseline v1.0**.

The implementation should proceed from this specification rather than independently inventing infrastructure or service boundaries.

---

# 67. Implementation Priority

The recommended implementation order is:

### Phase A — Foundation
- Repository architecture
- Environment configuration
- API conventions
- PostgreSQL conventions
- Logging
- Error handling

### Phase B — Identity
- Supabase Auth
- Spring Security
- RBAC
- Permissions
- RLS
- Audit framework

### Phase C — Problem Platform
- Problem model
- Permanent Verniq IDs
- Problem versions
- Topics
- Companies
- Problem lifecycle

### Phase D — Judge
- Submission API
- Queue
- Worker
- Runtime adapters
- Docker sandbox
- Test engine
- Result processor

### Phase E — Reliability
- Retry handling
- Job leases
- Idempotency
- Timeouts
- Worker recovery
- Concurrent submissions

### Phase F — Product
- Progress
- Bookmarks
- Roadmaps
- Contests
- Rankings
- Discussions

### Phase G — Production
- CDN
- WAF
- Load balancing
- Cloud Judge
- Monitoring
- Backups
- CI/CD

### Phase H — Scale
- Multiple Judge Workers
- Autoscaling
- Managed queues
- Dedicated services where justified
- Advanced observability

---

# 68. Definition of Done

Verniq's architecture is considered production-ready when:

- Authentication is secure.
- Authorization is server-enforced.
- RBAC works correctly.
- RLS protects user-owned data.
- APIs are versioned.
- Problems are versioned.
- Canonical suites are versioned.
- Hidden tests are protected.
- Submissions are asynchronous.
- Judge workers are isolated.
- User code runs inside a sandbox.
- CPU/memory/time limits are enforced.
- Failed workers recover.
- Duplicate submissions/jobs are controlled.
- API instances can scale horizontally.
- Redis queue works reliably.
- PostgreSQL backups exist.
- Audit logs exist.
- Structured logging exists.
- Monitoring exists.
- CI/CD exists.
- Production secrets are protected.
- Judge can move from local machine to cloud without architectural redesign.

---

## Final Principle

**Verniq should not be designed as "a website with a code runner."**

It should be designed as:

> **A learning platform + content platform + secure distributed code-execution platform.**

The **application plane** manages trusted business data.

The **Judge plane** handles untrusted computation.

The **queue** connects them.

The **database** preserves truth.

The **authorization layer** controls access.

The **sandbox** protects the infrastructure.

The **load balancer and horizontal workers** provide scale.

That separation is the foundation on which Verniq can grow from the current development system into a serious production coding platform.

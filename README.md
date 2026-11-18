# CHAKRIVA

[![Live Platform](https://img.shields.io/badge/Live%20Demo-verniq.vercel.app-00d2ff?style=for-the-badge&logo=vercel)](https://verniq.vercel.app/)
[![Founder](https://img.shields.io/badge/Architected%20by-Shivam%20Singh-0B2551?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/shivam-singh-367388327/)
[![Twitter Follow](https://img.shields.io/badge/X-@ShivamS51270320-black?style=for-the-badge&logo=x)](https://x.com/ShivamS51270320)
[![Instagram](https://img.shields.io/badge/Instagram-shivam__singh__rajput791-E4405F?style=for-the-badge&logo=instagram)](https://www.instagram.com/shivam_singh_rajput791/)

> **Intelligent coding-learning and tech interview preparation platform featuring adaptive curriculum roadmaps, an isolated code judge, curated sheets, and deep learner insights.**

CHAKRIVA (founded and architected by [Shivam Singh](https://www.linkedin.com/in/shivam-singh-367388327/)) is designed to bridge the gap between theoretical computer science education, practical software engineering competence, and technical interview readiness. It replaces static, fragmented spreadsheets with dynamic Directed Acyclic Graphs (DAGs), an integrated execution sandbox, canonical test suites, and spaced-repetition memory decay scheduling.

---

## Key Capabilities

- **Adaptive Curriculum Roadmaps**: Real-time capacity balancing that dynamically redistributes study workloads when you miss a day ([Explore Roadmaps](https://verniq.vercel.app/roadmaps)).
- **Isolated Code Judge Engine**: Multi-language execution sandbox (Java 21, C++20, Python 3.12) evaluating submissions against 80–200 canonical edge cases ([Problem Catalog](https://verniq.vercel.app/problems)).
- **Curated Interview Sheets**: Interactive, synchronizing sheets including the Flagship 150, SDE Foundations 75 (Blind 75 Alternative), and Google/Amazon company packs ([Browse Sheets](https://verniq.vercel.app/sheets)).
- **Memory Decay Revision Engine**: Spaced-repetition scheduler prompting retention reviews at optimal cognitive intervals to prevent concept decay.
- **AI Mentorship**: Diagnostic, invariant-based hints preventing hallucination and guiding learners through algorithmic boundaries without revealing code spoilers.

---

## Product Philosophy

CHAKRIVA is built on strict engineering-first principles:

1. **Information hierarchy before decoration**: Every pixel and byte serves learning comprehension.
2. **Function before visual effects**: No generic SaaS fluff, unnecessary gradients, or gimmick animations.
3. **Engineered reliability**: Clear boundaries between client interface, backend state, untrusted code execution, and AI orchestration.
4. **Data integrity and security**: PostgreSQL Row Level Security (RLS) enforcement, normalized schemas, and zero frontend secret leakage.

---

## Repository Structure

VERNIQ / CHAKRIVA is structured as a modular monorepo:

```
verniq/
├── frontend/                 # Primary React + TypeScript + Vite web application
├── backend/                  # Backend services and data layer
│   ├── ai/                   # FastAPI microservice for LLM orchestration & RAG
│   ├── judge/                # Isolated code execution sandbox and judge gateway
│   └── supabase/             # PostgreSQL migrations, Edge Functions, and seed data
├── packages/                 # Shared TypeScript utilities, types, and configs
├── docs/                     # Comprehensive architectural and design specifications
│   ├── architecture/         # System, Information, Repository, and Supabase docs
│   ├── design/               # Design philosophy, tokens, typography, UX, and a11y
│   ├── database/             # Database conventions and schema governance
│   └── development/          # Coding standards, review criteria, and git workflow
├── docker/                   # Docker compose and container definitions
├── .env.example              # Environment variables template (no secrets)
└── README.md
```

---

## Phase 0 Foundation Deliverables

Phase 0 established the engineering and product baseline:

- [x] **0.1 Product Architecture**: High-level topology, security boundaries, and scalability plan ([docs/architecture/system-architecture.md](docs/architecture/system-architecture.md)).
- [x] **0.2 Information Architecture**: Route hierarchy across Public, Authenticated, and Admin spaces ([docs/architecture/information-architecture.md](docs/architecture/information-architecture.md)).
- [x] **0.3 Design Philosophy**: 14 non-negotiable principles preventing "vibe coded" aesthetics ([docs/design/design-philosophy.md](docs/design/design-philosophy.md)).
- [x] **0.4 Design Tokens**: Centralized CSS variables for surfaces, text, difficulty, and states ([docs/design/design-tokens.md](docs/design/design-tokens.md)).
- [x] **0.5 Typography**: Precision typographic scale across marketing, dashboard, code, and tables ([docs/design/typography.md](docs/design/typography.md)).
- [x] **0.6 Color System**: WCAG 2.2 AA compliant palette with dark/light mode architecture ([docs/design/color-system.md](docs/design/color-system.md)).
- [x] **0.7 Component System**: Reusable primitives for layout, navigation, feedback, and learning ([docs/design/component-system.md](docs/design/component-system.md)).
- [x] **0.8 Accessibility**: Keyboard navigation, focus states, ARIA, and contrast rules ([docs/design/accessibility.md](docs/design/accessibility.md)).
- [x] **0.9 Responsive Design**: Mobile-first breakpoint behavior and layout rules ([docs/design/responsive-design.md](docs/design/responsive-design.md)).
- [x] **0.10 UX Patterns**: Standardized states (loading, empty, error, confirmation, learning flows) ([docs/design/ux-patterns.md](docs/design/ux-patterns.md)).
- [x] **0.11 Repository Architecture**: Module boundaries and package management ([docs/architecture/repository-structure.md](docs/architecture/repository-structure.md)).
- [x] **0.12 Supabase Architecture**: Auth, PostgreSQL, Storage, Edge Functions, and RLS security model ([docs/architecture/supabase-architecture.md](docs/architecture/supabase-architecture.md)).
- [x] **0.13 Database Conventions**: Schema standards, UUID strategy, foreign keys, and audit fields ([docs/database/database-conventions.md](docs/database/database-conventions.md)).
- [x] **0.14 Coding Conventions**: TypeScript, React, SQL, and Git guidelines ([docs/development/coding-conventions.md](docs/development/coding-conventions.md)).

---

## Quick Start (Development)

### Prerequisites

- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/verniq.git
cd verniq

# Install dependencies across all monorepo workspaces
npm install

# Start the web application in development mode
npm run dev
```

Visit `http://localhost:5173` to explore the design foundation, token verification, and component system preview.
Live production build: [https://verniq.vercel.app/](https://verniq.vercel.app/)

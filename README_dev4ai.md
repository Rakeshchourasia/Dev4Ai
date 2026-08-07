<div align="center">

<br />

<img src="https://img.shields.io/badge/Dev4AI-Engineering%20Simulator-7c3aed?style=for-the-badge&labelColor=0f0f0f" />

<br /><br />

# Dev4AI

### *Train like you ship. Ship like a real engineer.*

<br />

<p>
  <img src="https://img.shields.io/badge/status-pre--alpha-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/node-%3E%3D20.x-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/postgres-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/docker-enabled-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" />
  <img src="https://img.shields.io/badge/PRs-welcome-blueviolet?style=flat-square" />
</p>

<br />

**Dev4AI is an AI-powered Engineering Simulator that recreates the full experience of working inside a real software company.**

Instead of watching videos or solving disconnected puzzles, you become a software engineer — receiving PRDs, sprint tickets, code reviews, performance reviews, and retrospectives exactly like a production engineering team.

<br />

[Live Demo](#) &nbsp;·&nbsp; [Documentation](#) &nbsp;·&nbsp; [Roadmap](#8-week-roadmap) &nbsp;·&nbsp; [Contributing](#contributing)

<br />

</div>

---

## 📌 Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Core Features](#core-features)
- [Why Modular Monolith First?](#why-modular-monolith-first)
- [High-Level Architecture](#high-level-architecture)
- [Module Dependency Diagram](#module-dependency-diagram)
- [Authentication Flow](#authentication-flow)
- [Sprint Workflow](#sprint-workflow)
- [Database Design](#database-design)
- [ER Diagram](#er-diagram)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Deployment Architecture](#deployment-architecture)
- [CI/CD Pipeline](#cicd-pipeline)
- [Future Microservice Architecture](#future-microservice-architecture)
- [Future Scope](#future-scope)
- [8-Week Roadmap](#8-week-roadmap)
- [Resume Impact](#resume-impact)
- [Getting Started](#getting-started)
- [Contributing](#contributing)

---

## The Problem

> **The software industry has a gap. Bootcamps and online platforms teach you to code. Nobody teaches you how to work.**

Every year, hundreds of thousands of developers complete courses on Udemy, Coursera, LeetCode, Frontend Mentor, Codecrafters, and Exercism. They graduate knowing syntax, patterns, and algorithms. They cannot, however, navigate a single sprint cycle inside a real engineering team.

Here is what those platforms do — and what they all miss:

| Platform | What it teaches | What it misses |
|---|---|---|
| **Udemy / Coursera** | Concept-driven video instruction | Real team collaboration, deadlines, feedback loops |
| **LeetCode** | Algorithm problem solving | System design, codebase navigation, PR culture |
| **Codecrafters** | Systems programming from scratch | Product thinking, PM communication, sprint planning |
| **Frontend Mentor** | UI implementation from designs | Backend integration, code review, engineering process |
| **Exercism** | Language proficiency, mentor feedback | Production workflows, team dynamics, performance culture |

### The Skills Nobody Teaches

When a developer joins a real company on day one, they are expected to immediately handle:

- **Sprint Planning** — Breaking down epics into sized tickets with acceptance criteria
- **PRD Comprehension** — Reading a Product Requirements Document and deriving technical tasks
- **Git Workflow** — Feature branches, PR conventions, rebasing, conflict resolution
- **Code Review Culture** — Giving and receiving structured, professional feedback
- **Engineering Collaboration** — Async communication, status updates, unblocking teammates
- **Production Debugging** — Reading logs, tracing errors, incident response
- **Retrospectives** — Structured reflection on what worked, what didn't, and why
- **Software Architecture** — Making and defending tradeoffs in system design

None of these skills appear in any mainstream learning platform. **Dev4AI was built specifically to close this gap.**

---

## The Solution

Dev4AI simulates a real software company — completely AI-powered.

You join a simulated company, get placed inside a squad, and work under a full AI leadership structure:

| AI Role | What it does |
|---|---|
| **Product Manager** | Writes PRDs, defines features, sets sprint goals, and runs planning sessions |
| **Tech Lead** | Breaks down PRDs into technical tickets with acceptance criteria and story points |
| **Senior Engineer** | Reviews your pull requests with line-level technical feedback |
| **Engineering Manager** | Tracks your sprint velocity, quality scores, and generates performance reviews |
| **AI Mentor** | Answers questions, explains concepts, and suggests learning paths in context |

Every developer who uses Dev4AI is not studying engineering — they are **practicing engineering**, inside a structured, feedback-driven simulation designed to build real-world readiness.

---

## Core Features

### 🏢 AI-Generated Companies

Dev4AI creates fully fleshed-out simulated companies complete with a company name, mission, domain (FinTech, HealthTech, EdTech, etc.), engineering culture description, and a defined tech stack. Companies feel real: they have OKRs, quarterly goals, and ongoing product roadmaps generated by the AI.

Developers join a company and experience its culture over multiple sprints. The company evolves — new features are requested, products pivot, priorities shift — just like the real world.

### 👥 Squads

Inside each company, developers are organized into **squads** — cross-functional product teams focused on a specific domain. A squad has a name, an engineering mission, and a set of services it owns.

Examples: *Payments Squad*, *Onboarding Squad*, *Infrastructure Squad*.

Each squad maintains its own sprint board, owns its own services in the codebase, and has its own performance review cycle. This models how real product-aligned engineering teams are structured.

### 📋 Sprint Planning

At the beginning of each sprint cycle, the AI Product Manager opens a sprint planning session. The sprint goal is defined. The backlog is refined. Tickets are estimated in story points. Developers participate in planning — selecting tickets, declaring capacity, and committing to a sprint scope.

Sprint cadence: **2-week cycles**, mirroring industry standard. Each sprint has:

- A clear sprint goal tied to a product feature
- A backlog of prioritized, sized tickets
- A defined start and end date
- Acceptance criteria for every ticket
- A velocity target based on historical data

### 📄 Product Requirement Documents (PRDs)

Before any ticket is created, the AI Product Manager writes a **PRD** — a structured product specification document that mirrors real PM output.

A Dev4AI PRD includes:

- **Problem Statement** — What user pain is being solved
- **Goals and Non-Goals** — What success looks like and what is explicitly out of scope
- **User Stories** — Behavior-driven descriptions of the desired experience
- **Functional Requirements** — Specific behaviors the system must support
- **Non-Functional Requirements** — Performance, security, and scalability constraints
- **Open Questions** — Unresolved decisions that require engineering input
- **Success Metrics** — How the PM will measure whether the feature worked

### 🎟️ AI Ticket Generator

The AI Tech Lead reads each PRD and automatically generates a structured set of **engineering tickets** formatted exactly like a professional Jira issue.

Each ticket includes:

- **Title** — Short, action-oriented description
- **Description** — Technical context and implementation notes
- **Acceptance Criteria** — A precise, testable definition of done
- **Story Points** — Effort estimate (1, 2, 3, 5, 8, 13)
- **Priority** — Critical / High / Medium / Low
- **Type** — Feature / Bug / Chore / Spike
- **Dependencies** — Other tickets that must be completed first
- **Labels** — Domain tags for filtering and analytics

### ✅ Acceptance Criteria

Every ticket includes **machine-verifiable acceptance criteria** written in Given-When-Then (Gherkin) format. This trains developers to think about edge cases, error states, and testable outcomes — not just happy-path implementation.

```
GIVEN a user submits a valid login form
WHEN their credentials match a record in the database
THEN they receive a 200 response with a signed JWT
AND a refresh token is stored in an HttpOnly cookie
```

### 📏 Story Points

Tickets are estimated using the **Fibonacci sequence** (1, 2, 3, 5, 8, 13). The platform tracks each developer's **velocity** — story points completed per sprint — and generates trend data used in performance reviews.

### 🐙 GitHub Integration

Dev4AI connects directly to your GitHub account via OAuth. The platform reads public repositories and recent activity, tracks commit frequency and patterns, analyzes PR size and review turnaround, monitors contribution streaks, and ingests PR submissions for AI code review.

Your real GitHub profile becomes **part of your Dev4AI performance profile**.

### 🔀 Pull Request Submission

When a developer completes a ticket, they submit the GitHub PR URL to Dev4AI. The platform fetches the PR diff, reads the PR description and commit messages, passes everything to the AI Code Review Engine, and posts results back to the developer's dashboard.

This creates a **closed-loop feedback system** — every piece of work is reviewed and every review is tied to a specific ticket and sprint.

### 🔍 AI Code Review

The AI Senior Engineer performs a **structured, line-level code review** of every submitted PR:

| Dimension | What is evaluated |
|---|---|
| **Correctness** | Does the code satisfy the acceptance criteria? |
| **Clarity** | Is the code readable, well-named, and self-documenting? |
| **Patterns** | Are appropriate design patterns and idioms applied? |
| **Error Handling** | Are edge cases, failures, and invalid inputs handled? |
| **Test Coverage** | Are the critical paths tested with meaningful assertions? |
| **Security** | Are there obvious vulnerabilities or unsafe practices? |
| **Performance** | Are there clear inefficiencies or N+1 patterns? |

Each review produces an overall score (0–100), per-dimension score breakdown, inline comments on specific lines, a senior engineer summary paragraph, and specific improvement suggestions.

### 📊 Performance Review

At the end of each sprint, the AI Engineering Manager generates a **structured performance review** covering sprint velocity, code quality trends, review response time, commit discipline, collaboration signals, strengths, and areas for improvement.

### 🔁 Sprint Retrospective

At the close of each sprint, the AI facilitates a **structured retrospective**: what went well, what could be improved, and concrete action items — mirroring the Agile retrospective format.

### 🌐 Public Engineering Portfolio

Every developer gets a **public, shareable engineering profile** built automatically from their Dev4AI activity — verifiable evidence of engineering experience designed for job applications.

### 📈 Skill Analytics

Dev4AI tracks developer skill development across backend development, system design thinking, code quality, test coverage, git discipline, sprint execution, and PR communication — with radar charts and time-series progression views.

### 🏆 Leaderboard *(Future)*

Quality-weighted engineering leaderboard rewarding code clarity, test coverage, and review quality — not raw ticket count.

### 🚨 Production Incident Simulator *(Future)*

Realistic on-call scenarios where developers must diagnose, triage, communicate, and resolve production issues within a simulated SLA window.

### 🧩 System Design Challenges *(Future)*

AI-driven system design exercises framed as real engineering problems with AI evaluation against production standards.

### 🎤 Mock Interviews *(Future)*

Simulated technical and behavioral interviews using the developer's actual Dev4AI history as context.

### 🤖 AI Mentor

An always-available AI Mentor embedded across the platform answering questions grounded in the specific ticket, codebase, and sprint the developer is currently working on.

---

## Why Modular Monolith First?

> **The most important architectural decision in Dev4AI Version 1 is choosing NOT to build microservices.**

### The Microservices Trap

Microservices are a **scaling solution**, not a starting architecture. Building Dev4AI as microservices from day one would mean 3× longer time to first feature, debugging across network boundaries, infrastructure complexity before product validation, and no clear domain boundaries to split on.

### Comparison

| Property | Modular Monolith | Microservices |
|---|---|---|
| **Development Speed** | Fast — no network overhead between domains | Slow — distributed coordination from day one |
| **Debugging** | Easy — single process, single log stream, full stack traces | Hard — distributed tracing, multiple log sources |
| **Domain Boundary Clarity** | Forces clean interfaces *before* splitting | Premature splits create wrong service boundaries |
| **Deployment** | Single container, simple CI/CD | One pipeline per service, infrastructure complexity |
| **Testing** | In-process integration tests | Requires contract testing, service mocking |
| **Extraction** | Extract when you *know* the boundaries | Cannot easily merge wrongly-split services |

### The Domain Boundaries Are Already Designed

Dev4AI's modular monolith is structured around **8 bounded domains** — each self-contained with its own routes, controllers, services, and repositories. They communicate only through well-defined service interfaces.

| Module | Domain | Future Service |
|---|---|---|
| `auth` | Identity, sessions, tokens | Auth Service |
| `users` | Profiles, squad membership | User Service |
| `sprints` | Sprint lifecycle, tickets, PRDs | Sprint Service |
| `github` | OAuth, webhooks, API calls, snapshots | GitHub Service |
| `reviews` | AI code review pipeline | Review Service |
| `analytics` | Performance reviews, metrics, charts | Analytics Service |
| `notifications` | In-app, email, push | Notification Service |
| `ai` | LLM client, prompt engineering, conversation | AI Service |

---

## High-Level Architecture

```mermaid
graph TB
    subgraph ClientLayer["Client Layer"]
        WEB["React / Next.js Web Application"]
        GH_HOOK["GitHub Webhooks"]
    end

    subgraph Gateway["API Gateway"]
        NGINX_GW["NGINX — Reverse Proxy / Rate Limiting / TLS"]
        AUTH_MW["Auth Middleware — JWT / Session / RBAC"]
    end

    subgraph Core["Modular Monolith — Node.js / Express"]
        direction LR
        subgraph Domain1["Identity Domain"]
            AUTH["auth"]
            USER["users"]
        end
        subgraph Domain2["Engineering Domain"]
            SPRINT["sprints"]
            PRD["prds"]
            REVIEW["reviews"]
        end
        subgraph Domain3["Integration Domain"]
            GITHUB["github"]
            AI_MOD["ai"]
        end
        subgraph Domain4["Insight Domain"]
            ANALYTICS["analytics"]
            NOTIF["notifications"]
        end
    end

    subgraph Queue["Job Queue Layer"]
        BULLMQ["BullMQ Workers"]
        JOB1["AI Review Job"]
        JOB2["GitHub Snapshot Job"]
        JOB3["Performance Review Job"]
        JOB4["Notification Job"]
    end

    subgraph DataLayer["Data Layer"]
        PG[("PostgreSQL 16")]
        REDIS[("Redis 7")]
        S3["AWS S3"]
    end

    subgraph AILayer["AI Layer"]
        LLM["LLM Provider — OpenAI / Gemini"]
        PROMPT["Prompt Engineering Service"]
    end

    subgraph FutureLayer["Future Scaling — Phase 3"]
        KAFKA["Apache Kafka"]
        CASS[("Cassandra")]
        ES["Elasticsearch"]
        K8S["Kubernetes"]
    end

    WEB -->|HTTPS| NGINX_GW
    GH_HOOK -->|Webhook| NGINX_GW
    NGINX_GW --> AUTH_MW --> Core

    Core --> PG & REDIS & S3
    Core -->|Enqueue| BULLMQ

    BULLMQ --> JOB1 & JOB2 & JOB3 & JOB4
    JOB1 --> AI_MOD --> PROMPT --> LLM

    Core -.->|Phase 3 Extract| FutureLayer
```

---

## Module Dependency Diagram

```mermaid
graph LR
    subgraph Shared["Shared Infrastructure"]
        DB["db client"]
        CACHE["redis client"]
        STORAGE["s3 client"]
        LOGGER["pino logger"]
        CONFIG["config loader"]
    end

    subgraph Modules["Domain Modules"]
        AUTH["auth"]
        USERS["users"]
        SPRINTS["sprints"]
        PRDS["prds"]
        GITHUB["github"]
        REVIEWS["reviews"]
        ANALYTICS["analytics"]
        NOTIF["notifications"]
        AI["ai"]
    end

    AUTH --> DB & CACHE
    USERS --> DB & AUTH
    SPRINTS --> DB & PRDS & AI & NOTIF
    PRDS --> DB & STORAGE
    GITHUB --> DB & CACHE
    REVIEWS --> DB & AI & GITHUB & NOTIF
    ANALYTICS --> DB & CACHE & GITHUB
    NOTIF --> DB & CACHE
    AI --> LOGGER & CONFIG
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    actor Developer
    participant FE as Frontend
    participant API as Dev4AI API
    participant GH as GitHub OAuth
    participant Redis as Redis
    participant DB as PostgreSQL

    Developer->>FE: Click Sign in with GitHub
    FE->>GH: Redirect /authorize?client_id&state&scope
    GH-->>Developer: Show permission consent
    Developer->>GH: Grant access
    GH-->>FE: Redirect /auth/callback?code&state

    FE->>API: POST /auth/github/callback
    API->>API: Validate state vs cookie
    API->>GH: Exchange code for access_token
    GH-->>API: access_token
    API->>GH: GET /user
    GH-->>API: github profile

    API->>DB: UPSERT users ON CONFLICT github_id
    DB-->>API: user record

    API->>API: Sign JWT 15min + generate refresh token 7d
    API->>DB: INSERT refresh_tokens with token_hash
    API->>Redis: SET session with user_id and role EX 900

    API-->>FE: 200 access_token + Set-Cookie refresh_token HttpOnly Secure

    Note over Developer,DB: Token Refresh Flow

    FE->>API: POST /auth/refresh with cookie
    API->>DB: Validate refresh token not revoked
    DB-->>API: Valid
    API->>DB: Revoke old token rotation
    API->>API: Issue new tokens
    API-->>FE: New access_token + rotated refresh cookie
```

---

## Sprint Workflow

```mermaid
flowchart TD
    A([Sprint Kickoff]) --> B[AI PM writes Sprint Goal]
    B --> C[AI PM publishes PRD]
    C --> D[Developer reads PRD]
    D --> E[AI Tech Lead generates tickets]
    E --> F[Developer commits to sprint scope]

    F --> G[Pick ticket from board]
    G --> H[Read acceptance criteria]
    H --> I[Create feature branch]
    I --> J[Implement feature]
    J --> K[Write tests]
    K --> L[Open Pull Request on GitHub]
    L --> M[Submit PR URL to Dev4AI]
    M --> N[BullMQ queues AI Review Job]
    N --> O[AI fetches PR diff]
    O --> P[AI scores submission]

    P --> Q{Review Verdict}
    Q -->|Changes Requested| R[AI posts line-level feedback]
    R --> J
    Q -->|Approved| S[Ticket Done — points credited]

    S --> T{More tickets?}
    T -->|Yes| G
    T -->|Sprint ends| U[AI generates Performance Review]
    U --> V[Sprint Retrospective published]
    V --> W[Profile and analytics updated]
    W --> X([Next Sprint])
```

---

## Database Design

Dev4AI uses a **fully normalized, production-ready PostgreSQL schema** built for correctness, query performance, and long-term maintainability.

**Design Principles:**

- All primary keys use **UUID v4** — no auto-increment integers
- All timestamps use `TIMESTAMPTZ` — timezone-aware, stored as UTC
- **Soft deletes** via `deleted_at` on mutable entities
- All foreign keys enforce **referential integrity** at the database level
- **Composite indexes** on high-query join columns
- `jsonb` columns for flexible AI-generated metadata

### Schema Overview

| Table | Purpose |
|---|---|
| `users` | Core identity — created on first GitHub OAuth login |
| `sessions` | Session audit log and revocation list |
| `refresh_tokens` | JWT refresh store with rotation and family tracking |
| `companies` | Simulated companies developers join |
| `squads` | Product-aligned engineering teams |
| `squad_members` | User + squad + role join table |
| `sprints` | Two-week sprint cycles with velocity tracking |
| `prds` | Product Requirement Documents with S3 storage |
| `tickets` | Engineering tickets with Gherkin acceptance criteria |
| `submissions` | PR submission records linking PRs to tickets |
| `reviews` | AI code review results with per-dimension scores |
| `performance_reviews` | Sprint-end manager review per developer |
| `github_snapshots` | Periodic developer GitHub activity captures |
| `achievements` | Milestone badges earned |
| `ai_conversations` | Full audit log of all AI interactions with cost tracking |
| `notifications` | Platform notifications |

---

## ER Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        bigint github_id UK
        varchar github_username UK
        varchar email
        varchar display_name
        text avatar_url
        varchar role
        varchar public_profile_slug UK
        boolean is_profile_public
        boolean onboarding_complete
        timestamptz created_at
        timestamptz deleted_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar session_key
        timestamptz expires_at
        timestamptz revoked_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token_hash
        uuid family_id
        timestamptz expires_at
        timestamptz revoked_at
    }

    COMPANIES {
        uuid id PK
        varchar name
        varchar slug UK
        varchar domain
        text mission
        jsonb tech_stack
        jsonb okrs
    }

    SQUADS {
        uuid id PK
        uuid company_id FK
        varchar name
        varchar domain
        text description
        int max_members
    }

    SQUAD_MEMBERS {
        uuid squad_id FK
        uuid user_id FK
        varchar squad_role
        timestamptz joined_at
        timestamptz left_at
    }

    SPRINTS {
        uuid id PK
        uuid squad_id FK
        int sprint_number
        text goal
        date start_date
        date end_date
        varchar status
        int committed_points
        int completed_points
        text ai_retro_summary
    }

    PRDS {
        uuid id PK
        uuid squad_id FK
        uuid sprint_id FK
        varchar title
        varchar status
        text problem_statement
        jsonb functional_requirements
        text s3_document_key
    }

    TICKETS {
        uuid id PK
        uuid sprint_id FK
        uuid prd_id FK
        uuid assignee_id FK
        varchar title
        text acceptance_criteria
        int story_points
        varchar priority
        varchar ticket_type
        varchar status
        timestamptz completed_at
    }

    SUBMISSIONS {
        uuid id PK
        uuid ticket_id FK
        uuid user_id FK
        text github_pr_url
        varchar github_repo_full_name
        int github_pr_number
        varchar status
        int attempt_number
    }

    REVIEWS {
        uuid id PK
        uuid submission_id FK
        int overall_score
        int clarity_score
        int correctness_score
        int test_coverage_score
        text summary
        jsonb inline_comments
        varchar verdict
        varchar ai_model_version
        timestamptz reviewed_at
    }

    PERFORMANCE_REVIEWS {
        uuid id PK
        uuid user_id FK
        uuid sprint_id FK
        numeric velocity_score
        numeric quality_score
        numeric overall_score
        text ai_narrative
        jsonb action_items
    }

    GITHUB_SNAPSHOTS {
        uuid id PK
        uuid user_id FK
        int commits_30d
        int prs_merged_30d
        numeric avg_review_turnaround_hrs
        int contribution_streak_days
        jsonb top_languages
        timestamptz captured_at
    }

    ACHIEVEMENTS {
        uuid id PK
        uuid user_id FK
        varchar achievement_key
        varchar title
        timestamptz earned_at
    }

    AI_CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        varchar context_type
        uuid context_id
        jsonb messages
        numeric total_cost_usd
        timestamptz created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar type
        varchar title
        boolean is_read
        timestamptz created_at
    }

    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ REFRESH_TOKENS : "holds"
    USERS ||--o{ SQUAD_MEMBERS : "joins"
    USERS ||--o{ SUBMISSIONS : "submits"
    USERS ||--o{ PERFORMANCE_REVIEWS : "receives"
    USERS ||--o{ GITHUB_SNAPSHOTS : "tracked in"
    USERS ||--o{ ACHIEVEMENTS : "earns"
    USERS ||--o{ AI_CONVERSATIONS : "has"
    USERS ||--o{ NOTIFICATIONS : "receives"
    COMPANIES ||--o{ SQUADS : "organizes"
    SQUADS ||--o{ SQUAD_MEMBERS : "includes"
    SQUADS ||--o{ SPRINTS : "runs"
    SQUADS ||--o{ PRDS : "owns"
    SPRINTS ||--o{ TICKETS : "contains"
    SPRINTS ||--o{ PERFORMANCE_REVIEWS : "triggers"
    PRDS ||--o{ TICKETS : "generates"
    TICKETS ||--o{ SUBMISSIONS : "resolved by"
    SUBMISSIONS ||--|| REVIEWS : "receives"
```

---

## Tech Stack

### Phase 1 — Production MVP

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Runtime** | Node.js | 20 LTS | Non-blocking I/O, event-driven, massive ecosystem |
| **Framework** | Express.js | 5.x | Minimal, unopinionated, easy modularization |
| **Language** | JavaScript ESM | ES2022+ | Fast iteration in MVP; TypeScript in Week 6 |
| **ORM** | Drizzle ORM | Latest | Type-safe SQL, lightweight, no magic |
| **Primary DB** | PostgreSQL | 16 | ACID, relational integrity, JSONB, battle-tested |
| **Cache / Queue** | Redis | 7 | Session store, BullMQ backing, pub/sub, rate limiting |
| **Job Queue** | BullMQ | Latest | Production-grade queue — retry, delay, priority |
| **Object Storage** | AWS S3 | — | PRD documents, submission artifacts |
| **Logging** | Pino | Latest | Structured JSON logging, extremely fast |
| **Validation** | Zod | 3.x | Runtime schema validation with type inference |
| **Testing** | Vitest + Supertest | Latest | Fast unit + HTTP integration testing |
| **Auth** | GitHub OAuth 2.0 | — | Natural developer identity — no new accounts |
| **JWT** | jose | Latest | Web standards compliant JWT |
| **Containerization** | Docker + Compose | Latest | Consistent dev/prod environments |
| **Reverse Proxy** | NGINX | Stable | TLS termination, rate limiting |
| **CI/CD** | GitHub Actions | — | Native to GitHub, tight PR integration |

### Phase 2 — Scale Additions

| Technology | Purpose | Trigger |
|---|---|---|
| **Elasticsearch** | Full-text search across tickets and PRDs | SQL ILIKE becomes a bottleneck |
| **TypeScript** | Type safety across all modules | Week 6 hardening sprint |
| **PgBouncer** | Connection pooling | DB connections exceed 100 concurrent |

### Phase 3 — Future Scaling

| Technology | Purpose | Trigger |
|---|---|---|
| **Apache Kafka** | Event bus between extracted microservices | Post service extraction |
| **Cassandra** | High-write event store for GitHub activity | >1M daily events ingested |
| **Kubernetes** | Container orchestration, auto-scaling | Multi-region deployment |
| **CQRS** | Separate read/write models for analytics | Read performance degradation |
| **Event Sourcing** | Immutable event log as audit trail | Compliance requirements |

---

## Folder Structure

```
dev4ai/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── validators/
│   │   │   ├── events/
│   │   │   └── index.js
│   │   ├── users/
│   │   ├── companies/
│   │   ├── sprints/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── validators/
│   │   │   ├── jobs/
│   │   │   ├── events/
│   │   │   └── index.js
│   │   ├── prds/
│   │   ├── github/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── jobs/
│   │   │   └── index.js
│   │   ├── reviews/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── jobs/
│   │   │   ├── validators/
│   │   │   └── index.js
│   │   ├── analytics/
│   │   ├── notifications/
│   │   └── ai/
│   │       ├── services/
│   │       │   ├── llm-client.js
│   │       │   ├── prompt-service.js
│   │       │   └── conversation-service.js
│   │       ├── prompts/
│   │       │   ├── v1/
│   │       │   │   ├── code-review.prompt.js
│   │       │   │   ├── ticket-generator.prompt.js
│   │       │   │   ├── prd-generator.prompt.js
│   │       │   │   └── retro-generator.prompt.js
│   │       │   └── v2/
│   │       └── index.js
│   ├── shared/
│   │   ├── database/
│   │   │   ├── client.js
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── redis/
│   │   │   ├── client.js
│   │   │   └── queue.js
│   │   ├── s3/
│   │   │   └── client.js
│   │   ├── middlewares/
│   │   │   ├── authenticate.js
│   │   │   ├── authorize.js
│   │   │   ├── validate.js
│   │   │   ├── rate-limit.js
│   │   │   ├── request-id.js
│   │   │   └── error-handler.js
│   │   ├── errors/
│   │   │   ├── AppError.js
│   │   │   ├── ValidationError.js
│   │   │   ├── AuthError.js
│   │   │   └── NotFoundError.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   ├── crypto.js
│   │   │   ├── pagination.js
│   │   │   └── date.js
│   │   └── events/
│   │       └── event-emitter.js
│   ├── config/
│   │   ├── index.js
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── s3.js
│   │   └── ai.js
│   └── app.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── nginx/nginx.conf
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── scripts/
│   ├── migrate.js
│   ├── seed.js
│   └── generate-migration.js
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
├── package.json
└── README.md
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Internet["Internet"]
        USER_REQ["Developer Browser"]
        GH_WH["GitHub Webhooks"]
    end

    subgraph CDN["CDN"]
        CF["Cloudflare — DNS / WAF / DDoS"]
    end

    subgraph VPC["AWS VPC"]
        NGINX_EC2["NGINX EC2 — TLS / Rate Limiting"]
        API1["API Server 1 — Node.js"]
        API2["API Server 2 — Node.js"]
        WORKER["BullMQ Worker"]
        PG_PRIMARY[("PostgreSQL Primary — RDS")]
        PG_REPLICA[("PostgreSQL Read Replica")]
        REDIS_CLUSTER[("Redis — ElastiCache")]
        S3_BUCKET["AWS S3"]
    end

    subgraph External["External Services"]
        GITHUB_API["GitHub API"]
        LLM_API["OpenAI / Gemini"]
        SMTP["Email — Resend / SES"]
    end

    USER_REQ --> CF --> NGINX_EC2
    GH_WH --> CF --> NGINX_EC2
    NGINX_EC2 --> API1 & API2
    API1 & API2 --> PG_PRIMARY & REDIS_CLUSTER & S3_BUCKET & GITHUB_API
    API1 --> PG_REPLICA
    WORKER --> REDIS_CLUSTER & LLM_API & GITHUB_API & PG_PRIMARY & SMTP
```

### Deployment Targets

| Environment | Platform | Notes |
|---|---|---|
| **Development** | Docker Compose local | All services containerized — `docker compose up` |
| **Staging** | Railway / Render | Auto-deploys from `develop` branch |
| **Production MVP** | AWS EC2 + RDS + ElastiCache | Full VPC with private subnets |
| **Production Scale** | AWS ECS / Kubernetes | Container orchestration on demand |

---

## CI/CD Pipeline

```mermaid
flowchart LR
    PR["Pull Request"] --> LINT["ESLint + Prettier"]
    LINT --> TYPE["Type Check"]
    TYPE --> UNIT["Vitest Unit Tests"]
    UNIT --> INT["Supertest Integration Tests"]
    INT --> SEC["npm audit"]
    SEC --> BUILD["Docker Build"]

    BUILD --> PUSH_MAIN["Push to main"]
    PUSH_MAIN --> IMG["Push Image to ECR"]
    IMG --> STG_MIG["Migrate Staging DB"]
    STG_MIG --> STG["Deploy to Staging"]
    STG --> SMOKE["Smoke Tests"]

    SMOKE --> APPROVAL["Manual Approval"]
    APPROVAL --> PROD_MIG["Migrate Production DB"]
    PROD_MIG --> BG["Blue/Green Deploy"]
    BG --> HEALTH["Health Check + Rollback"]
    HEALTH --> NOTIFY["Slack Notification"]
```

---

## Future Microservice Architecture

> A module becomes a microservice candidate when it has a dramatically different scaling profile, and independent deployment would reduce risk. The **Strangler Fig Pattern** governs all extraction: identify → isolate → extract → migrate → retire.

```mermaid
graph TB
    GW["API Gateway — Auth / Rate Limiting / Routing"]

    AUTH_SVC["Auth Service"]
    USER_SVC["User Service"]
    SPRINT_SVC["Sprint Service"]
    GITHUB_SVC["GitHub Service"]
    REVIEW_SVC["Review Service"]
    ANALYTICS_SVC["Analytics Service"]
    NOTIF_SVC["Notification Service"]
    AI_SVC["AI Service"]

    K1["kafka: sprint.started"]
    K2["kafka: review.completed"]
    K3["kafka: sprint.ended"]
    K4["kafka: github.snapshot.ready"]

    PG2[("PostgreSQL")]
    CASS2[("Cassandra — GitHub Events")]
    ES2["Elasticsearch — Search"]
    REDIS2[("Redis — Cache")]

    GW --> AUTH_SVC & USER_SVC & SPRINT_SVC & GITHUB_SVC & REVIEW_SVC & ANALYTICS_SVC

    SPRINT_SVC --> K1 & K3
    REVIEW_SVC --> K2
    GITHUB_SVC --> K4

    K1 --> REVIEW_SVC & ANALYTICS_SVC
    K2 --> ANALYTICS_SVC & NOTIF_SVC
    K3 --> ANALYTICS_SVC & NOTIF_SVC
    K4 --> ANALYTICS_SVC

    AUTH_SVC --> PG2 & REDIS2
    SPRINT_SVC --> PG2 & ES2
    GITHUB_SVC --> CASS2
    REVIEW_SVC --> PG2 & AI_SVC
    ANALYTICS_SVC --> PG2 & ES2
```

---

## Future Scope

| Feature | Phase | Description |
|---|---|---|
| **Microservices** | Phase 2 | Extract high-traffic modules via Strangler Fig |
| **Kafka Event Bus** | Phase 2 | Decouple services with async event streams |
| **Cassandra** | Phase 3 | High-throughput event store at scale |
| **Kubernetes** | Phase 3 | Auto-scaling, multi-region orchestration |
| **Elasticsearch** | Phase 2 | Full-text search across PRDs and tickets |
| **Event Sourcing** | Phase 3 | Immutable event log as source of truth |
| **CQRS** | Phase 3 | Separate read/write models for analytics |
| **Multi-Tenant Companies** | Phase 2 | Organizations deploy their own Dev4AI instance |
| **Team Collaboration** | Phase 2 | Real squad members with async communication |
| **AI Pair Programming** | Phase 3 | Live AI assistant embedded in implementation |
| **AI Daily Standups** | Phase 2 | AI-facilitated async standup with summaries |
| **AI Incident Response** | Phase 3 | On-call simulation with SLA window |
| **AI DevOps** | Phase 3 | Simulated deployment pipelines and rollbacks |
| **Leaderboard** | Phase 2 | Quality-weighted engineering leaderboard |
| **Mobile App** | Phase 3 | iOS / Android notifications and review access |
| **Enterprise Tier** | Phase 3 | White-label for bootcamps and universities |

---

## 8-Week Roadmap

```mermaid
gantt
    title Dev4AI — 8-Week Engineering Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  Week %W

    section Week 0 - Foundation
    Repo, ESLint, Prettier, commitlint         :done, w0a, 2025-08-04, 2d
    Docker Compose Postgres Redis NGINX        :done, w0b, after w0a, 2d
    Drizzle ORM and base schema migration      :done, w0c, after w0b, 2d
    Module scaffold and shared infra           :done, w0d, after w0c, 1d

    section Week 1 - Authentication
    GitHub OAuth 2.0                           :active, w1a, 2025-08-11, 2d
    JWT and refresh token rotation             :w1b, after w1a, 2d
    Redis session and cookie setup             :w1c, after w1b, 1d
    RBAC middleware                            :w1d, after w1c, 1d
    Auth tests                                 :w1e, after w1d, 1d

    section Week 2 - Sprint Engine
    Company and squad seed and API             :w2a, 2025-08-18, 1d
    AI PRD generation endpoint                 :w2b, after w2a, 2d
    AI ticket generation from PRD              :w2c, after w2b, 2d
    Sprint board API                           :w2d, after w2c, 2d

    section Week 3 - GitHub Integration
    GitHub API client PR diff fetch            :w3a, 2025-08-25, 2d
    GitHub webhook listener                    :w3b, after w3a, 1d
    PR submission flow and BullMQ              :w3c, after w3b, 2d
    GitHub snapshot ingestion job              :w3d, after w3c, 2d

    section Week 4 - AI Code Review
    LLM client abstraction layer               :w4a, 2025-09-01, 1d
    Prompt engineering service                 :w4b, after w4a, 2d
    AI review BullMQ worker                    :w4c, after w4b, 2d
    Review scoring and storage                 :w4d, after w4c, 2d

    section Week 5 - Analytics
    Sprint velocity calculator                 :w5a, 2025-09-08, 1d
    AI performance review generator           :w5b, after w5a, 2d
    AI retrospective generator                 :w5c, after w5b, 1d
    Public profile API                         :w5d, after w5c, 3d

    section Week 6 - Production Hardening
    TypeScript migration                       :w6a, 2025-09-15, 3d
    Rate limiting Redis token bucket           :w6b, after w6a, 1d
    Input validation audit                     :w6c, after w6b, 1d
    Security headers and test coverage         :w6d, after w6c, 2d

    section Week 7 - Deployment
    Dockerfile and Dockerfile.worker           :w7a, 2025-09-22, 1d
    GitHub Actions CI pipeline                 :w7b, after w7a, 1d
    Staging deploy                             :w7c, after w7b, 2d
    Production deploy AWS                      :w7d, after w7c, 2d

    section Week 8 - Launch
    Performance and query optimization         :w8a, 2025-09-29, 1d
    Beta onboarding and user testing           :w8b, after w8a, 2d
    Launch preparation                         :w8c, after w8b, 2d
    Public launch                              :milestone, w8d, after w8c, 0d
```

### Weekly Milestones

| Week | Theme | Exit Criteria |
|:---:|---|---|
| **0** | Foundation | Docker stack running, schema migrated, linting enforced |
| **1** | Authentication | GitHub OAuth login → JWT → session working end-to-end |
| **2** | Sprint Engine | AI generates PRD → tickets → sprint board via API |
| **3** | GitHub Integration | PR submitted → diff fetched → job queued |
| **4** | AI Code Review | PR → BullMQ → AI review → scores stored → returned |
| **5** | Analytics | Sprint end → performance review → public profile live |
| **6** | Hardening | All routes validated, rate limited, 80%+ test coverage |
| **7** | Deployment | Staging and production live, CI/CD green |
| **8** | Launch | Beta users onboarded, public profile shareable, launched |

---

## Resume Impact

> **Dev4AI is not just a project. It is a portfolio of engineering decisions — each one explainable in a technical interview.**

### System Design and Architecture

- Designed a **modular monolith** with 8 bounded domains, clear interface contracts, and explicit microservice extraction paths documented with tradeoffs
- Documented a **phased scaling strategy** with concrete triggers for Kafka, Cassandra, and Kubernetes
- Authored **Architectural Decision Records** explaining every major technology choice

### Authentication and Security

- Implemented **GitHub OAuth 2.0** from scratch with CSRF state parameter protection — no library magic
- Built a **refresh token rotation system** with token family tracking to detect and block reuse attacks
- Applied **JWT with short expiry** combined with HttpOnly, SameSite=Strict, Secure cookie refresh tokens
- Enforced **RBAC** at the middleware layer with composable role-based route protection
- Hardened all inputs with **Zod schema validation** — zero raw user input reaches business logic

### Database Engineering

- Designed a **16-table normalized PostgreSQL schema** with UUID PKs, FK constraints, and composite indexes
- Wrote raw SQL migrations with Drizzle ORM — no auto-migrations
- Modeled **time-series snapshot data** with rolling window aggregations
- Implemented soft deletes, JSONB flexible metadata, and optimistic locking patterns

### Redis and Caching

- Used Redis as a **session store** with TTL-based expiry and manual logout invalidation
- Implemented a **token bucket rate limiter** backed by Redis per-user and per-IP
- Built **cache-aside pattern** for public profiles and sprint boards

### Background Jobs and Queues

- Built an **async AI review pipeline** with BullMQ — decoupled submission from review delivery
- Implemented **retry logic with exponential backoff** on failed AI API calls
- Created **scheduled cron jobs** for daily GitHub activity snapshot ingestion
- Used **delayed jobs** for sprint auto-closure and performance review generation

### AI Integration

- Designed a **prompt versioning system** — prompts are versioned templates, not inline strings
- Built an **LLM provider abstraction layer** — swap providers with a single config change
- Stored **full AI conversation audit logs** including token usage and cost per interaction
- Implemented **structured output parsing** — LLM responses validated against Zod schemas

### GitHub Integration

- Built the **GitHub OAuth flow** from scratch without third-party auth libraries
- Integrated the **GitHub REST API** to fetch PR diffs, commits, and file changes programmatically
- Implemented a **webhook listener** with HMAC-SHA256 signature verification
- Designed a **daily snapshot ingestion system** for developer activity metrics

### Infrastructure and DevOps

- Containerized the full stack with **Docker** and **Docker Compose** including a separate worker image
- Wrote a **multi-stage Dockerfile** with build stage separated from production image
- Built a **GitHub Actions CI/CD pipeline**: lint → type check → test → build → blue/green deploy
- Configured **NGINX** as reverse proxy with TLS termination and rate limiting
- Deployed to **AWS EC2 with RDS and ElastiCache** — full VPC configuration

### Testing

- Achieved **80%+ test coverage** with Vitest unit tests and Supertest integration tests
- Wrote **integration tests against a real test database** — no mocking the data layer
- Created **test data factories** for repeatable, isolated test scenarios

### Logging and Observability

- Implemented **structured JSON logging** with Pino — every log has requestId, userId, module, and duration
- Designed a **log correlation strategy** — trace a request across all module logs by ID
- Configured **log levels per environment**: debug in development, warn in production

---

## Getting Started

### Prerequisites

```
Node.js >= 20.x
Docker + Docker Compose
GitHub OAuth App credentials
OpenAI or Gemini API key
AWS account for S3
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/dev4ai.git
cd dev4ai

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start all infrastructure services
docker compose up -d

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start the API server
npm run dev
```

API available at `http://localhost:3000`

### Environment Variables

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DATABASE_URL=postgresql://dev4ai:password@localhost:5432/dev4ai
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-session-secret-min-32-chars
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
GITHUB_WEBHOOK_SECRET=your_webhook_secret
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
AWS_REGION=us-east-1
AWS_S3_BUCKET=dev4ai-documents
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
OPENAI_API_KEY=sk-your-openai-key
AI_PROVIDER=openai
AI_MODEL=gpt-4o
```

### Available Scripts

```bash
npm run dev           # Start development server with hot reload
npm run start         # Start production server
npm run worker        # Start BullMQ workers
npm run test          # Run all tests
npm run test:unit     # Unit tests only
npm run test:int      # Integration tests only
npm run test:cov      # Tests with coverage report
npm run db:migrate    # Run pending migrations
npm run db:seed       # Seed development data
npm run db:reset      # Drop and recreate database
npm run lint          # ESLint check
npm run lint:fix      # ESLint autofix
npm run format        # Prettier format
```

---

## Contributing

Dev4AI follows a **sprint-based contribution workflow** — contributions are organized as engineering tickets.

### Branch Convention

```
feat/TICKET-001-github-oauth-integration
fix/TICKET-042-refresh-token-rotation-bug
chore/TICKET-099-upgrade-drizzle-orm
docs/TICKET-012-add-deployment-guide
```

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): implement refresh token rotation with family tracking
fix(reviews): handle null PR diff when GitHub returns 404
chore(deps): upgrade BullMQ to 5.4.0
test(sprints): add integration tests for sprint closure flow
```

### Pull Request Requirements

- PR must reference a ticket ID in the title
- All CI checks must pass: lint, type check, tests
- Minimum one review approval required
- PR description must explain the **why**, not just the **what**

---

## License

MIT © Dev4AI Contributors

---

<div align="center">

<br />

**Built to close the gap between "I know programming" and "I can work in a production engineering team."**

<br />

*If this resonates — star the repo and open the first sprint.*

<br />

⭐ Star &nbsp;·&nbsp; 🐛 Issues &nbsp;·&nbsp; 💬 Discussions &nbsp;·&nbsp; 🗺️ Roadmap

<br />

</div>

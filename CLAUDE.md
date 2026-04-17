# NetMap — Collaborative Professional Network Mapping

## Product Summary
A shared, interactive graph that maps a group's collective professional contacts and
relationships. Solves two problems:
1. **Personal recall** — search your own contacts by role, company, or tag.
2. **Group visibility** — see second-degree paths across your team's collective network
   so warm introductions replace cold outreach.

Target audience: regular users and corporate teams.
Design: clean and minimal by default; power-user features revealed progressively.
Feel: Miro meets LinkedIn — professional but approachable. Dark + light mode.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js (App Router) | SEO on public/landing pages |
| Styling | Tailwind CSS + shadcn/ui | Consumer + corporate look |
| Graph canvas | React Flow | Drag, zoom, pan, search highlight |
| Backend | Python FastAPI | REST API |
| Database | PostgreSQL via Supabase | Cloud-ready from day one |
| Auth | Supabase Auth | Email + OAuth, JWT |
| Storage | Supabase Storage | File uploads (CSV import, avatars) |
| Payments | Stripe | Flat monthly plans |
| Analytics | PostHog | Visits, signups, feature usage |
| Agent memory | Graphiti + Neo4j | Dev-time agent context only |

---

## Architecture Overview

```
netmap/
├── backend/                        FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── routes/         One file per domain
│   │   │           ├── auth.py
│   │   │           ├── workspaces.py
│   │   │           ├── members.py
│   │   │           ├── contacts.py
│   │   │           ├── edges.py
│   │   │           ├── search.py
│   │   │           ├── billing.py
│   │   │           └── admin.py    Superadmin only
│   │   ├── core/
│   │   │   ├── config.py           Settings from env
│   │   │   ├── security.py         JWT validation, role guards
│   │   │   └── dependencies.py     FastAPI Depends()
│   │   ├── db/
│   │   │   ├── session.py          Supabase/asyncpg session
│   │   │   └── migrations/         Alembic migration files
│   │   ├── models/                 SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── workspace.py
│   │   │   ├── member.py
│   │   │   ├── contact.py
│   │   │   ├── edge.py
│   │   │   ├── tag.py
│   │   │   └── plan.py
│   │   ├── schemas/                Pydantic request/response
│   │   │   ├── user.py
│   │   │   ├── workspace.py
│   │   │   ├── contact.py
│   │   │   ├── edge.py
│   │   │   └── billing.py
│   │   ├── services/               Business logic (no HTTP here)
│   │   │   ├── workspace_service.py
│   │   │   ├── contact_service.py
│   │   │   ├── graph_service.py    Path-finding, second-degree
│   │   │   ├── plan_service.py     Limit enforcement
│   │   │   ├── billing_service.py  Stripe integration
│   │   │   └── admin_service.py
│   │   ├── tasks/                  Background jobs (ARQ or Celery)
│   │   │   ├── email.py
│   │   │   └── csv_import.py
│   │   └── main.py                 FastAPI app entry point
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                       Next.js App Router
│   ├── src/
│   │   ├── app/                    Route segments
│   │   │   ├── (marketing)/        Public pages (landing, pricing)
│   │   │   ├── (auth)/             Login, signup, invite accept
│   │   │   ├── (app)/              Protected app shell
│   │   │   │   ├── dashboard/
│   │   │   │   ├── workspace/[id]/
│   │   │   │   │   ├── graph/      Main canvas view
│   │   │   │   │   ├── contacts/   List / detail view
│   │   │   │   │   └── settings/
│   │   │   │   └── settings/       User account settings
│   │   │   └── (admin)/            Superadmin panel
│   │   │       ├── analytics/      PostHog dashboard embed
│   │   │       ├── users/
│   │   │       ├── workspaces/
│   │   │       └── subscriptions/
│   │   ├── components/
│   │   │   ├── graph/              React Flow canvas + custom nodes/edges
│   │   │   ├── workspace/          Workspace cards, member list
│   │   │   ├── contacts/           Contact form, card, detail panel
│   │   │   ├── auth/               Auth forms, invite flow
│   │   │   ├── admin/              Admin tables, controls
│   │   │   └── ui/                 shadcn/ui re-exports + custom primitives
│   │   ├── hooks/                  Custom React hooks
│   │   ├── store/                  Zustand global state
│   │   ├── lib/
│   │   │   ├── api.ts              Typed fetch client
│   │   │   ├── supabase.ts         Supabase browser client
│   │   │   └── posthog.ts          PostHog client init
│   │   └── types/                  Shared TypeScript interfaces
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── memory/                         Agent knowledge layer (dev use)
│   ├── graphiti_client.py
│   └── seed_knowledge.py
│
├── agents/                         Agent definition files
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   └── Dockerfile.frontend
│   ├── nginx/
│   │   └── nginx.conf
│   └── docker-compose.yml
│
├── .github/
│   └── workflows/
│       ├── backend-tests.yml       pytest on push→main + every PR
│       └── e2e-tests.yml           Playwright on every PR
│
└── CLAUDE.md

```

---

## Key Domain Concepts
| Concept | Description |
|---|---|
| **Workspace** | Shared environment; members collectively own the contact graph |
| **Contact (Node)** | A person: name, title, company, LinkedIn, notes, tags |
| **Relationship (Edge)** | A connection between two contacts, owned by a member |
| **Member** | Authenticated user belonging to ≥1 workspace |
| **Plan** | free / paid tier on a workspace; enforces seat + node limits |
| **Superadmin** | Platform operator role; full read/write access to all data |

---

## CI / CD

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| Backend Tests | `.github/workflows/backend-tests.yml` | push → `main`, all PRs | Spins up Postgres, runs `pytest` with coverage, uploads `coverage.xml` artifact |
| E2E Tests | `.github/workflows/e2e-tests.yml` | all PRs | Builds + starts FastAPI and Next.js, runs Playwright (Chromium), uploads HTML report artifact |

**No deployment pipeline yet** — CI is test-only.

Required GitHub repository secrets:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(Stripe / PostHog keys are not required in CI)

---

## Plan Enforcement Rules (Backend)
Every mutating endpoint checks workspace plan limits before committing:
- Free tier: max N members, max M contacts per workspace (TBD with billing page)
- Enforcement lives in `plan_service.py`, called from route handlers
- Plan status comes from Stripe webhook → stored in `plans` table

---

## Admin Panel (Superadmin Only)
Route group: `(admin)/` in Next.js, protected by superadmin role middleware.

| Section | Contents |
|---|---|
| Analytics | PostHog embed — site visits + location, signups over time, active workspaces, feature usage |
| Users | All users: email, plan, created date, last active; change plan, suspend, delete |
| Workspaces | All workspaces: name, owner, member count, node count; view any workspace |
| Subscriptions | All Stripe subscriptions and their status |

---

## Feature Build Order
1. User auth + invite links to workspace
2. Workspace creation and member management
3. Add / edit / delete contacts (nodes) with metadata
4. Draw / edit relationships (edges) between contacts
5. Interactive graph canvas (drag, zoom, pan)
6. Search & filter with on-graph highlighting
7. Tags and categories on contacts
8. Free vs paid plan enforcement (seat / node limits)
9. Stripe billing and subscription management
10. Second-degree path discovery ("who knows X?")
11. Contact import (CSV)
12. Email notifications
13. Admin panel (PostHog analytics + DB viewer + superadmin controls)

---

## Agent Routing

When given any task, follow this process:

1. Identify which agent(s) are needed based on the task type
2. Read the relevant agent file from agents/ folder
3. Spawn it as a subagent using the Task tool
4. Pass the full task context to the subagent
5. If task requires multiple agents, run them in logical order

### Routing Rules
| Task type | Agent |
|---|---|
| System design, tech decisions | architect.md |
| React / Next.js / frontend | frontend.md |
| API / database / server | backend.md |
| Styling, spacing, colors, UX | ui_ux.md |
| Writing or running tests | tester.md |
| GitHub issues, fixing bugs | bug_fixer.md |
| Docker, deployment, CI/CD | devops.md |
| README, comments, docs | documentation.md |
| Task breakdown, sprint planning | planner.md |
| PR review, code quality | code_reviewer.md |
| Threat modelling, CVEs, hardening | security.md |

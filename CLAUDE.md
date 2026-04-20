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
│   │   │           ├── auth.py         ✅ invite preview/accept, token rotation
│   │   │           ├── workspaces.py   ✅ CRUD, members, /me profile endpoints
│   │   │           ├── contacts.py     ✅ CRUD + tags included in response
│   │   │           ├── edges.py        ✅ CRUD
│   │   │           ├── tags.py         ✅ CRUD + attach/detach to contacts
│   │   │           ├── search.py       ✅ workspace contact search (name/company/title/email/tags)
│   │   │           ├── billing.py      🔲 not yet implemented
│   │   │           └── admin.py        🔲 not yet implemented
│   │   ├── core/
│   │   │   ├── config.py           Settings from env
│   │   │   ├── security.py         JWT validation, role guards
│   │   │   └── dependencies.py     FastAPI Depends()
│   │   ├── db/
│   │   │   ├── session.py          Supabase/asyncpg session
│   │   │   └── migrations/         Alembic migration files
│   │   ├── models/                 SQLAlchemy ORM models
│   │   │   ├── user.py             ✅
│   │   │   ├── workspace.py        ✅ invite_token
│   │   │   ├── member.py           ✅ role, self_contact_id, profile_complete
│   │   │   ├── contact.py          ✅ is_self flag
│   │   │   ├── edge.py             ✅ source/target contacts, label, notes
│   │   │   ├── tag.py              ✅ Tag + ContactTag junction
│   │   │   └── plan.py             🔲 not yet implemented
│   │   ├── schemas/                Pydantic request/response
│   │   │   ├── user.py             ✅
│   │   │   ├── workspace.py        ✅ MemberProfileRead
│   │   │   ├── contact.py          ✅ includes tags[] and is_self
│   │   │   ├── edge.py             ✅
│   │   │   ├── tags.py             ✅
│   │   │   └── billing.py          🔲 not yet implemented
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
│   │   │   │   ├── dashboard/          ✅ workspace list + create
│   │   │   │   ├── workspace/[id]/
│   │   │   │   │   ├── layout.tsx      ✅ fetches /me, shows ProfileSetupModal if incomplete
│   │   │   │   │   ├── ProfileSetupModal.tsx  ✅ blocking, no close until submitted
│   │   │   │   │   ├── WorkspaceShell.tsx     ✅ client wrapper managing modal state
│   │   │   │   │   ├── graph/          ✅ React Flow canvas, member nodes (indigo), connect/delete edges, search filter
│   │   │   │   │   ├── contacts/       ✅ table + tag badges + tag filter chips + add/edit panel
│   │   │   │   │   └── settings/       ✅ rename, members, invite link, delete workspace
│   │   │   │   └── settings/           🔲 user account settings (stub)
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
| **Contact (Node)** | A person: name, title, company, LinkedIn, notes, tags. `is_self=True` means the node belongs to a member. |
| **Self-contact** | Auto-created Contact for each member (`is_self=True`, linked via `member.self_contact_id`). Filled in via profile-setup modal on first workspace entry. Styled distinctly (indigo) on the graph. |
| **Relationship (Edge)** | A connection between any two contacts, drawn on the graph canvas |
| **Member** | Authenticated user belonging to ≥1 workspace. Has `self_contact_id` + `profile_complete` flags. |
| **Tag** | Colored label attached to contacts. Workspace-scoped. Filterable on contacts list and searchable. |
| **Plan** | free / paid tier on a workspace; enforces seat + node limits |
| **Superadmin** | Platform operator role; full read/write access to all data |

---

## Database Migrations (Alembic)

Run from `backend/` directory. Loads `.env` from `backend/` then falls back to `../.env`.

```bash
alembic upgrade head    # apply all pending migrations
alembic current         # show current revision
```

| Revision | Description |
|---|---|
| 001 | Initial schema — users, workspaces, members |
| 002 | Contacts + tags + contact_tags |
| 003 | Edges (relationships between contacts) |
| 004 | Self-contact — `is_self` on contacts, `self_contact_id` + `profile_complete` on members |

**Always run `alembic upgrade head` after pulling new migrations.**

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
- Free tier: max N members, max M contacts per workspace (TBD — define on pricing page before implementing)
- Enforcement lives in `plan_service.py`, called from route handlers
- Plan status comes from Stripe webhook → stored in `plans` table
- **Not yet implemented** — build after `/pricing` page defines the limits

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

Legend: ✅ Done | 🔲 Not started

1. ✅ User auth + invite links to workspace
2. ✅ Workspace creation and member management
3. ✅ Add / edit / delete contacts (nodes) with metadata
4. ✅ Draw / edit relationships (edges) between contacts
5. ✅ Interactive graph canvas (drag, zoom, pan)
6. ✅ Search & filter (API + on-graph highlighting)
7. ✅ Tags and categories on contacts (backend + frontend)
   ✅ Members as contact nodes — each member gets an `is_self` contact node in their workspace;
      blocking profile-setup modal on first entry; member nodes styled distinctly on graph
8. 🔲 Free vs paid plan enforcement (seat / node limits)
9. 🔲 Stripe billing and subscription management
10. 🔲 Second-degree path discovery ("who knows X?")
11. 🔲 Contact import (CSV)
12. 🔲 Email notifications
13. 🔲 Admin panel (PostHog analytics + DB viewer + superadmin controls)

### Outstanding smaller items
- `/pricing` page — stub only, needs real UI before Stripe
- `/settings` user account page — stub only
- Fix 4 pre-existing TypeScript errors in `middleware.ts`, `supabase-server.ts`,
  `login/page.tsx`, `WorkspaceSettingsClient.tsx`

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

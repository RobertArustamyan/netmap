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
│   │   │           ├── paths.py        ✅ BFS second-degree path discovery
│   │   │           ├── billing.py      ✅ Stripe checkout/portal/webhook
│   │   │           └── admin.py        ✅ users, workspaces, subscriptions (superadmin)
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
│   │   │   └── plan.py             ✅ tier, max_members, max_contacts, stripe_subscription_id
│   │   ├── schemas/                Pydantic request/response
│   │   │   ├── user.py             ✅
│   │   │   ├── workspace.py        ✅ MemberProfileRead; WorkspaceRead includes member_count + contact_count
│   │   │   ├── contact.py          ✅ includes tags[] and is_self
│   │   │   ├── edge.py             ✅
│   │   │   ├── tags.py             ✅
│   │   │   └── billing.py          ✅ BillingPortalResponse, CheckoutSessionResponse
│   │   ├── services/               Business logic (no HTTP here)
│   │   │   ├── workspace_service.py
│   │   │   ├── contact_service.py
│   │   │   ├── graph_service.py    ✅ BFS all-shortest-paths (bidirectional, max_depth 6)
│   │   │   ├── plan_service.py     ✅ check_member_limit / check_contact_limit (HTTP 402)
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
│   │   │   │   ├── dashboard/          ✅ editorial design; workspace cards with member+contact counts
│   │   │   │   │   ├── page.tsx            server component; session check; passes workspaces to grid
│   │   │   │   │   ├── WorkspaceGrid.tsx   client component; always-visible stats row per card
│   │   │   │   │   └── UserMenu.tsx        avatar dropdown — Settings, Help, Sign out
│   │   │   │   ├── workspace/[id]/
│   │   │   │   │   ├── layout.tsx      ✅ fetches /me, shows ProfileSetupModal if incomplete
│   │   │   │   │   ├── ProfileSetupModal.tsx  ✅ blocking, no close until submitted
│   │   │   │   │   ├── WorkspaceShell.tsx     ✅ client wrapper managing modal state
│   │   │   │   │   ├── graph/          ✅ React Flow canvas, member nodes (indigo), connect/delete edges, search filter, path finder, auto-arrange (force layout), netmap-loader.gif on load
│   │   │   │   │   ├── contacts/       ✅ table + tag badges + tag filter chips + add/edit panel + CSV import + CSV export
│   │   │   │   │   └── settings/       ✅ rename, members, invite link, delete workspace
│   │   │   │   └── settings/           ✅ email display, password change, danger zone (delete account)
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
| 005 | Plans — `plans` table with tier, max_members (5), max_contacts (100), stripe_subscription_id |

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
- **Free tier:** max 5 members, max 100 contacts per workspace
- **Pro tier:** unlimited (max_members / max_contacts set very high via Stripe webhook)
- Enforcement lives in `plan_service.py` (`check_member_limit`, `check_contact_limit`), called from route handlers
- Returns HTTP 402 with `{code: "plan_limit_exceeded", resource, limit, current}`
- A free-tier `Plan` row is auto-created when a workspace is created
- Plan upgrades: Stripe webhook updates the `plans` table (Stripe integration not yet implemented)

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
8. ✅ Free vs paid plan enforcement (seat / node limits)
   - Plan model + migration 005; auto-created free plan on workspace creation
   - HTTP 402 with structured detail when limit exceeded
   - Frontend shows upgrade prompt + "View plans" link on 402
9. ✅ Stripe billing and subscription management
    - Backend: billing_service.py (checkout/portal/webhook), billing.py routes, migration 006 (stripe_customer_id)
    - Webhook handles subscription.created/updated/deleted → upgrades/downgrades plans table
    - Frontend: /plans pricing page, Plan & Billing section in workspace settings (upgrade/manage buttons)
    - Env vars needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_PRO
10. ✅ Second-degree path discovery ("who knows X?")
    - `GET /workspaces/{id}/paths?from_contact_id=&to_contact_id=` — BFS, bidirectional, max_depth 6
    - Graph canvas: "Find path" toggle → click two nodes → path highlighted green, everything else dimmed
11. ✅ Contact import (CSV)
    - `POST /workspaces/{id}/contacts/import` — CSV upload, validates headers, plan-aware bulk insert
    - Frontend: "Import CSV" button on contacts page → modal with file picker, loading state, results summary
12. ✅ Email notifications
    - backend/app/tasks/email.py — send_invite_email, send_welcome_email, send_member_joined_email via Resend API (httpx)
    - Wired into accept_invite: notifies workspace owner as BackgroundTask on new member join
    - Env vars needed: RESEND_API_KEY, RESEND_FROM_DOMAIN
13. ✅ Admin panel (PostHog analytics + DB viewer + superadmin controls)
    - Backend: GET/DELETE /admin/users, GET /admin/workspaces, PATCH /admin/workspaces/{id}/plan, GET /admin/subscriptions
    - Frontend: /admin layout with sidebar + superadmin guard; Users, Workspaces, Analytics (placeholder), Subscriptions pages

### Additional completed items
- Dashboard redesigned in editorial inline-style system (`#faf8f3` bg, serif accent headings, workspace cards with member + contact count stats)
- Avatar dropdown (`UserMenu.tsx`) in dashboard header — Settings, Help, Sign out
- `WorkspaceRead` extended with `member_count` and `contact_count` (computed in list endpoint)
- CSV export on contacts page — exports current filtered view; client-side, no backend call
- Graph auto-arrange button in React Flow Controls panel — Fruchterman-Reingold force layout, 80 iterations
- Graph loading state uses `netmap-loader.gif` instead of CSS spinner
- Login / signup pages redesigned: single-column editorial layout, no testimonial sidebar
- Signup: email + password + confirm password only (workspace/name setup via onboarding modal post-login)
- Pricing page Pro price updated to $4.99/mo to match landing page
- `scripts/seed_direct.py` — seeds a "Demo Network" workspace with 95 contacts + 193 edges directly via DB
- Stripe webhook to upgrade `plans.tier` + `max_members` / `max_contacts` — complete (POST /billing/webhook)
- Google & GitHub OAuth — popup-based flow (`skipBrowserRedirect: true`); `/auth/callback/route.ts` exchanges code, `/auth/popup-success/page.tsx` posts message to parent and closes popup
- Supabase project ref: `lxhagvynwyrrqckeoqcp`; redirect URL: `https://lxhagvynwyrrqckeoqcp.supabase.co/auth/v1/callback`
- Dashboard footer pinned to bottom of viewport (flex column + `flex:1` on main)
- Workspace cards no longer show slug (`/workspace-name`)
- Workspace nav: removed Account link; replaced workspace name with `WorkspaceSwitcher.tsx` — scroll-drum picker showing 3 items, snaps one-by-one, click centered item to navigate
- Graph: removed "Member" badge from self-contact (indigo) nodes; color alone distinguishes them

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

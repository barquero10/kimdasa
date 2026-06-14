# Kimdasa Construction Platform

A full-stack business management platform for Kimdasa Construction — a premier exterior remodeling company serving New Jersey and Pennsylvania. Includes a premium public website, admin dashboard, AI assistants, virtual sales agent, estimate engine, and market pricing database.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-managed by Replit)
- Required env: `SESSION_SECRET` — JWT signing secret (set as Replit secret)
- Optional env: `OPENAI_API_KEY` — Required for AI chat assistants

## Seeding the Database

Run `pnpm --filter @workspace/api-server run seed` to seed admin user, market prices, and site config.

The seed script requires `ADMIN_SEED_PASSWORD` to be set as a Replit secret before running — it will throw if missing. This prevents a hardcoded default credential from being accidentally deployed.

```bash
# Set your desired admin password as a secret first, then:
ADMIN_SEED_PASSWORD=<your-secure-password> pnpm --filter @workspace/api-server run seed
```

Admin email: `admin@kimdasa.com`. Password is whatever you set in `ADMIN_SEED_PASSWORD`. The seed is idempotent — safe to run multiple times.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 5000)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (stored in SESSION_SECRET)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: OpenAI API (via OPENAI_API_KEY)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM schema (one file per table)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per resource)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod validators (do not edit)
- `company_presentation_script_en.txt` — English AI presentation script
- `company_presentation_script_es.txt` — Spanish AI presentation script

## Database Tables

- `users` — Admin users with role-based access (admin/manager/staff)
- `leads` — Inbound leads with 7-stage status pipeline
- `customers` — Converted customers linked to leads
- `estimates` — Job estimates with cost breakdown
- `jobs` — Active and completed construction jobs
- `conversations` — AI chat history (all agents)
- `ai_notes` — AI-generated notes per lead/customer/job
- `uploaded_photos` — Photo metadata per lead/customer/job
- `market_prices` — NJ/PA pricing database (40 entries across 20 categories)
- `follow_ups` — Scheduled follow-up reminders
- `project_tasks` — Internal task management
- `virtual_agents` — Virtual AI agent configurations
- `site_config` — Website toggle settings (hero modal, phone, etc.)

## Architecture decisions

- All AI routes use `process.env.OPENAI_API_KEY` — never hardcoded. Server starts cleanly without it (returns 503 if missing).
- JWT auth signed with `SESSION_SECRET` env var; 7-day expiry. Server throws at startup if unset.
- **Public endpoints (intentional):** `POST /api/leads` (website form), `GET /api/market-prices` (public estimator), `GET /api/site-config` (frontend config), `POST /api/conversations` (chatbot history), `POST /api/photos` (photo metadata from unauthenticated upload flows), `POST /api/ai/chat` (public chatbot). If anonymous abuse becomes a concern, rate-limiting middleware should be added in front of these routes.
- Site config writes (`PUT /api/site-config/:key`) require auth.
- AI Virtual Seller auto-saves leads when it detects phone/email in conversation.
- All estimate calculations use `market_prices` table as source of truth; fallback to $10/sq ft if category not found.
- Orval regenerates `lib/api-zod/src/index.ts` each codegen run — the codegen script overwrites it post-generation to avoid duplicate export conflicts.

## Product

- **Public Website** (Task #2): Premium landing page at `/` — hero, services, gallery, testimonials, lead form, AI chatbot, SEO for NJ/PA
- **Admin Dashboard** (Task #3): Private panel at `/dashboard/` — leads, customers, estimates, jobs, follow-ups, market pricing DB, AI team, site settings
- **AI Engine** (Task #4): 6 AI assistants (Virtual Seller, Sales, Estimator, Project Manager, Admin, Marketing) — bilingual EN/ES

## Services - Kimdasa covers

Roofing, Vinyl Siding, Hardie Siding, Gutters, Soffit, Fascia, Window Capping, Windows, Doors, Exterior Remodeling, Repairs (NJ & PA)

## User preferences

- Professional tone — no emojis in UI
- All AI assistants auto-detect language (EN/ES) and respond in same language
- Market prices cover New Jersey and Pennsylvania regions
- Admin password is set via ADMIN_SEED_PASSWORD env var at seed time — change it via the admin UI after first login

## Dashboard credentials

- URL: https://623240e0-206f-4ef9-8d51-4de6daffbec1-00-28te67wg9luw3.riker.replit.dev/dashboard
- Email: admin@kimdasa.com
- Password: Kimdasa2025!

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before building frontend
- Run `pnpm --filter @workspace/db run push` after schema changes
- `SESSION_SECRET` must be set as a Replit secret — the server throws at startup if missing (no fallback)
- `ADMIN_SEED_PASSWORD` must be set before running the seed script — the script throws if missing (no hardcoded default)
- The `openai` package is NOT pre-installed — Task #4 (AI Engine) installs it. The AI route loads it lazily so the server boots without it; returns 503 with code AI_NOT_CONFIGURED if the key is absent.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

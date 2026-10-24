# ResolvAI

AI helpdesk for inbound support email. Agents classify, reply to, and close tickets in one place. Groq classifies new tickets, drafts replies from the knowledge base when it can, and polishes or summarizes replies on demand.

Public signup is off. An admin account is seeded at startup; that admin creates agents.

## Features

- Inbound email webhook creates tickets (`POST /api/webhooks/email`)
- Background jobs classify tickets and try to auto-resolve them from [`src/knowledge-base.md`](src/knowledge-base.md)
- Dashboard, filterable ticket list, and ticket detail with a reply thread
- AI polish and summarization on a ticket
- Admin-only user management
- Outbound mail through Resend (ticket created, reply, status change, AI resolution)

## Stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| API | Express 4 + TypeScript |
| UI | React 18, Vite, Tailwind CSS v4, shadcn/ui |
| Data | TanStack Query v5, Axios, React Hook Form, Zod |
| Auth | Better Auth (email/password, admin plugin) |
| Database | PostgreSQL, Prisma 7 |
| Jobs | pg-boss |
| AI | Vercel AI SDK + Groq (`openai/gpt-oss-20b`) |
| Email | Resend + Svix webhook verification |
| Errors | Sentry |
| Tests | Vitest + React Testing Library; Playwright for end-to-end |

Shared request schemas live in the `core` workspace package and are imported by both the server and the client.

## Layout

```
client/          React app (Vite). Production build is served by Express.
core/            Shared Zod schemas and enums
prisma/          Schema, migrations, seed
src/             Express server, auth, routes, queue workers
src/knowledge-base.md   Source the auto-resolve worker reads at runtime
```

In development the Vite app runs on port 5173 and proxies `/api` to the API on port 4000. In production Express serves `client/dist` and the API from the same origin.

## Prerequisites

- [Bun](https://bun.sh) 1.2+
- PostgreSQL 17, or Docker (Compose brings Postgres with it)

## Local setup

```bash
bun install
cp .env.example .env
```

Edit `.env`. At minimum set `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ characters), `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`. `GROQ_API_KEY` and `RESEND_API_KEY` can stay empty; tickets still create, and AI or email steps are skipped.

Create the schema, generate the client, and seed the admin:

```bash
bun x prisma migrate deploy
bun x prisma generate
bun run db:seed
```

Start the API and the UI in two terminals:

```bash
bun run dev
bun run dev:client
```

Or both at once: `bun run dev:all`.

Open [http://localhost:5173](http://localhost:5173) and sign in with the seeded admin.

### Docker

`docker compose` starts Postgres, the API (hot reload), and Vite:

```bash
bun run docker:dev
bun run docker:down
```

Compose overrides `DATABASE_URL` so the API talks to the `db` service. Other variables still come from `.env`.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. Prisma reads it from [`prisma.config.ts`](prisma.config.ts). |
| `BETTER_AUTH_SECRET` | yes | Session signing secret. |
| `BETTER_AUTH_URL` | yes | Public URL of this server. `http://localhost:4000` locally. |
| `CLIENT_URL` | yes | Browser origin allowed by CORS and Better Auth. `http://localhost:5173` locally. Same origin as the app in production. |
| `TRUSTED_ORIGINS` | fallback | Used when `CLIENT_URL` is unset. Set it to the same value as `CLIENT_URL`. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | yes | Admin created by `bun run db:seed`. Seed skips the user if the email already exists. |
| `WEBHOOK_SECRET` | for inbound mail | Svix secret for `POST /api/webhooks/email`. |
| `GROQ_API_KEY` | for AI | Classification, auto-resolve, polish, and summarize. Missing key falls back to `general_question` and leaves the ticket open. |
| `RESEND_API_KEY` | for outbound mail | Transactional email and fetching inbound message bodies. |
| `SENTRY_DSN` | no | Server error reporting. |
| `VITE_SENTRY_DSN` | no | Browser error reporting. Baked in at client build time. |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | no | Source map upload during the production client build. |
| `PORT` | no | API port. Defaults to `4000`. |

Copy [`.env.example`](.env.example) as the starting point. Do not commit `.env`.

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | API with reload on port 4000 |
| `bun run dev:client` | Vite on port 5173 |
| `bun run dev:all` | API and Vite together |
| `bun run build` | Production client build and `prisma generate` |
| `bun run start` | Migrate, seed, then start the API (also serves `client/dist`) |
| `bun run db:seed` | Create the admin and the AI agent user if they are missing |
| `bun run typecheck` | `tsc --noEmit` |
| `cd client && bun run test` | Component tests |
| `bun run test:e2e` | Reset the test database from `.env.test`, then Playwright |

## Routes

| Path | Who |
|---|---|
| `/login` | Public |
| `/` | Signed-in users. Dashboard. |
| `/tickets`, `/tickets/:id` | Signed-in users |
| `/users` | Admins. Agents see access denied. |

## API

All ticket, user, and agent routes require a session. Auth lives under `/api/auth/*` (Better Auth).

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | `{ status, uptime }`. Used by the Railway health check. |
| `GET` `POST` | `/api/tickets` | List and create |
| `GET` `PATCH` `DELETE` | `/api/tickets/:id` | Read, update, delete |
| `GET` | `/api/tickets/stats` | Dashboard counts |
| `POST` | `/api/tickets/:id/replies` | Agent reply |
| `POST` | `/api/tickets/polish` | Rewrite a draft with Groq |
| `POST` | `/api/tickets/:id/summarize` | Summarize the thread |
| `GET` | `/api/agents` | Assignable users |
| `GET` `POST` | `/api/users` | Admin |
| `PUT` `PATCH` `DELETE` | `/api/users/:id` | Update, restore, soft-delete. Admin. |
| `POST` | `/api/webhooks/email` | Inbound mail. Verified with Svix (`WEBHOOK_SECRET`). |

## Roles

| Role | Access |
|---|---|
| `admin` | Tickets and user management. Seeded; signup is disabled. |
| `agent` | Tickets. Created by an admin. |

## Deploy

Production runs as one container: migrate, seed, then Express on `PORT`, serving the built client. See [DEPLOY.md](DEPLOY.md).

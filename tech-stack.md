# Tech Stack

## Runtime
- **Bun** — package manager, test runner, and script runner

## Frontend
- React 18 + TypeScript
- Vite (dev server + build)
- Tailwind CSS v4 + shadcn/ui (base-nova style)
- TanStack Query v5 (server state)
- Axios (HTTP client)
- React Hook Form + `@hookform/resolvers/zod`
- React Router v6

## Backend
- Express 4 + TypeScript
- Better Auth (email/password, admin plugin, `disableSignUp`)
- Helmet, express-rate-limit (security)
- Sentry (`@sentry/node`) — error monitoring

## Database
- PostgreSQL
- Prisma ORM (v7, config via `prisma.config.ts`)
- Soft-delete pattern via `deletedAt` field

## Shared (`core/` package)
- Zod validation schemas shared between client and server
- `UserRole` enum — single source of truth

## AI
- Vercel AI SDK (`ai` + `@ai-sdk/groq`)
- Groq — `openai/gpt-oss-20b` — ticket classification, auto-resolve, polish reply, summarization
- PgBoss (`pg-boss`) — PostgreSQL-backed async job queue for AI worker pipelines
- Resend — transactional email (ticket created, reply, status update, AI resolution)

## Testing
- **Component**: Vitest v4 + React Testing Library + jsdom
- **E2E**: Playwright
<!-- AGENTS.md — project rules for Antigravity CLI, Claude Code, and other AI coding agents. -->

# Project Memory

## Tech Stack
- **Runtime**: Bun
- **Backend**: Express 4 + TypeScript
- **Frontend**: React 18 + Vite + TypeScript + TanStack Query v5 + Axios
- **Styling**: Tailwind CSS v4 + shadcn/ui (default theme, base-nova style)
- **Component Testing**: Vitest v4 + React Testing Library + jsdom

## Environment Variables
Required in `.env` (mirrored in `.env.test` for E2E runs — see e2e-test-writer skill):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/helpdesk?schema=public` |
| `BETTER_AUTH_SECRET` | Better Auth session signing secret |
| `BETTER_AUTH_URL` | The server's own URL (`http://localhost:4000` in dev) — used internally by Better Auth. Don't confuse with `CLIENT_URL` below. |
| `CLIENT_URL` / `TRUSTED_ORIGINS` | Frontend origin (`http://localhost:5173` in dev). Both variables are read by [server.ts](src/server.ts) (for CORS) and [auth.ts](src/auth.ts) (for `trustedOrigins`) and must be set to the same frontend origin value. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Credentials for the dev-seeded admin account, used by `seed.ts`. **Separate from** the E2E test credentials (`test-admin@example.com` / `testpassword123`) defined in `.env.test` — don't conflate the two when debugging login issues. |
| `WEBHOOK_SECRET` | Secret used to authenticate inbound email webhook requests at `POST /api/webhooks/email`. Verified via the `x-webhook-secret` header. |
| `GROQ_API_KEY` | Groq API key for AI features (ticket classification, auto-resolve, polish reply, summarization). Get from console.groq.com. |

## Tools & Context
### Documentation Fetching with Context7
When you need to look up documentation for the libraries used in this project (React, Express, Bun, Vite, etc.), use the **Context7 MCP**.

#### Steps to use Context7:
1. Always start with `resolve-library-id` using the library name and your question.
2. Pick the best match (ID format: `/org/project`) based on exact name match, description relevance, code snippet count, source reputation, and benchmark score.
3. Use `query-docs` with the selected library ID and the full question to fetch the most up-to-date documentation.
4. Use the fetched documentation to write code or answer questions.

*Do not use Context7 for refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.*

### Writing Component Tests
> [!IMPORTANT]
> **Primary Testing Strategy**: Rely mostly on component tests for verifying client-side behavior, page rendering, user interaction, API calls (using mocks), and routing logic. Avoid writing E2E tests for features that can be tested at the component level.

Component tests live in the `client/` directory and use **Vitest** as the test runner and **React Testing Library** for rendering and querying the DOM.

#### Setup & Configuration
- **Vitest config**: [client/vitest.config.ts](client/vitest.config.ts) — merges Vite config, sets `environment: 'jsdom'`, and points to the setup file.
- **Setup file**: [client/vitest.setup.ts](client/vitest.setup.ts) — imports `@testing-library/jest-dom` to register custom DOM matchers globally.
- **TypeScript**: `tsconfig.json` includes `"vitest/globals"` and `"@testing-library/jest-dom"` in `types`.

#### File Conventions
- Place test files in a `__tests__/` folder co-located with the component being tested (e.g. `client/src/pages/__tests__/Users.test.tsx`).
- Use the naming convention `<ComponentName>.test.tsx`.

#### Test Render Helper
- Use the shared `renderWithQuery` helper from [client/src/test-utils.tsx](client/src/test-utils.tsx) instead of manually wrapping components in providers.
- It wraps the component in both `QueryClientProvider` (with `retry: false`) and `MemoryRouter`.
- Import it as: `import { renderWithQuery } from '@/test-utils';`

#### Mocking Patterns
- **Mock `authClient`**: `vi.mock('@/lib/auth-client', () => ({ authClient: { useSession: vi.fn() } }))` — then control its return value per test with `(authClient.useSession as any).mockReturnValue(...)`.
- **Mock `axios`**: `vi.mock('axios')` — then control calls with `(axios.get as any).mockResolvedValue({ data: [...] })` or `.mockRejectedValue(new Error(...))` per test.
- Call `vi.resetAllMocks()` in `beforeEach` to ensure test isolation.

#### Scripts
| Script | Command | When to use |
|---|---|---|
| `bun run test` | `vitest run` | CI / verify all tests pass once |
| `bun run test:watch` | `vitest` | **Writing tests** — reruns on every file save |

### Writing E2E Tests with e2e-test-writer
> [!IMPORTANT]
> **Secondary Testing Strategy**: Use E2E tests only when absolutely necessary (e.g., complex multi-step user workflows spanning backend and frontend that cannot be reliably covered by component tests and mocks, or critical database persistence checks).
> 
> **E2E Testing Rules**:
> - **No Duplication**: Never write E2E tests for functionality covered by unit or component tests (e.g., individual field validation messages, specific component rendering options, static text, or visual styling).
> - **Scope**: Focus E2E tests strictly on verifying end-to-end multi-page transitions, actual browser-server network integration, and database persistence (e.g. confirming that creating/updating/deleting records actually persists after a page reload).
> - **Tests Placement**: Put E2E spec files in the `/e2e` directory with the naming format `*.spec.ts`.
> - **Execution**: Use the integrated scripts (`test:db:setup`, `test:e2e`, etc.) to setup testing conditions and run the test suite.


## Project Context
### Database
- **Provider**: PostgreSQL via Prisma ORM.
- **Client Output**: Custom location at `src/lib/prisma/client` (configured in [schema.prisma](prisma/schema.prisma)).
- **Connection String**: Configured in `prisma.config.ts` (Prisma 7+), not in `schema.prisma`.

### Authentication
- **Framework**: `better-auth` integration for both frontend and backend.
- **Configuration** ([src/auth.ts](src/auth.ts)):
  - **Email & Password**: Enabled.
  - **Registration Restriction**: `disableSignUp: true` is configured to prevent arbitrary registrations.
  - **Admin Plugin**: Configured with `defaultRole: UserRole.AGENT`.
  - **Role Enum**: `admin` and `agent` (defined in [types/index.ts](src/types/index.ts)).
- **Database Seeding**: Because public signup is disabled, the seeding script ([seed.ts](prisma/src/seed.ts)) uses `auth.api.createUser()` on the backend, which bypasses registration restrictions and handles hashing/account creation correctly.
- **Frontend Integration**:
  - Auth Client helper defined in [auth-client.ts](client/src/lib/auth-client.ts). Uses `adminClient` plugin to support client-side role definitions.
  - Uses `authClient.useSession()` for checking login state and user metadata.
  - Form submission targets `authClient.signIn.email({ email, password })`.

### Pages & Routing
- **Admin Users Page**: A page located at `/users` ([client/src/pages/Users.tsx](client/src/pages/Users.tsx)) with a simple "Users" heading:
  - Accessible only to administrators (`session.user.role === UserRole.ADMIN`).
  - Automatically redirects unauthenticated users to `/login`.
  - Displays a clean "Access Denied" view for authenticated users who are not administrators.
  - Added navigation links in [App.tsx](client/src/App.tsx) that conditionally render the `/users` link for administrators.

### Data Validation
- **Library**: Zod.
- **Usage**: All incoming request bodies (POST, PATCH) must be validated using Zod schemas before processing to ensure type safety and data integrity.
- **Shared Validation Schemas**:
  - Validation schemas shared between the client and the server (such as form inputs that match API payloads) are located in the local workspace package `core` (e.g. [core/src/schemas](core/src/schemas)).
  - To define a new schema:
    1. Create/update a schema file in `core/src/schemas/`.
    2. Export it from `core/src/index.ts`.
    3. Import it using `import { ... } from 'core'` in both the server (`src/`) and the client (`client/src/`).
  - Forms on the client should be built using `react-hook-form` and `@hookform/resolvers/zod` with these shared schemas (e.g. `CreateUserModal` in [Users.tsx](client/src/pages/Users.tsx)).

### Data Fetching & State Management
- **Axios & TanStack Query**: The client uses Axios as the HTTP client and `@tanstack/react-query` (v5) for managing server state.
  - The application is wrapped with `QueryClientProvider` in [App.tsx](client/src/App.tsx).
  - Use the `useQuery` hook for retrieving data and `useMutation` hooks for state modification requests (POST, PATCH, DELETE, etc.).
  - Ensure to call `queryClient.invalidateQueries({ queryKey: [...] })` inside mutation success callbacks to trigger automatic cache invalidation and UI updates.

### Ticket Categories
- **Enum**: `TicketCategory` with three values: `general_question`, `technical_question`, `refund_request`.
- **Prisma Schema**: Defined as a native PostgreSQL enum in [schema.prisma](prisma/schema.prisma). The `Ticket` model has a `category` field defaulting to `general_question`.
- **Shared Validation**: The `TICKET_CATEGORIES` const and the `category` field on both `createTicketSchema` and `updateTicketSchema` are defined in [core/src/schemas/ticket.ts](core/src/schemas/ticket.ts). Both the server routes ([src/routes/tickets.ts](src/routes/tickets.ts)) and client form ([CreateTicketModal.tsx](client/src/components/CreateTicketModal.tsx)) import these shared schemas — **do not duplicate them locally**.
- **TypeScript Types**: `TicketCategory` type alias is defined in both [src/types/index.ts](src/types/index.ts) (server) and [client/src/types.ts](client/src/types.ts) (client).
- **Frontend Display**: [TicketCard.tsx](client/src/components/TicketCard.tsx) renders a color-coded badge per category using `CATEGORY_LABELS` and `CATEGORY_BADGE_CLASSES` maps. Human-readable labels:
  | Enum Value | Display Label |
  |---|---|
  | `general_question` | General Question |
  | `technical_question` | Technical Question |
  | `refund_request` | Refund Request |

### AI-Powered Ticket Features
- **SDK**: Vercel AI SDK (`ai` + `@ai-sdk/groq`)
- **Model**: `openai/gpt-oss-20b` via Groq (migrated from deprecated `llama-3.1-8b-instant`)
- **API Key env var**: `GROQ_API_KEY`
- **Features**: ticket classification (auto-assigns category), auto-resolve via [knowledge-base.md](src/knowledge-base.md), polish reply button, ticket summarization
- **Location**: [src/routes/tickets.ts](src/routes/tickets.ts) (polish, summarize) and [src/lib/queue.ts](src/lib/queue.ts) (classification, auto-resolve)
- **Failure handling**: ticket creation always succeeds even if Groq call fails — classification falls back to `general_question`, auto-resolve skips and leaves ticket open for human agent.
- **Knowledge base**: [src/knowledge-base.md](src/knowledge-base.md) — read at runtime by the auto-resolve worker to determine if a ticket can be answered automatically.

### Ticket Replies
- **DB Schema**: The `TicketReply` model maps to the `ticket_reply` table in PostgreSQL.
- **Sender Type Enum**: `ReplySenderType` (`agent` and `customer`).
- **Creator Fields**: A reply can have an optional registered `userId` pointing to a `User` record (for agent replies) or optional `customerEmail` and `customerName` fields (for customer replies).
- **Shared Validation**: The `createReplySchema` (restricting content length to 1-5000 characters) is defined in [reply.ts](core/src/schemas/reply.ts) and shared via the `core` package.
- **Sender Formatting Utility**: The `getTicketSender` utility in [utils.ts](client/src/lib/utils.ts) parses and normalizes the name/email display of any ticket or customer reply sender, centralizing logic that was previously duplicated on the dashboard, tables, details cards, and reply threads.

## Lessons Learned & Gotchas
- **Ref Forwarding**: Custom UI wrappers (like `Input` inside `client/src/components/ui/input.tsx`) must be wrapped in `React.forwardRef` to allow `react-hook-form` to properly bind their DOM nodes and register input values.
- **CORS & Trusted Origins**: `trustedOrigins` in `src/auth.ts` must be set to `CLIENT_URL` (`http://localhost:5173` in dev), **not** `BETTER_AUTH_URL` (`http://localhost:4000`) — pointing it at the server's own URL causes Better Auth to reject requests with a CSRF error.
- **Better Auth Role Type Safety on Client**: To read and type custom fields (like `role` via the admin plugin) on the client, you must register the corresponding plugin (e.g. `adminClient()`) in the client's `createAuthClient` call. Otherwise, typescript will not know about the field on `session.user`.
- **jest-dom TypeScript types**: For `toBeInTheDocument()` and other jest-dom matchers to be recognised by `tsc`, both `"vitest/globals"` and `"@testing-library/jest-dom"` must be present in the `types` array in `client/tsconfig.json`. Missing either will cause TS2339 errors during `bun run build`.
- **Role Enum Usage**: Avoid using hardcoded magic strings like `'admin'` or `'agent'` for roles. Always import and use the `UserRole` enum (defined in `client/src/types.ts` for the client and `src/types/index.ts` for the server) to ensure strict type safety across components, page checks, and testing mocks.
- **Prisma 7 Config Location**: As of Prisma 7, the database connection string lives in `prisma.config.ts`, not in the `datasource` block of `schema.prisma`. If migrations or `prisma generate` fail with a missing-connection-string error, check `prisma.config.ts` first.
- **Testing Elements with Identical Text**: If a test involves text that could appear in multiple elements (e.g., matching the word `'Customer'` which shows up both as a ticket requester section heading and a reply role badge), use `getAllByText` or specific CSS selectors rather than a single `getByText` call to avoid Testing Library throwing a duplicate match error.
- **trust proxy for Railway**: Add `app.set('trust proxy', 1)` in [server.ts](src/server.ts) before rate limiters when deploying behind a reverse proxy (Railway, Render, etc.) to prevent `express-rate-limit` from throwing `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.
- **ticketNumber migration drift**: The `ticketNumber` column and updated `TicketStatus` enum (new, processing variants) were applied via db push locally, requiring a manual migration file to be created with `--create-only` to sync Railway's database.
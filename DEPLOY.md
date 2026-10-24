# Deploy

One container. The [Dockerfile](Dockerfile) builds the React app, generates the Prisma client, and on start runs migrations, seeds the admin (idempotent), then starts Express. Express serves the API and `client/dist` on the same origin.

[railway.toml](railway.toml) points Railway at that Dockerfile and health-checks `GET /api/health`.

## Railway

1. Create a project and add a **PostgreSQL** service.
2. Add this repo as a service. Builder is Dockerfile (`railway.toml` already sets that). Do not set a custom start command; the image `CMD` is the start command.
3. On the app service, set variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Reference the Postgres service connection string. Append `?schema=public` if it is missing. |
| `BETTER_AUTH_SECRET` | Random string, 32+ characters. |
| `BETTER_AUTH_URL` | Public URL of this service, no trailing slash. Example: `https://your-app.up.railway.app` |
| `CLIENT_URL` | Same public URL. The browser and the API share one origin. |
| `TRUSTED_ORIGINS` | Same value as `CLIENT_URL`. |
| `SEED_ADMIN_EMAIL` | Admin login email. |
| `SEED_ADMIN_PASSWORD` | Admin login password. Change it after the first login if this variable stays in the service config. |
| `WEBHOOK_SECRET` | Signing secret from the Resend inbound webhook. |
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com). |
| `RESEND_API_KEY` | From [resend.com](https://resend.com). |
| `SENTRY_DSN` | Optional. |
| `VITE_SENTRY_DSN` | Optional. Must be set **before** the image build; Vite inlines it. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Optional. Only for uploading source maps during `client` build. |

Leave `PORT` unset. Railway injects it, and the server listens on `process.env.PORT`.

4. Generate a public domain for the app service. Put that exact origin in `BETTER_AUTH_URL`, `CLIENT_URL`, and `TRUSTED_ORIGINS`, then redeploy so auth cookies and CORS match.
5. Open `/api/health`. A JSON `{ "status": "ok" }` means the process is up. Sign in at `/login` with `SEED_ADMIN_EMAIL`.

Each deploy runs `prisma migrate deploy` before the server accepts traffic. The seed skips users that already exist, including `ai@example.com`.

Point Resend's inbound webhook at `https://<your-domain>/api/webhooks/email` and set `WEBHOOK_SECRET` to that endpoint's signing secret.

### Health check

Configured in `railway.toml`:

- Path: `/api/health`
- Timeout: 60 seconds (migrations and seed run before listen)
- Restart: on failure

## Docker (production image)

Build and run against a Postgres you already have:

```bash
docker build -t resolvai .
docker run --env-file .env -e PORT=4000 -p 4000:4000 resolvai
```

`.env` must use production values: `DATABASE_URL` reachable from the container, and `BETTER_AUTH_URL` / `CLIENT_URL` set to the URL users open in the browser (for a local container, `http://localhost:4000` for both).

`Dockerfile.dev` and `docker compose` are for local development only. They bind-mount source and run Vite separately. Do not deploy them.

## What a successful boot looks like

Container logs, in order:

1. Prisma migrate deploy finishes with no pending failure.
2. Seed logs the admin (or says the email already exists) and the AI agent user.
3. Express logs that it is listening.
4. `GET /api/health` returns 200.

If the health check fails, the usual causes are a missing `DATABASE_URL`, a secret shorter than 32 characters, or migrations that cannot reach Postgres. The server does not listen until migrate and seed exit 0.

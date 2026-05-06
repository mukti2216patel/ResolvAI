---
name: security-reviewer
description: Perform a comprehensive security audit of the AI Helpdesk & Ticketing System codebase. Covers OWASP Top 10, authentication/authorization flaws, injection vulnerabilities, secrets exposure, security misconfigurations, dependency vulnerabilities, CORS issues, and API security. Use when asked to review code for security, audit vulnerabilities, check for CVEs, or harden the application.
---

# Security Vulnerability Review Guide

Perform a systematic, thorough security audit of the codebase. Follow the methodology below step by step and produce a structured report.

---

## Scope & Entry Points

For this project, always start with these files (in order):

| Priority | File(s) | Why |
|----------|---------|-----|
| 1 | `src/server.ts` | CORS, middleware, rate limiting, headers |
| 2 | `src/auth.ts` | Authentication config, session settings |
| 3 | `src/routes/` | Route handlers, auth guards, input handling |
| 4 | `src/middleware/` | Auth middleware, input validation |
| 5 | `prisma/schema.prisma` | Data model, relations |
| 6 | `prisma/src/seed.ts` | Hardcoded credentials in seed data |
| 7 | `client/src/lib/auth-client.ts` | Client-side auth configuration |
| 8 | `client/src/pages/` | Frontend input handling, XSS vectors |
| 9 | `client/src/components/` | Form components, unescaped rendering |
| 10 | `package.json` / `bun.lock` | Vulnerable dependencies |
| 11 | `.env` / `.env.example` | Secrets exposure |

---

## Vulnerability Checklist

Work through each category systematically. Mark each item ✅ (secure), ⚠️ (needs review), or ❌ (vulnerable).

### 1. Authentication & Authorization
- [ ] All sensitive routes protected by auth middleware
- [ ] Role-based access control (RBAC) enforced server-side (not just client-side)
- [ ] Admin-only routes check `role === 'admin'` on backend
- [ ] No IDOR (Insecure Direct Object Reference) — users can only access their own data
- [ ] Session tokens are invalidated on logout
- [ ] `better-auth` `disableSignUp` properly enforced
- [ ] Password reset flows are secure (rate-limited, token expiry)
- [ ] `BETTER_AUTH_SECRET` is sufficiently long (>= 32 chars) and not hardcoded

### 2. Injection Vulnerabilities
- [ ] No raw SQL queries with string interpolation — only Prisma parameterized queries
- [ ] No `$queryRaw` / `$executeRaw` with unsanitized user input
- [ ] No `eval()`, `new Function()`, or dynamic code execution
- [ ] No command injection via `child_process` with user input
- [ ] Template strings in queries use proper escaping

**Grep patterns to check:**
```bash
grep -rn "\$queryRaw\|\$executeRaw" src/
grep -rn "eval(" src/ client/src/
grep -rn "child_process" src/
```

### 3. Cross-Site Scripting (XSS)
- [ ] React renders user content safely (no `dangerouslySetInnerHTML`)
- [ ] User-supplied data is not injected into `innerHTML`, `document.write`, etc.
- [ ] Content-Security-Policy (CSP) header is configured
- [ ] `X-XSS-Protection` header is set

**Grep patterns to check:**
```bash
grep -rn "dangerouslySetInnerHTML" client/src/
grep -rn "innerHTML\|document\.write" client/src/
```

### 4. Sensitive Data Exposure
- [ ] No hardcoded secrets, passwords, or API keys in source files
- [ ] `.env` is in `.gitignore` and not committed
- [ ] Error responses don't expose stack traces to clients
- [ ] Database connection strings not in frontend code
- [ ] Sensitive fields (passwords) never returned in API responses
- [ ] Prisma `select` used to exclude sensitive fields from responses

**Grep patterns to check:**
```bash
grep -rn "password\|secret\|apiKey\|api_key" src/ --include="*.ts" | grep -v ".env"
grep -rn "console\.error\|console\.log" src/routes/
```

### 5. Security Misconfiguration
- [ ] CORS: `origin` is NOT a wildcard `*` when `credentials: true`
- [ ] CORS: Allowed origins explicitly listed (not `true` or `*`)
- [ ] Security headers set: `Helmet.js` or manual headers
  - `Strict-Transport-Security` (HSTS)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Content-Security-Policy`
- [ ] No debug/verbose logging enabled in production paths
- [ ] `NODE_ENV` check before exposing debug info

**Grep patterns to check:**
```bash
grep -rn "cors(" src/
grep -rn "helmet\|X-Frame\|X-Content-Type\|Strict-Transport" src/
```

### 6. Rate Limiting & DoS Protection
- [ ] Rate limiting applied to auth endpoints (`/api/auth/sign-in`, etc.)
- [ ] Rate limiting applied to AI/LLM endpoints (expensive operations)
- [ ] File upload size limits configured
- [ ] Request body size limits set (e.g., `express.json({ limit: '...' })`)

**Grep patterns to check:**
```bash
grep -rn "rateLimit\|rate-limit\|express-rate" src/
grep -rn "json({" src/server.ts
```

### 7. CSRF Protection
- [ ] State-changing requests protected (POST/PUT/DELETE)
- [ ] `better-auth` CSRF protection not explicitly disabled (`disableCSRFCheck` not set to `true`)
- [ ] `SameSite` cookie attribute properly configured
- [ ] `trustedOrigins` in `auth.ts` is not overly permissive

### 8. Dependency Vulnerabilities
- [ ] Run `npm audit` / `bun audit` — no Critical or High CVEs
- [ ] Dependencies are up to date
- [ ] No deprecated packages with known vulnerabilities

**Command to run:**
```bash
cd /media/ays19/Learning2/Claude\ Code\ for\ Professional\ Developers/code/AI\ Helpdesk\ \&\ Ticketing\ System
bun audit
```

### 9. API Security
- [ ] All API endpoints validate and sanitize input
- [ ] Responses don't leak internal implementation details (table names, stack traces)
- [ ] HTTP methods are restricted to what's needed (no open `app.use()` on sensitive paths)
- [ ] Pagination limits enforced (no unbounded queries)
- [ ] File upload endpoints validate MIME types and sizes

### 10. Frontend Security
- [ ] Auth state is verified server-side, not just client-side
- [ ] Sensitive data not stored in `localStorage` or `sessionStorage`
- [ ] No sensitive data in URL query params
- [ ] Environment variables prefixed with `VITE_` do not contain secrets

**Grep patterns to check:**
```bash
grep -rn "localStorage\|sessionStorage" client/src/
grep -rn "VITE_.*SECRET\|VITE_.*KEY\|VITE_.*PASSWORD" client/src/
```

---

## Reporting Format

After completing the audit, produce a report saved as a markdown artifact.

### Report Structure

```markdown
# Security Audit Report — AI Helpdesk & Ticketing System
**Date:** YYYY-MM-DD
**Auditor:** Security Review Agent
**Overall Risk:** Critical / High / Medium / Low

---

## Executive Summary
- Total findings: N
- Critical: N | High: N | Medium: N | Low: N | Informational: N

---

## Findings Summary Table
| ID | Severity | Category | Location | Title |
|----|----------|----------|----------|-------|
| SEC-001 | High | Auth | src/routes/tickets.ts:42 | Missing auth guard |

---

## Detailed Findings

### SEC-001 — [Title]
- **Severity**: High
- **Category**: Authorization
- **Location**: [src/routes/tickets.ts](file:///path/to/file#L42)
- **Description**: ...
- **Evidence**:
  ```typescript
  // vulnerable code snippet
  ```
- **Recommendation**: ...
  ```typescript
  // fixed code snippet
  ```

---

## Positive Security Controls
List what is already done well.

---

## Remediation Roadmap
Prioritized list of fixes by severity.
```

---

## Common Gotchas for This Stack

1. **Prisma + TypeScript** — `$queryRaw` accepts template literals safely, but `$queryRawUnsafe` does NOT — flag any use of the latter.
2. **Better Auth CORS** — `trustedOrigins` in `auth.ts` must not include `*` or overly broad patterns.
3. **React + Vite** — `VITE_` prefixed env vars are embedded in the client bundle and visible to users — never put secrets there.
4. **Bun runtime** — Check if `bun:ffi` or native modules are used, as they bypass normal security sandboxing.
5. **Admin plugin (better-auth)** — Verify that admin-only APIs are protected by server-side role checks, not just frontend route guards.
6. **`disableSignUp: true`** — Confirm this is actually enforced and not bypassable via direct API calls.

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Better Auth Security Options](https://better-auth.com/docs/reference/options#advanced)
- [Prisma Security Guide](https://www.prisma.io/docs/orm/prisma-client/security)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js](https://helmetjs.github.io/)
- [React XSS Guide](https://legacy.reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

---
name: e2e-test-writer
description: Write and execute end-to-end tests for the AI Helpdesk & Ticketing System using Playwright. Use when asked to write new E2E tests, debug existing tests, configure Playwright behavior, or automate browser actions for authentication and ticket management.
---

# Playwright E2E Testing Guide

Follow this guide to write robust, maintainable E2E tests for the Helpdesk system.

---

## Testing Environment & Setup

- **E2E Testing Framework**: Playwright (`@playwright/test`).
- **Test Database**: Separate PostgreSQL database `helpdesk_test` (configured in `.env.test`).
- **Client URL**: `http://localhost:5173`
- **Server URL**: `http://localhost:4000` (proxied by Vite at `/api`)
- **Credentials**:
  - Email: `test-admin@example.com`
  - Password: `testpassword123`
- **Database Setup**: Managed via `bun run test:db:setup` which runs `prisma migrate reset --force` to deploy all migrations (creating `_prisma_migrations` metadata table) and then seeds the database.
- **Playwright Execution**: Playwright automatically boots the test database, backend Express server (in test environment), and client Vite server using its `webServer` configuration.

---

## Test Directory Structure

All E2E test files must be placed in the `e2e` directory in the root of the project:
```
/media/ays19/Learning2/Claude Code for Professional Developers/code/AI Helpdesk & Ticketing System/e2e/
```
Name test files with the `.spec.ts` extension (e.g., `login.spec.ts`, `tickets.spec.ts`).

---

## Writing Tests

### 1. Basic Structure
Import `test` and `expect` from `@playwright/test`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Helpdesk Authentication', () => {
  test('should redirect to login if unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });
});
```

### 2. Signing In (Authentication flow)
Use standard page locators to log in. Since public signup is disabled, use the pre-seeded admin account:
```typescript
test('admin can log in successfully', async ({ page }) => {
  await page.goto('/login');

  // Fill credentials
  await page.getByPlaceholder('Email address').fill('test-admin@example.com');
  await page.getByPlaceholder('Password').fill('testpassword123');

  // Submit form
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Verify redirection to home and correct URL
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Welcome, Admin')).toBeVisible();
});
```
> Verify the actual placeholder text against `Login.tsx` before relying on this locator — it hasn't been confirmed against the real component.

### 3. Creating and Managing Tickets
Interact with modal forms, select inputs, and list elements:
```typescript
test('should create a new ticket', async ({ page }) => {
  // Assume logged in
  await page.goto('/');

  // Open creation modal
  await page.getByRole('button', { name: 'New Ticket' }).click();

  // Fill out the ticket details
  await page.getByLabel('Title').fill('E2E Test Ticket');
  await page.getByLabel('Description').fill('Detailed description of E2E test ticket');

  // Priority and Category are shadcn/ui Select components (Radix-based),
  // NOT native <select> elements — selectOption() will NOT work on them.
  // Open the trigger, then click the option from the portal-rendered listbox.
  await page.getByLabel('Priority').click();
  await page.getByRole('option', { name: 'High' }).click();

  // Submit
  await page.getByRole('button', { name: 'Create Ticket' }).click();

  // Verify ticket card is created
  await expect(page.getByText('E2E Test Ticket')).toBeVisible();
});
```

### 4. Interacting with shadcn/ui Select Dropdowns
This project's dropdowns (Priority, Category, etc.) use shadcn/ui's `Select`, which renders as a trigger button plus a portal-rendered listbox — not a native HTML `<select>`. Never use `.selectOption()` on these.

```typescript
// 1. Click the trigger to open the listbox
await page.getByLabel('Category').click();
// or, if it isn't associated with a <label for>:
// await page.getByRole('combobox', { name: 'Category' }).click();

// 2. Click the desired option by its visible text
await page.getByRole('option', { name: 'Technical Question' }).click();
```

---

## Running and Debugging Tests

Use the following npm/bun scripts configured in the project root:

| Command | Purpose |
|---------|---------|
| `bun run test:e2e` | Setup test database and run all Playwright tests headlessly |
| `bun run test:e2e:ui` | Setup test database and open the interactive Playwright test runner UI |
| `bun run test:e2e:debug` | Setup test database and run tests in debugging mode step-by-step |
| `bun run test:db:setup` | Manually reset and seed the test database |

---

## Best Practices

1. **Isolation**: Do not share state across tests. Ensure each test navigates cleanly and doesn't rely on side effects of other tests.
2. **Locators**: Prefer user-facing locators (`getByRole`, `getByText`, `getByPlaceholder`, `getByLabel`) over CSS classes or XPath selectors.
3. **Assertions**: Use auto-retrying assertions like `expect(locator).toBeVisible()` or `expect(locator).toHaveText()` to handle asynchronous DOM updates.
4. **Environment Cleanliness**: Use the database setup script to keep test runs predictable.
5. **No Hardcoded Secrets**: Keep the test database credentials aligned with `.env.test`.
6. **Prisma Migrations on Test DB**: Using `prisma db push` does not generate the metadata table `_prisma_migrations`. To ensure it is tracked properly, use `prisma migrate reset --force` instead when configuring or setting up the test database.
7. **shadcn/ui Select Components**: Never use `.selectOption()` on Priority, Category, or any other shadcn `Select` field — it's not a native `<select>`. Click the trigger, then click the `role="option"` element (see section 4 above).
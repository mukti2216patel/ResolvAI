/**
 * e2e/tickets.spec.ts
 *
 * Only tests that require the real DB + browser survive here.
 * Removed tests and where they now live:
 *
 *   ✦ Priority emoji badge        → TicketCard.test.tsx (it.each priorities)
 *   ✦ Category badge              → TicketCard.test.tsx (category tests)
 *   ✦ Status filter bar           → TicketDashboard.test.tsx
 *   ✦ Empty state                 → TicketDashboard.test.tsx
 *   ✦ Modal cancel / backdrop     → CreateTicketModal.test.tsx
 *   ✦ Client-side validation      → CreateTicketModal.test.tsx
 *   ✦ Unauthenticated redirect    → auth.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const ADMIN_USER = {
  email: 'test-admin@example.com',
  password: 'testpassword123',
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#login-email', ADMIN_USER.email);
  await page.fill('#login-password', ADMIN_USER.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

/** Opens the "New Ticket" modal. */
async function openCreateModal(page: Page) {
  await page.getByRole('button', { name: /new ticket/i }).click();
  await expect(page.getByRole('heading', { name: /create new ticket/i })).toBeVisible();
}

/** Fills and submits the create-ticket form. */
async function createTicket(
  page: Page,
  opts: {
    title: string;
    description?: string;
    priority?: string;
    category?: string;
  },
) {
  await openCreateModal(page);

  await page.locator('form').getByLabel('Title *').fill(opts.title);

  if (opts.description) {
    await page.locator('form').getByLabel('Description').fill(opts.description);
  }
  if (opts.priority) {
    await page.locator('form select#priority').selectOption(opts.priority);
  }
  if (opts.category) {
    await page.locator('form select#category').selectOption(opts.category);
  }

  await page.getByRole('button', { name: /create ticket/i }).click();

  await expect(page.getByRole('heading', { name: /create new ticket/i })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: opts.title, level: 3 })).toBeVisible();
}

/**
 * Returns the specific ticket row by its title.
 * Navigates up 2 levels from the h3: h3 → title cell div → row div.
 */
function getTicketRow(page: Page, title: string) {
  return page.locator('div.bg-bg-card').filter({
    has: page.getByRole('heading', { name: title, level: 3 }),
  });
}

// ---------------------------------------------------------------------------
// Tests — DB-dependent only
// ---------------------------------------------------------------------------

test.describe('Ticket Dashboard – DB-Dependent Flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── 1. Create + Persistence ───────────────────────────────────────────────

  test('should create a ticket and persist it so it survives a page reload', async ({ page }) => {
    const title = `Persist Test ${Date.now()}`;

    await createTicket(page, {
      title,
      description: 'This ticket should survive a reload.',
      priority: 'high',
      category: 'technical_question',
    });

    await page.reload();

    await expect(page.getByRole('heading', { name: title, level: 3 })).toBeVisible();
  });

  // ── 2. Status update + DB persistence ─────────────────────────────────────

  test('should update ticket status via the dropdown and persist it after reload', async ({
    page,
  }) => {
    const title = `Status Persist Test ${Date.now()}`;

    await createTicket(page, { title, priority: 'low' });

    const card = getTicketRow(page, title);
    await card.getByRole('combobox').selectOption('resolved');

    await expect(card.locator('span', { hasText: /resolved/i })).toBeVisible();

    await page.reload();

    await expect(getTicketRow(page, title).getByRole('combobox')).toHaveValue('resolved');
  });

  // ── 3. Delete + DB persistence ────────────────────────────────────────────

  test('should delete a ticket and remove it from the list permanently', async ({ page }) => {
    const title = `Delete Persist Test ${Date.now()}`;

    await createTicket(page, { title });

    const card = getTicketRow(page, title);
    await card.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByRole('heading', { name: title, level: 3 })).not.toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: title, level: 3 })).not.toBeVisible();
  });

  // ── 4. Newest-first ordering (API-level sort) ─────────────────────────────

  test('should list tickets in newest-first order after creation', async ({ page }) => {
    const olderTitle = `Older Ticket ${Date.now()}`;
    const newerTitle = `Newer Ticket ${Date.now() + 1}`;

    await createTicket(page, { title: olderTitle });
    await createTicket(page, { title: newerTitle });

    const headings = await page.getByRole('heading', { level: 3 }).allTextContents();
    const olderIdx = headings.indexOf(olderTitle);
    const newerIdx = headings.indexOf(newerTitle);

    expect(newerIdx).toBeGreaterThan(-1);
    expect(olderIdx).toBeGreaterThan(-1);
    expect(newerIdx).toBeLessThan(olderIdx);
  });
});
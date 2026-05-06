/**
 * e2e/users.spec.ts
 *
 * Only tests that require the real DB + auth server survive here.
 * Removed tests and where they now live:
 *
 *   ✦ Client-side validation errors in create form  → UserModal.test.tsx
 *   ✦ Disable delete button for admin users         → UserTable.test.tsx
 */

import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  email: 'test-admin@example.com',
  password: 'testpassword123',
};

const uniqueUser = (prefix: string, testInfo: { project: { name: string } }) => {
  const uniqueId = `${testInfo.project.name}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: uniqueId,
    name: `${prefix} ${uniqueId}`,
    email: `${prefix.toLowerCase().replace(/\s+/g, '-')}-${uniqueId}@example.com`,
    password: 'password123',
  };
};

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
}

async function openUsersPage(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page).toHaveURL('/users');
}

async function createUser(
  page: import('@playwright/test').Page,
  user: { name: string; email: string; password: string },
) {
  await page.getByRole('button', { name: 'Create User' }).click();
  await expect(page.locator('#user-modal-title')).toHaveText('Create User');
  await page.fill('#u-name', user.name);
  await page.fill('#u-email', user.email);
  await page.fill('#u-password', user.password);
  await page.click('form button[type="submit"]');
  await expect(page.locator('#user-modal-title')).not.toBeVisible();
}

const userRow = (page: import('@playwright/test').Page, name: string) =>
  page.locator('tr', { hasText: name });

test.describe('User Management (CRUD Happy Paths & Validation)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_USER.email, ADMIN_USER.password);
    await expect(page).toHaveURL('/');
  });

  // ── 1. Full CRUD cycle ────────────────────────────────────────────────────

  test('should support the full user CRUD cycle', async ({ page }, testInfo) => {
    const uniqueId = `${testInfo.project.name}-${Math.random().toString(36).substring(2, 7)}`;
    const agentEmail = `e2e-agent-${uniqueId}@example.com`;
    const agentName = `E2E Agent ${uniqueId}`;
    const agentNameUpdated = `E2E Agent Updated ${uniqueId}`;

    // 1. NAVIGATE
    await page.click('text=Users');
    await expect(page).toHaveURL('/users');

    // 2. READ
    const adminRow = page.locator('tr:has-text("Admin")').first();
    await expect(adminRow).toBeVisible();
    await expect(adminRow).toContainText(ADMIN_USER.email);
    await expect(adminRow).toContainText('admin');

    // 3. CREATE
    await page.click('button:has-text("Create User")');
    const modalTitle = page.locator('#user-modal-title');
    await expect(modalTitle).toHaveText('Create User');

    await page.fill('#u-name', agentName);
    await page.fill('#u-email', agentEmail);
    await page.fill('#u-password', 'agentpass123');
    await page.click('form button[type="submit"]');

    await expect(modalTitle).not.toBeVisible();
    const agentRow = page.locator(`tr:has-text("${agentName}")`);
    await expect(agentRow).toBeVisible();
    await expect(agentRow).toContainText(agentEmail);
    await expect(agentRow).toContainText('agent');

    // 4. UPDATE
    const editBtn = page.locator(`button[aria-label="Edit ${agentName}"]`);
    await editBtn.click();

    await expect(modalTitle).toHaveText('Edit User');
    await expect(page.locator('#u-name')).toHaveValue(agentName);
    await expect(page.locator('#u-email')).toHaveValue(agentEmail);

    await page.fill('#u-name', agentNameUpdated);
    await page.click('form button[type="submit"]');

    await expect(modalTitle).not.toBeVisible();
    const updatedRow = page.locator(`tr:has-text("${agentNameUpdated}")`);
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText(agentEmail);

    // 5. DELETE
    const deleteBtn = page.locator(`button[aria-label="Delete ${agentNameUpdated}"]`);
    await deleteBtn.click();

    await expect(page.getByRole('heading', { name: 'Delete User' })).toBeVisible();
    await page.click('button:has-text("Delete User")');
    await expect(updatedRow).not.toBeVisible();
  });

  // ── 2. Server-side duplicate email error ──────────────────────────────────

  test('should show server-side duplicate email error during creation and update', async ({ page }, testInfo) => {
    const uniqueId = `${testInfo.project.name}-${Math.random().toString(36).substring(2, 7)}`;
    const nameA = `Agent A ${uniqueId}`;
    const nameB = `Agent B ${uniqueId}`;
    const emailA = `agent-a-${uniqueId}@example.com`;
    const emailB = `agent-b-${uniqueId}@example.com`;

    await openUsersPage(page);

    // Create Agent A
    await page.click('button:has-text("Create User")');
    await page.fill('#u-name', nameA);
    await page.fill('#u-email', emailA);
    await page.fill('#u-password', 'password123');
    await page.click('form button[type="submit"]');
    await expect(page.locator('#user-modal-title')).not.toBeVisible();
    await expect(page.locator(`tr:has-text("${nameA}")`)).toBeVisible();

    // Create Agent B
    await page.click('button:has-text("Create User")');
    await page.fill('#u-name', nameB);
    await page.fill('#u-email', emailB);
    await page.fill('#u-password', 'password123');
    await page.click('form button[type="submit"]');
    await expect(page.locator('#user-modal-title')).not.toBeVisible();
    await expect(page.locator(`tr:has-text("${nameB}")`)).toBeVisible();

    // Try duplicate email on create
    await page.click('button:has-text("Create User")');
    await page.fill('#u-name', `Agent Duplicate ${uniqueId}`);
    await page.fill('#u-email', emailA);
    await page.fill('#u-password', 'password123');
    await page.click('form button[type="submit"]');

    const serverError = page.locator('form div:has-text("Email already exists")');
    await expect(serverError).toBeVisible();

    await page.click('button:has-text("Cancel")');
    await expect(page.locator('#user-modal-title')).not.toBeVisible();

    // Try duplicate email on update
    const editBtn = page.locator(`button[aria-label="Edit ${nameB}"]`);
    await editBtn.click();
    await expect(page.locator('#user-modal-title')).toHaveText('Edit User');
    await page.fill('#u-email', emailA);
    await page.click('form button[type="submit"]');

    const updateError = page.locator('form div:has-text("Email is already in use by another user")');
    await expect(updateError).toBeVisible();

    await page.click('button:has-text("Cancel")');
    await expect(page.locator('#user-modal-title')).not.toBeVisible();
  });

  // ── 3. Non-admin access denial ────────────────────────────────────────────

  test('should prevent non-admin users from accessing user directory', async ({ page }, testInfo) => {
    const uniqueId = `${testInfo.project.name}-${Math.random().toString(36).substring(2, 7)}`;
    const agentName = `Security Agent ${uniqueId}`;
    const agentEmail = `agent-security-${uniqueId}@example.com`;
    const agentPassword = `password123`;

    await openUsersPage(page);

    // Admin creates agent
    await page.click('button:has-text("Create User")');
    await page.fill('#u-name', agentName);
    await page.fill('#u-email', agentEmail);
    await page.fill('#u-password', agentPassword);
    await page.click('form button[type="submit"]');
    await expect(page.locator('#user-modal-title')).not.toBeVisible();
    await expect(page.locator(`tr:has-text("${agentName}")`)).toBeVisible();

    // Admin signs out
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL('/login');

    // Log in as agent
    await page.fill('#login-email', agentEmail);
    await page.fill('#login-password', agentPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Users link must not be visible
    await expect(page.locator('a:has-text("Users")')).not.toBeVisible();

    // Direct navigation shows Access Denied
    await page.goto('/users');
    await expect(page).toHaveURL('/users');
    await expect(page.locator('h2:has-text("Access Denied")')).toBeVisible();
    await expect(page.locator('text=This page is only accessible to administrators.')).toBeVisible();

    await page.click('text=Back to Home');
    await expect(page).toHaveURL('/');
  });

  // ── 4. Email normalisation + newest-first order ───────────────────────────

  test('should create users with normalized email and show them in newest-first order', async ({ page }, testInfo) => {
    const olderUser = uniqueUser('Read Agent Older', testInfo);
    const newerUser = uniqueUser('Read Agent Newer', testInfo);
    newerUser.email = newerUser.email.toUpperCase();

    await openUsersPage(page);

    await createUser(page, olderUser);
    await expect(userRow(page, olderUser.name)).toContainText(olderUser.email);

    await createUser(page, newerUser);

    const normalizedNewerEmail = newerUser.email.toLowerCase();
    await expect(userRow(page, newerUser.name)).toContainText(normalizedNewerEmail);
    await expect(userRow(page, newerUser.name)).toContainText('agent');

    const names = await page.locator('tbody tr td span.font-medium').allTextContents();
    const newerIndex = names.indexOf(newerUser.name);
    const olderIndex = names.indexOf(olderUser.name);
    expect(newerIndex).toBeGreaterThan(-1);
    expect(olderIndex).toBeGreaterThan(-1);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  // ── 5. Password update keeps account usable ───────────────────────────────

  test('should update a user password and keep the account usable', async ({ page }, testInfo) => {
    const agent = uniqueUser('Password Agent', testInfo);
    const updatedName = `${agent.name} Updated`;
    const updatedPassword = 'updatedpass123';

    await openUsersPage(page);
    await createUser(page, agent);

    await page.locator(`button[aria-label="Edit ${agent.name}"]`).click();
    await expect(page.locator('#user-modal-title')).toHaveText('Edit User');
    await page.fill('#u-name', updatedName);
    await page.fill('#u-password', updatedPassword);
    await page.click('form button[type="submit"]');
    await expect(page.locator('#user-modal-title')).not.toBeVisible();
    await expect(userRow(page, updatedName)).toContainText(agent.email);

    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL('/login');

    // Old password must fail
    await login(page, agent.email, agent.password);
    await expect(page.locator('div[role="alert"]')).toBeVisible();

    // New password must succeed
    await login(page, agent.email, updatedPassword);
    await expect(page).toHaveURL('/');
  });

  // ── 6. Cancel delete keeps user; deletion blocks login ───────────────────

  test('should keep the user when delete is cancelled and block login after deletion', async ({ page }, testInfo) => {
    const agent = uniqueUser('Delete Agent', testInfo);

    await openUsersPage(page);
    await createUser(page, agent);

    const row = userRow(page, agent.name);
    await expect(row).toBeVisible();

    // Cancel — user must remain
    await page.locator(`button[aria-label="Delete ${agent.name}"]`).click();
    await expect(page.getByRole('heading', { name: 'Delete User' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Delete User' })).not.toBeVisible();
    await expect(row).toBeVisible();

    // Confirm delete — user must disappear
    await page.locator(`button[aria-label="Delete ${agent.name}"]`).click();
    await page.click('button:has-text("Delete User")');
    await expect(row).not.toBeVisible();

    // Login with deleted account must fail
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL('/login');

    await login(page, agent.email, agent.password);
    await expect(page.locator('div[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  // ── 7. Agent restore unassigns tickets ───────────────────────────────────

  test('should restore an agent and atomically set assignedToId to null on their tickets', async ({ page }, testInfo) => {
    const agent = uniqueUser('Restore Agent', testInfo);

    // 1. Create the agent in the UI
    await openUsersPage(page);
    await createUser(page, agent);

    const row = userRow(page, agent.name);
    await expect(row).toBeVisible();

    // Fetch the users list via API to get the user's ID
    const usersResponse = await page.context().request.get('/api/users');
    expect(usersResponse.ok()).toBeTruthy();
    const users = await usersResponse.json();
    const dbAgent = users.find((u: any) => u.email === agent.email);
    expect(dbAgent).toBeDefined();
    const agentId = dbAgent.id;

    // 2. Create a ticket and assign it to the agent
    const ticketTitle = `Ticket for restore test ${agent.id}`;
    const createTicketRes = await page.context().request.post('/api/tickets', {
      data: {
        title: ticketTitle,
        description: 'Test description',
        priority: 'medium',
        category: 'general_question',
        assigned_to: agentId,
      }
    });
    expect(createTicketRes.ok()).toBeTruthy();
    const ticket = await createTicketRes.json();
    expect(ticket.assignedToId).toBe(agentId);

    // 3. Delete (soft-delete) the agent
    await page.locator(`button[aria-label="Delete ${agent.name}"]`).click();
    await page.click('button:has-text("Delete User")');
    await expect(row).not.toBeVisible();

    // Verify immediately after delete that the ticket was unassigned
    const getTicketAfterDeleteRes = await page.context().request.get(`/api/tickets/${ticket.id}`);
    expect(getTicketAfterDeleteRes.ok()).toBeTruthy();
    const ticketAfterDelete = await getTicketAfterDeleteRes.json();
    expect(ticketAfterDelete.assignedToId).toBeNull();
    expect(ticketAfterDelete.assignedTo).toBeNull();

    // 4. Restore the agent via PATCH /api/users/:id
    const restoreRes = await page.context().request.patch(`/api/users/${agentId}`, {
      data: {
        deletedAt: null
      }
    });
    expect(restoreRes.ok()).toBeTruthy();
    const restoreJson = await restoreRes.json();
    
    // Verify the restored user is returned and deletedAt is null
    expect(restoreJson.user.deletedAt).toBeNull();

    // Verify in database / GET /api/tickets/:id that the ticket is indeed still unassigned
    const getTicketRes = await page.context().request.get(`/api/tickets/${ticket.id}`);
    expect(getTicketRes.ok()).toBeTruthy();
    const fetchedTicket = await getTicketRes.json();
    expect(fetchedTicket.assignedToId).toBeNull();
    expect(fetchedTicket.assignedTo).toBeNull();
  });
});
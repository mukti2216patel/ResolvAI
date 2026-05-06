import { test, expect } from '@playwright/test';
import crypto from 'crypto';

const WEBHOOK_SECRET = 'whsec_dGVzdF93ZWJob29rX3NlY3JldF8xMjM=';

function getSvixHeaders(secret: string, payload: any) {
  const svixId = `msg_${Date.now()}`;
  const svixTimestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);
  
  const secretBytes = Buffer.from(secret.split('_')[1], 'base64');
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');
    
  return {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': `v1,${signature}`,
  };
}

test.describe('Email-to-Ticket Webhook', () => {
  // Configured server configurations based on your playwright.config.ts
  const SERVER_URL = 'http://localhost:4100/api/webhooks/email';
  const BACKEND_URL = 'http://localhost:4100';

  const AUTH_USER = {
    email: 'test-admin@example.com',
    password: 'testpassword123',
    name: 'Test Admin'
  };

  // Ensure the user context exists in the backend instance before webhooks drop
  test.beforeAll(async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({ baseURL: BACKEND_URL });
    try {
      await apiContext.post('/api/auth/sign-up', {
        data: {
          email: AUTH_USER.email,
          password: AUTH_USER.password,
          name: AUTH_USER.name,
        }
      });
    } catch (e) {
      console.log('Setup notice: Test user might already exist, proceeding to tests.');
    } finally {
      await apiContext.dispose();
    }
  });

  test('should create a ticket for a registered user and link it', async ({ page, request }) => {
    const payload = {
      from: AUTH_USER.email,
      subject: 'E2E Registered User Ticket',
      body: 'This ticket should be linked to the admin user.',
    };

    // Use built-in Playwright request fixture instead of Axios
    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: getSvixHeaders(WEBHOOK_SECRET, payload)
    });
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.userId).not.toBeNull(); 
    expect(data.customerEmail).toBe(payload.from);

    // Verify UI mapping matches updated database state
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Fix: Using an explicit accessible role and targeting the first instance to clear strict mode conflicts
    await expect(page.getByRole('heading', { name: 'E2E Registered User Ticket' }).first()).toBeVisible();
  });

  test('should create a ticket for an unknown user without linking', async ({ page, request }) => {
    const payload = {
      from: 'stranger@example.com',
      subject: 'E2E Unknown User Ticket',
      body: 'This ticket should not be linked to any user.',
    };

    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: getSvixHeaders(WEBHOOK_SECRET, payload)
    });
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.userId).toBeNull();
    expect(data.customerEmail).toBe(payload.from);

    // Verify it appears in the system interface dashboard
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Fix: Using an explicit accessible role and targeting the first instance to clear strict mode conflicts
    await expect(page.getByRole('heading', { name: 'E2E Unknown User Ticket' }).first()).toBeVisible();
  });

  test('should auto-classify ticket category based on keywords in non-blocking fashion', async ({ page, request }) => {
    const payload = {
      from: AUTH_USER.email,
      subject: 'Refund Request for Defective Item',
      body: 'I am writing to demand a refund for my order.',
    };

    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: getSvixHeaders(WEBHOOK_SECRET, payload)
    });
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.category).toBe('general_question'); // Initially returns the default general_question category

    // Log in and check UI
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify it got updated to Refund Request
    await expect(page.locator('span', { hasText: 'Refund Request' }).first()).toBeVisible();
  });

  test('should return 400 for invalid payload', async ({ request }) => {
    const payload = {
      from: 'not-an-email',
      subject: 'Invalid Ticket',
    };

    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: getSvixHeaders(WEBHOOK_SECRET, payload)
    });
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
  });

  test('should auto-resolve ticket using knowledge base and transition status', async ({ page, request }) => {
    const payload = {
      from: AUTH_USER.email,
      subject: 'forgot my password',
      body: 'Hello, I forgot my password. Can you please help me reset it?',
    };

    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: getSvixHeaders(WEBHOOK_SECRET, payload)
    });
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();

    // Log in
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Go to the ticket details page directly, which automatically waits/retries
    await page.goto(`/tickets/${data.ticketNumber}`);
    await expect(page.getByRole('heading', { name: 'forgot my password' })).toBeVisible();

    // Wait for the status badge to update to RESOLVED
    await expect(page.locator('span', { hasText: 'RESOLVED' }).first()).toBeVisible();

    // Verify AI Assistant's reply
    await expect(page.getByText('AI Assistant').first()).toBeVisible();
    await expect(page.getByText('Dear Admin,')).toBeVisible();
    await expect(page.getByText('To reset your password, go to the login page, click Forgot Password, and follow the instructions.')).toBeVisible();
    await expect(page.getByText("Best regards,\nSharar's")).toBeVisible();

    // Verify it is assigned to AI agent (not unassigned)
    await expect(page.locator('select#details-assign')).not.toHaveValue('unassigned');

    // Go back to the dashboard and verify the card status select value is 'resolved'
    await page.goto('/');
    const card = page.locator('div.bg-bg-card').filter({
      has: page.getByRole('heading', { name: 'forgot my password', level: 3 }),
    });
    await expect(card).toBeVisible();
    await expect(card.getByRole('combobox')).toHaveValue('resolved');
  });

  test('should hide tickets in processing status from the ticket list', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Create a ticket via UI
    await page.getByRole('button', { name: /new ticket/i }).click();
    const title = `Processing Hide Test ${Date.now()}`;
    await page.locator('form').getByLabel('Title *').fill(title);
    await page.getByRole('button', { name: /create ticket/i }).click();

    // Verify it is initially visible on the list
    const card = page.locator('div.bg-bg-card').filter({
      has: page.getByRole('heading', { name: title, level: 3 }),
    });
    await expect(card).toBeVisible();

    // Change status to 'processing' using the card dropdown
    await card.getByRole('combobox').selectOption('processing');

    // Reload page and verify it is hidden from the ticket list
    await page.reload();
    await expect(page.getByRole('heading', { name: title, level: 3 })).not.toBeVisible();
  });

  test('should reset status to open if processing fails/throws', async ({ page, request }) => {
    const payload = {
      from: AUTH_USER.email,
      subject: 'simulate-error',
      body: 'Trigger a throw in the worker',
    };

    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: getSvixHeaders(WEBHOOK_SECRET, payload)
    });
    expect(response.status()).toBe(201);
    const data = await response.json();

    // Log in
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Go to the details page directly
    await page.goto(`/tickets/${data.ticketNumber}`);
    await expect(page.getByRole('heading', { name: 'simulate-error' })).toBeVisible();

    // Wait for status badge to show OPEN
    await expect(page.locator('span', { hasText: 'OPEN' }).first()).toBeVisible();

    // Verify it has been unassigned from the AI agent
    await expect(page.locator('select#details-assign')).toHaveValue('unassigned');
  });

  test('should return 401 for invalid signature', async ({ request }) => {
    const payload = {
      from: AUTH_USER.email,
      subject: 'Unauthorized Ticket',
      body: 'Should not create this ticket',
    };

    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: {
        'svix-id': 'invalid',
        'svix-timestamp': 'invalid',
        'svix-signature': 'v1,invalid',
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should create a ticket using Resend webhook format', async ({ page, request }) => {
    const payload = {
      type: 'email.received' as const,
      data: {
        email_id: 'mock_resend_email_id_123',
        from: AUTH_USER.email,
        subject: 'E2E Resend Format Ticket',
        to: [ 'support@example.com' ],
      }
    };

    const response = await request.post(SERVER_URL, {
      data: payload,
      headers: getSvixHeaders(WEBHOOK_SECRET, payload)
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.userId).not.toBeNull();
    expect(data.customerEmail).toBe(payload.data.from);
    expect(data.title).toBe(payload.data.subject);
    expect(data.description).toBe('This is the mocked Resend email body content.');

    // Verify UI mapping matches updated database state
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('heading', { name: 'E2E Resend Format Ticket' }).first()).toBeVisible();
  });
});
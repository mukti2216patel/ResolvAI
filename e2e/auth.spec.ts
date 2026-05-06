/**
 * e2e/auth.spec.ts
 *
 * Only tests that require the real auth server survive here.
 * Removed tests and where they now live:
 *
 *   ✦ Validation errors for empty fields     → LoginForm.test.tsx
 *   ✦ Validation error for invalid email     → LoginForm.test.tsx
 */

import { test, expect } from '@playwright/test';

const AUTH_USER = {
  email: 'test-admin@example.com',
  password: 'testpassword123',
  name: 'Test Admin'
};

test.describe('Authentication System', () => {

  // Guarantee that the test user exists in the backend before running the suite
  test.beforeAll(async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:4100'
    });

    try {
      await apiContext.post('/api/auth/sign-up', {
        data: {
          email: AUTH_USER.email,
          password: AUTH_USER.password,
          name: AUTH_USER.name,
        }
      });
    } catch (e) {
      console.log('User might already exist, proceeding to tests...', e);
    } finally {
      await apiContext.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ── 1. Successful login ───────────────────────────────────────────────────

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(AUTH_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome back')).not.toBeVisible();
  });

  // ── 2. Wrong password → server error ─────────────────────────────────────

  test('should show error with incorrect password', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill(AUTH_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText('Invalid email or password');
  });

  // ── 3. Non-existent email → server error ──────────────────────────────────

  test('should show error with non-existent email', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('nonexistent@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText('Invalid email or password');
  });

  // ── 4. Unauthenticated redirect (requires real auth middleware) ───────────

  test('should redirect unauthenticated users from home to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
/**
 * LoginForm.test.tsx — Client-side Validation
 *
 * Moved from e2e/auth.spec.ts (tests 4 and 5).
 * Zod validation fires before any network call, so no real server is needed.
 *
 * ⚠️  Adjust the import path below to match your login page / form component.
 *     (e.g. src/pages/LoginPage.tsx  or  src/components/LoginForm.tsx)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginPage from '../../pages/Login';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const renderLoginPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginPage – Client-side Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty fields ──────────────────────────────────────────────────────────

  it('shows validation errors for both fields when submitting an empty form', async () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  // ── Invalid email format ──────────────────────────────────────────────────

  it('shows a validation error when the email format is invalid', async () => {
    renderLoginPage();

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });
});
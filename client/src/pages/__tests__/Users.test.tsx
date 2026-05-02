import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithQuery } from '../../test-utils';
import Users from '../Users';
import { authClient } from '@/lib/auth-client';
import axios from 'axios';
import { UserRole } from '../../types';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('axios');

describe('Users Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock session as Admin to access the page and see the button
    (authClient.useSession as any).mockReturnValue({
      data: {
        user: {
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      },
      isPending: false,
    });
  });

  it('should show the Create User modal when the "Create User" button is clicked', async () => {
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });
  });

  it('should show the Edit User modal when the edit button in the table is clicked', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.AGENT,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    (axios.get as any).mockResolvedValue({ data: mockUsers });

    renderWithQuery(<Users />);

    const editButton = await screen.findByRole('button', { name: /edit Test User/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/i)).toHaveValue('Test User');
      expect(screen.getByLabelText(/Email/i)).toHaveValue('test@example.com');
    });
  });

  it('should show the Delete User modal when the delete button in the table is clicked for a non-admin user', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Agent User',
        email: 'agent@example.com',
        role: UserRole.AGENT,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    (axios.get as any).mockResolvedValue({ data: mockUsers });

    renderWithQuery(<Users />);

    const deleteButton = await screen.findByRole('button', { name: /Delete Agent User/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete user/i })).toBeInTheDocument();
      expect(screen.getAllByText('Agent User').length).toBeGreaterThan(1);
    });
  });

  it('should hide the modal when clicking the overlay (outside the modal)', async () => {
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create user/i })).not.toBeInTheDocument();
    });
  });


  it('should hide the modal when the Escape key is pressed', async () => {
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create user/i })).not.toBeInTheDocument();
    });
  });

  it('should hide the modal when the close button is clicked', async () => {
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create user/i })).not.toBeInTheDocument();
    });
  });

  it('should show validation errors when submitting an empty form', async () => {
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    const submitButton = screen.getAllByRole('button', { name: /create user/i }).find(btn => btn.getAttribute('type') === 'submit');
    if (!submitButton) throw new Error('Submit button not found');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Name must be at least 3 characters long/i)).toBeInTheDocument();
    expect(await screen.findByText(/A valid email address is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();
  });

  it('should call the API and close the modal on successful submission', async () => {
    (axios.post as any).mockResolvedValue({ data: { user: { id: 'new-1', name: 'Test User' } } });
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    
    const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getAllByRole('button', { name: /create user/i }).find(btn => btn.getAttribute('type') === 'submit');
    if (!submitButton) throw new Error('Submit button not found');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/users', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(screen.queryByRole('heading', { name: /create user/i })).not.toBeInTheDocument();
    });
  });

  it('should display a server error message when submission fails', async () => {
    (axios.post as any).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { error: 'Email already exists' },
      },
    });
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'exists@example.com' } });
    
    const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getAllByRole('button', { name: /create user/i }).find(btn => btn.getAttribute('type') === 'submit');
    if (!submitButton) throw new Error('Submit button not found');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('should toggle password visibility when the eye icon is clicked', async () => {
    renderWithQuery(<Users />);

    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' });
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});

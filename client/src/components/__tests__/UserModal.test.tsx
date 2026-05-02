import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import UserModal from '../UserModal';
import { UserRole } from '../../types';

vi.mock('axios');

const createTestWrapper = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient,
  };
};

describe('UserModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render correctly in create mode', () => {
      createTestWrapper(<UserModal onClose={() => {}} />);
      expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument();
    });

    it('should display validation errors for empty fields on submit', async () => {
      createTestWrapper(<UserModal onClose={() => {}} />);
      
      const submitButton = screen.getByRole('button', { name: /create user/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText(/Name must be at least 3 characters long/i)).toBeInTheDocument();
      expect(await screen.findByText(/A valid email address is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();
    });

    it('should submit the form with valid data', async () => {
      (axios.post as any).mockResolvedValue({ data: { user: { id: '123' } } });
      createTestWrapper(<UserModal onClose={() => {}} />);
      
      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /create user/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/users', {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Edit Mode', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: UserRole.AGENT,
      createdAt: '2026-01-01T00:00:00Z',
    };

    it('should pre-populate fields with user data', () => {
      createTestWrapper(<UserModal user={mockUser} onClose={() => {}} />);

      expect(screen.getByLabelText(/Name/i)).toHaveValue('Jane Smith');
      expect(screen.getByLabelText(/Email/i)).toHaveValue('jane@example.com');
      expect(screen.getByLabelText('Password')).toHaveValue('');
      expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument();
    });

    it('should allow submitting with empty password (keeping current)', async () => {
      (axios.put as any).mockResolvedValue({ data: { ...mockUser, name: 'Jane Updated' } });
      createTestWrapper(<UserModal user={mockUser} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Jane Updated' } });

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith('/api/users/user-123', {
          name: 'Jane Updated',
          email: 'jane@example.com',
          password: '',
        });
      });
    });

    it('should update password if provided', async () => {
      (axios.put as any).mockResolvedValue({ data: { ...mockUser } });
      createTestWrapper(<UserModal user={mockUser} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'newpassword123' } });

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith('/api/users/user-123', {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: 'newpassword123',
        });
      });
    });

    it('should display validation error if provided password is too short', async () => {
      createTestWrapper(<UserModal user={mockUser} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();
      expect(axios.put).not.toHaveBeenCalled();
    });
  });

  it('should toggle password visibility', () => {
    createTestWrapper(<UserModal onClose={() => {}} />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});

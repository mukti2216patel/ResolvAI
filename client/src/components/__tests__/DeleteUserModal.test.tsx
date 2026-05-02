import { renderWithQuery } from '@/test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import DeleteUserModal from '../DeleteUserModal';
import { User, UserRole } from '../../types';

vi.mock('axios');

const mockUser: User = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: UserRole.AGENT,
  createdAt: new Date().toISOString(),
};

describe('DeleteUserModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onClose.mockClear();
  });

  it('renders correctly with user information', () => {
    renderWithQuery(<DeleteUserModal user={mockUser} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: /delete user/i })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete user/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithQuery(<DeleteUserModal user={mockUser} onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls delete endpoint and closes modal on success', async () => {
    (axios.delete as any).mockResolvedValueOnce({ data: { success: true } });
    
    renderWithQuery(<DeleteUserModal user={mockUser} onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
    
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(`/api/users/${mockUser.id}`);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows server error message on failure', async () => {
    const errorMessage = 'This user cannot be deleted because they are the last admin';
    (axios.delete as any).mockRejectedValueOnce({
      response: {
        data: { error: errorMessage },
      },
    });
    
    renderWithQuery(<DeleteUserModal user={mockUser} onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows fallback error message on unexpected failure', async () => {
    (axios.delete as any).mockRejectedValueOnce(new Error('Network Error'));
    
    renderWithQuery(<DeleteUserModal user={mockUser} onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to delete user. Please try again./i)).toBeInTheDocument();
    });
    
    expect(onClose).not.toHaveBeenCalled();
  });
});

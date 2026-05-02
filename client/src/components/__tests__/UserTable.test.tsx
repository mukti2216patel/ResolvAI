import { renderWithQuery } from '@/test-utils';
import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserTable from '../UserTable';
import { User, UserRole } from '../../types';

const mockUsers: User[] = [
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agent-1',
    name: 'Agent User',
    email: 'agent@example.com',
    role: UserRole.AGENT,
    createdAt: new Date().toISOString(),
  },
];

describe('UserTable', () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders users list correctly', () => {
    renderWithQuery(
      <UserTable 
        users={mockUsers} 
        isLoading={false} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Agent User')).toBeInTheDocument();
    expect(screen.getByText(UserRole.ADMIN)).toBeInTheDocument();
    expect(screen.getByText(UserRole.AGENT)).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading is true', () => {
    renderWithQuery(
      <UserTable 
        users={[]} 
        isLoading={true} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );

    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    expect(screen.queryByText('Agent User')).not.toBeInTheDocument();
    
    // Verify that we have rows in the table
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('shows empty state message when no users are provided', () => {
    renderWithQuery(
      <UserTable 
        users={[]} 
        isLoading={false} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );

    expect(screen.getByText(/No users found/i)).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked for agent users', () => {
    renderWithQuery(
      <UserTable 
        users={mockUsers} 
        isLoading={false} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );

    // Find the delete button for Agent User
    // We use aria-label as defined in the component
    const deleteAgentBtn = screen.getByRole('button', { name: /Delete Agent User/i });
    fireEvent.click(deleteAgentBtn);

    expect(onDelete).toHaveBeenCalledWith(mockUsers[1]);
  });

  it('disables delete button for admin users', () => {
    renderWithQuery(
      <UserTable 
        users={mockUsers} 
        isLoading={false} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );

    const deleteAdminBtn = screen.getByRole('button', { name: /Delete Admin User/i });
    expect(deleteAdminBtn).toBeDisabled();
    
    fireEvent.click(deleteAdminBtn);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onEdit when edit button is clicked', () => {
    renderWithQuery(
      <UserTable 
        users={mockUsers} 
        isLoading={false} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );

    const editBtn = screen.getByRole('button', { name: /Edit Admin User/i });
    fireEvent.click(editBtn);

    expect(onEdit).toHaveBeenCalledWith(mockUsers[0]);
  });
});

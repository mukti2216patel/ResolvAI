import { Navigate, Link } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { UserRole, type User } from '../types';
import { ShieldAlert, Users as UsersIcon, ArrowLeft, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import UserModal, { CreateUserButton } from '../components/UserModal';
import UserTable from '../components/UserTable';
import DeleteUserModal from '../components/DeleteUserModal';
import AppLayout from '../components/AppLayout';

export default function Users() {
  const { data: session, isPending } = authClient.useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get<User[]>('/api/users');
      return response.data;
    },
    enabled: !!session && session.user.role === UserRole.ADMIN,
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleOpenDeleteModal = (user: User) => {
    setUserToDelete(user);
  };

  const handleCloseDeleteModal = () => {
    setUserToDelete(null);
  };

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-4" style={{ height: '100vh' }}>
        <div className="w-9 h-9 border-[3px] border-border-color border-t-accent rounded-full animate-spin-slow" />
        <p>Loading session…</p>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (session.user.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#06070a] text-text-primary px-6 text-center font-mono">
        <div className="flex h-16 w-16 items-center justify-center rounded bg-danger/15 border border-danger/30 mb-6 text-danger animate-pulse shadow-[0_0_15px_rgba(255,0,85,0.2)]">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-widest text-danger mb-2">ACCESS_DENIED</h2>
        <p className="text-xs text-text-secondary max-w-md mb-8">SYS_WARN: Target path requires root level administrator credentials.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 border border-border-color/60 bg-bg-secondary text-text-secondary font-mono text-xs uppercase tracking-wider rounded hover:bg-bg-hover hover:text-text-primary">
          <ArrowLeft className="size-4" /> RETURN_TO_BASE
        </Link>
      </div>
    );
  }

  return (
    <>
      <AppLayout headerAction={<CreateUserButton onClick={handleOpenCreateModal} />}>
        <div className="flex flex-col gap-6">
          <div className="mb-6 flex flex-col gap-1.5 border-b border-border-color/50 pb-5">
            <h2 className="text-xl font-bold font-heading uppercase tracking-widest text-text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse-glow" />
              SYS_USER_DIRECTORY
            </h2>
            <p className="text-xs font-mono text-text-secondary">ADMINISTRATIVE CONSOLE // AGENT PERMISSION CONTROL</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded bg-danger/15 border border-danger/30 text-danger font-mono text-xs">
              <AlertCircle className="size-5" />
              <p className="font-semibold">{error instanceof Error ? error.message : 'An error occurred'}</p>
            </div>
          )}

          <div className="bg-bg-card border border-border-color/60 rounded shadow-md overflow-hidden">
            <div className="px-5 py-4 border-b border-border-color/60 bg-bg-secondary/40">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary">// RECORDED_SYS_AGENTS</h2>
            </div>
            <div className="p-0">
              <UserTable users={users} isLoading={isLoading} onEdit={handleOpenEditModal} onDelete={handleOpenDeleteModal} />
            </div>
          </div>
        </div>
      </AppLayout>

      {isModalOpen && (
        <UserModal
          user={editingUser || undefined}
          onClose={handleCloseModal}
          title={editingUser ? 'Edit User' : 'Create User'}
        />
      )}

      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          onClose={handleCloseDeleteModal}
        />
      )}
    </>
  );
}

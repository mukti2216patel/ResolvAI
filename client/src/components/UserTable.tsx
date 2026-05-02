import { User, UserRole } from '@/types';
import { Mail, User as UserIcon, Calendar, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export default function UserTable({ users, isLoading, onEdit, onDelete }: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-color/60 bg-bg-secondary/40 text-text-secondary text-[0.68rem] uppercase tracking-widest font-mono font-bold">
            <th className="px-4 py-3.5">User</th>
            <th className="px-4 py-3.5">Email</th>
            <th className="px-4 py-3.5">Role</th>
            <th className="px-4 py-3.5">Joined</th>
            <th className="px-4 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color/60 bg-bg-card">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border-color/40">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </td>
                <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded" /></td>
                <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-4"><Skeleton className="h-8 w-8 rounded ml-auto" /></td>
              </tr>
            ))
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-12 text-text-secondary font-mono text-xs">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-bg-hover/30 transition-colors group border-b border-border-color/40">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-theme/10 text-accent-theme group-hover:bg-accent-theme/20 transition-colors">
                      <UserIcon className="size-4" />
                    </div>
                    <span className="font-semibold text-text-primary text-sm">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-text-secondary font-mono text-[0.72rem]">
                    <Mail className="size-3.5" />
                    {user.email}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-0.5 rounded text-[0.62rem] font-mono font-bold uppercase tracking-wider ${
                    user.role === UserRole.ADMIN 
                      ? 'bg-accent-theme/15 text-accent-theme border border-accent-theme/45' 
                      : 'bg-bg-secondary text-text-secondary border border-border-color/60'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-text-secondary font-mono text-[0.72rem]">
                    <Calendar className="size-3.5" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onEdit(user)}
                      className="p-1.5 border border-border-color/60 bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-accent-theme/40 rounded transition-all"
                      aria-label={`Edit ${user.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button 
                      onClick={() => onDelete(user)}
                      disabled={user.role === UserRole.ADMIN}
                      className="p-1.5 border border-border-color/60 bg-bg-secondary text-text-secondary hover:text-danger hover:border-danger/40 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-secondary disabled:hover:border-border-color/60"
                      aria-label={`Delete ${user.name}`}
                      title={user.role === UserRole.ADMIN ? "Cannot delete admin users" : undefined}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


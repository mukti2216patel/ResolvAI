import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { User } from '../types';

interface DeleteUserModalProps {
  user: User;
  onClose: () => void;
}

export default function DeleteUserModal({ user, onClose }: DeleteUserModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await axios.delete(`/api/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.error || 'Failed to delete user. Please try again.');
    },
  });

  const handleDelete = () => {
    setServerError(null);
    deleteMutation.mutate(user.id);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-[420px] rounded-2xl bg-bg-card border border-border-color shadow-2xl animate-[slideUp_0.2s_cubic-bezier(0.16,1,0.3,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border-color">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger border border-danger/20">
              <AlertTriangle className="size-5" />
            </div>
            <h2 id="delete-modal-title" className="text-lg font-bold text-text-primary">
              Delete User
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">{user.name}</strong>?
              This action can be undone by an administrator.
            </p>

            {serverError && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-text-secondary border border-border-color hover:bg-bg-hover hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-danger text-white hover:bg-danger/80 transition-colors shadow-[0_0_14px_rgba(239,68,68,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

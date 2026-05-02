import React from 'react';
import { cn } from '@/lib/utils';

export const Dialog = ({ children, open, onOpenChange }: any) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => onOpenChange?.(false)}
    >
      {children}
    </div>
  );
};

export const DialogContent = ({ children, className }: any) => (
  <div
    className={cn(
      'relative z-[201] w-full max-w-md rounded-2xl bg-bg-card border border-border-color shadow-2xl animate-[slideUp_0.2s_cubic-bezier(0.16,1,0.3,1)] p-6',
      className
    )}
    onClick={(e: React.MouseEvent) => e.stopPropagation()}
  >
    {children}
  </div>
);

export const DialogHeader = ({ children }: any) => (
  <div className="flex flex-col gap-2 mb-4">{children}</div>
);

export const DialogTitle = ({ children }: any) => (
  <h2 className="text-lg font-bold text-text-primary">{children}</h2>
);

export const DialogDescription = ({ children }: any) => (
  <p className="text-sm text-text-secondary">{children}</p>
);

export const DialogFooter = ({ children, className }: any) => (
  <div className={cn('flex justify-end gap-2 mt-4', className)}>{children}</div>
);

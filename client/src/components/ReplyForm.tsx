import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createReplySchema, type CreateReplyFormValues } from 'core';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ReplyFormProps {
  onSubmit: (content: string) => Promise<any> | any;
  isPending: boolean;
  customerName?: string;
}

export default function ReplyForm({ onSubmit, isPending, customerName }: ReplyFormProps) {
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateReplyFormValues>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { content: '' },
    mode: 'onChange',
  });

  const replyContent = watch('content');
  const isTooShort = (replyContent || '').length < 10;

  const handlePolish = async () => {
    const currentContent = getValues('content');
    if (!currentContent || !currentContent.trim()) {
      return;
    }

    setIsPolishing(true);
    setPolishError(null);
    try {
      const response = await axios.post('/api/tickets/polish', { content: currentContent, customerName });
      if (response.data?.polishedContent) {
        setValue('content', response.data.polishedContent, { shouldValidate: true, shouldDirty: true });
      }
    } catch (err: any) {
      setPolishError(err.response?.data?.error || 'Failed to polish reply.');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleFormSubmit = async (data: CreateReplyFormValues) => {
    try {
      await onSubmit(data.content);
      reset();
    } catch (error) {
      // Keep form content if submission fails
    }
  };

  return (
    <div className="bg-bg-card border border-border-color/60 rounded p-6 shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#bd00ff] to-accent-theme opacity-65" />
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-4 before:content-['//_'] before:opacity-50">New Reply</h3>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="reply-content" className="sr-only">Reply message</label>
          <textarea
            id="reply-content"
            rows={4}
            {...register('content')}
            placeholder="Type your message here..."
            className={`w-full py-3 px-4 border rounded bg-bg-secondary text-text-primary font-mono text-sm transition-all focus:outline-none placeholder:text-text-muted resize-none focus:border-accent-theme/60 ${
              errors.content && replyContent?.trim() ? 'border-red-500/80 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(255,0,85,0.15)]' : 'border-border-color/60'
            }`}
          />
          {errors.content && replyContent?.trim() && (
            <span className="text-danger font-mono text-xs mt-1 block">{errors.content.message}</span>
          )}
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="text-danger font-mono text-xs">
            {polishError && <span>{polishError}</span>}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handlePolish}
              disabled={isPending || isSubmitting || isPolishing || isTooShort}
              title={isTooShort ? 'Reply too short to polish' : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 border border-accent-theme/30 rounded bg-accent-theme/10 text-accent-theme font-mono text-xs uppercase tracking-wider cursor-pointer transition-all hover:bg-accent-theme/20 hover:border-accent-theme disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,240,255,0.05)]"
            >
              {isPolishing ? (
                <Loader2 className="w-4 h-4 animate-spin-slow text-accent-theme" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent-theme" />
              )}
              {isPolishing ? 'Polishing...' : 'Polish Reply'}
            </button>
            <button
              type="submit"
              disabled={isPending || isSubmitting || isPolishing || !replyContent?.trim()}
              className="bg-accent-theme hover:bg-accent-theme-hover text-bg-primary font-mono text-xs uppercase tracking-wider font-bold inline-flex items-center gap-2 px-4 py-2 border-none rounded cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,240,255,0.2)]"
            >
              <Send className="w-4 h-4" />
              {isPending ? 'Sending...' : 'Submit Reply'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

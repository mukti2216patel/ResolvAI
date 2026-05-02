import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { createTicketSchema, type CreateTicketFormValues } from 'core';
import type { CreateTicketBody } from '../types';

interface Props {
  onClose: () => void;
  onCreate: (body: CreateTicketBody) => void;
}

export default function CreateTicketModal({ onClose, onCreate }: Props) {
  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await axios.get<any[]>('/api/agents');
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { title: '', description: '', priority: 'medium', category: 'general_question', assigned_to: 'unassigned' },
    mode: 'onChange',
  });

  const onSubmit = (data: CreateTicketFormValues) => {
    onCreate({
      title: data.title.trim(),
      description: data.description?.trim(),
      priority: data.priority,
      category: data.category,
      assigned_to: data.assigned_to === 'unassigned' ? null : data.assigned_to,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#06070a]/75 backdrop-blur-[6px] flex items-center justify-center z-[1000] animate-fadeIn" onClick={onClose}>
      <div className="bg-bg-card border border-border-color/60 rounded w-[90%] max-w-[520px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] animate-slideUp relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent to-[#bd00ff] opacity-65" />
        <div className="flex justify-between items-center pt-6 px-6 pb-0">
          <h2 className="text-sm font-bold font-heading uppercase tracking-widest text-text-primary before:content-['//_'] before:opacity-50">Create New Ticket</h2>
          <button className="bg-none border-none text-text-muted text-[1.5rem] cursor-pointer p-1 leading-none transition-colors hover:text-text-primary bg-transparent font-mono" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6" noValidate>
          <div className="mb-5">
            <label htmlFor="title" className="block text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary mb-[6px]">Title *</label>
            <input
              id="title"
              type="text"
              {...register('title')}
              placeholder="Describe the issue briefly"
              autoFocus
              className={`w-full py-[10px] px-[14px] border rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none placeholder:text-text-muted ${
                errors.title 
                  ? 'border-danger/80 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,0,85,0.15)]' 
                  : 'border-border-color/60 focus:border-accent-theme/60 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]'
              }`}
            />
            {errors.title && <span className="text-danger font-mono text-[0.7rem] mt-1 block">{errors.title.message}</span>}
          </div>

          <div className="mb-5">
            <label htmlFor="description" className="block text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary mb-[6px]">Description</label>
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              placeholder="Add details about the issue…"
              className={`w-full py-[10px] px-[14px] border rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none placeholder:text-text-muted ${
                errors.description 
                  ? 'border-danger/80 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,0,85,0.15)]' 
                  : 'border-border-color/60 focus:border-accent-theme/60 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]'
              }`}
            />
            {errors.description && <span className="text-danger font-mono text-[0.7rem] mt-1 block">{errors.description.message}</span>}
          </div>

          <div className="mb-5">
            <label htmlFor="priority" className="block text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary mb-[6px]">Priority</label>
            <select
              id="priority"
              {...register('priority')}
              className={`w-full py-[10px] px-[14px] border rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none placeholder:text-text-muted ${
                errors.priority 
                  ? 'border-danger/80 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,0,85,0.15)]' 
                  : 'border-border-color/60 focus:border-accent-theme/60 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]'
              }`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            {errors.priority && <span className="text-danger font-mono text-[0.7rem] mt-1 block">{errors.priority.message}</span>}
          </div>

          <div className="mb-5">
            <label htmlFor="category" className="block text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary mb-[6px]">Category</label>
            <select
              id="category"
              {...register('category')}
              className={`w-full py-[10px] px-[14px] border rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none placeholder:text-text-muted ${
                errors.category 
                  ? 'border-danger/80 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,0,85,0.15)]' 
                  : 'border-border-color/60 focus:border-accent-theme/60 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]'
              }`}
            >
              <option value="none">None</option>
              <option value="general_question">General Question</option>
              <option value="technical_question">Technical Question</option>
              <option value="refund_request">Refund Request</option>
            </select>
            {errors.category && <span className="text-danger font-mono text-[0.7rem] mt-1 block">{errors.category.message}</span>}
          </div>

          <div className="mb-5">
            <label htmlFor="assigned_to" className="block text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary mb-[6px]">Assign To</label>
            <select
              id="assigned_to"
              {...register('assigned_to')}
              className={`w-full py-[10px] px-[14px] border rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none placeholder:text-text-muted ${
                errors.assigned_to 
                  ? 'border-danger/80 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,0,85,0.15)]' 
                  : 'border-border-color/60 focus:border-accent-theme/60 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]'
              }`}
            >
              <option value="unassigned">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.role ? `(${agent.role})` : ''}
                </option>
              ))}
            </select>
            {errors.assigned_to && <span className="text-danger font-mono text-[0.7rem] mt-1 block">{errors.assigned_to.message}</span>}
          </div>

          <div className="flex justify-end gap-[10px] pt-2">
            <button type="button" className="border border-border-color/60 bg-transparent text-text-secondary font-mono text-xs uppercase tracking-wider rounded px-4 py-[8px] cursor-pointer hover:bg-bg-hover hover:text-text-primary transition-all" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="bg-accent-theme hover:bg-accent-theme-hover text-bg-primary font-mono text-xs uppercase tracking-wider font-bold rounded px-4 py-[8px] border-none cursor-pointer transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]" disabled={isSubmitting}>
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

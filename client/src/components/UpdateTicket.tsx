import { Trash2 } from 'lucide-react';
import type { Ticket, TicketStatus, TicketCategory } from '@/types';

interface UpdateTicketProps {
  ticket: Ticket;
  agents: any[];
  isLoadingAgents: boolean;
  onStatusChange: (status: TicketStatus) => void;
  onCategoryChange: (category: TicketCategory) => void;
  onAssignChange: (assignedToId: string | null) => void;
  onDelete: () => void;
  isUpdatingStatus: boolean;
  isUpdatingCategory: boolean;
  isUpdatingAssignment: boolean;
  isDeleting: boolean;
}

export default function UpdateTicket({
  ticket,
  agents,
  isLoadingAgents,
  onStatusChange,
  onCategoryChange,
  onAssignChange,
  onDelete,
  isUpdatingStatus,
  isUpdatingCategory,
  isUpdatingAssignment,
  isDeleting,
}: UpdateTicketProps) {
  const handleAssignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const assignedToId = val === 'unassigned' || val === 'ai-resolved' ? null : val;
    onAssignChange(assignedToId);
  };

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-6 shadow-md space-y-6">
      
      {/* Status Update Control */}
      <div>
        <label htmlFor="details-status" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Ticket Status
        </label>
        <select
          id="details-status"
          className="w-full py-2.5 px-3 border border-border-color rounded-md bg-bg-secondary text-text-primary font-sans text-sm cursor-pointer transition-all hover:border-accent focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          value={ticket.status}
          onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
          disabled={isUpdatingStatus}
        >
          <option value="new">New</option>
          <option value="processing">Processing</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Category Update Control */}
      <div className="border-t border-border-color/60 pt-4">
        <label htmlFor="details-category" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Ticket Category
        </label>
        <select
          id="details-category"
          className="w-full py-2.5 px-3 border border-border-color rounded-md bg-bg-secondary text-text-primary font-sans text-sm cursor-pointer transition-all hover:border-accent focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          value={ticket.category}
          onChange={(e) => onCategoryChange(e.target.value as TicketCategory)}
          disabled={isUpdatingCategory}
        >
          <option value="none">None</option>
          <option value="general_question">General Question</option>
          <option value="technical_question">Technical Question</option>
          <option value="refund_request">Refund Request</option>
        </select>
      </div>

      {/* Assigned To Section */}
      <div className="border-t border-border-color/60 pt-4">
        <label htmlFor="details-assign" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Assigned To
        </label>
        <select
          id="details-assign"
          className="w-full py-2.5 px-3 border border-border-color rounded-md bg-bg-secondary text-text-primary font-sans text-sm cursor-pointer transition-all hover:border-accent focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          value={
            (ticket.isAiResolved || ticket.assigned_to?.email === 'ai@example.com')
              ? (ticket.assignedToId || 'ai-resolved')
              : (ticket.assignedToId || 'unassigned')
          }
          onChange={handleAssignChange}
          disabled={isUpdatingAssignment || isLoadingAgents}
        >
          <option value="unassigned" className="text-text-muted">Unassigned</option>
          {(ticket.isAiResolved || ticket.assigned_to?.email === 'ai@example.com') && (
            <option value={ticket.assignedToId || 'ai-resolved'}>AI</option>
          )}
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} {agent.role ? `(${agent.role})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Actions: Delete */}
      <div className="border-t border-border-color/60 pt-6">
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
              onDelete();
            }
          }}
          disabled={isDeleting}
          className="w-full bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-white transition-all flex items-center justify-center gap-2 py-2.5 rounded-md font-sans text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Delete Ticket
        </button>
      </div>

    </div>
  );
}
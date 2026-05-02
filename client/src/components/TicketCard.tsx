import { Link } from 'react-router-dom';
import type { Ticket, TicketStatus } from '../types';

interface Props {
  ticket: Ticket;
  onStatusChange: (id: string, status: TicketStatus) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_EMOJI: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border border-blue-200',
  processing: 'bg-purple-50 text-purple-700 border border-purple-200',
  open: 'bg-sky-50 text-sky-700 border border-sky-200',
  'in-progress': 'bg-amber-50 text-amber-800 border border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  general_question: 'General Question',
  technical_question: 'Technical Question',
  refund_request: 'Refund Request',
  none: 'None',
};

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  general_question: 'bg-slate-100 text-slate-700 border border-slate-200',
  technical_question: 'bg-sky-50 text-sky-700 border border-sky-200',
  refund_request: 'bg-red-50 text-red-700 border border-red-200',
  none: 'bg-bg-secondary text-text-muted border border-border-color',
};

const PRIORITY_BEFORE_CLASSES: Record<string, string> = {
  low: 'before:bg-priority-low',
  medium: 'before:bg-priority-medium',
  high: 'before:bg-priority-high',
  critical: 'before:bg-priority-critical',
};

export default function TicketCard({ ticket, onStatusChange, onDelete }: Props) {
  return (
    <div className={`bg-bg-card border border-border-color rounded-lg p-6 transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-[3px] hover:shadow-md hover:border-accent before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:rounded-l-[4px] ${PRIORITY_BEFORE_CLASSES[ticket.priority]}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[0.75rem] font-bold text-text-muted">#{ticket.ticketNumber}</span>
        <div className="flex gap-2">
          <span className={`px-[10px] py-[2px] rounded-full text-[0.65rem] font-bold uppercase tracking-[0.05em] ${CATEGORY_BADGE_CLASSES[ticket.category] || CATEGORY_BADGE_CLASSES.general_question}`}>
            {CATEGORY_LABELS[ticket.category] || ticket.category}
          </span>
          <span className={`px-[10px] py-[2px] rounded-full text-[0.65rem] font-bold uppercase tracking-[0.05em] ${STATUS_BADGE_CLASSES[ticket.status]}`}>{ticket.status}</span>
        </div>
      </div>

      <h3 className="text-[1rem] font-semibold mb-2 leading-[1.4]">
        <Link to={`/tickets/${ticket.ticketNumber}`} className="hover:text-accent transition-colors cursor-pointer">
          {ticket.title}
        </Link>
      </h3>
      <p className="text-[0.85rem] text-text-secondary mb-4 line-clamp-2">{ticket.description}</p>

      <div className="flex items-center justify-between mb-2 text-[0.8rem]">
        <span className="capitalize font-medium">
          {PRIORITY_EMOJI[ticket.priority]} {ticket.priority}
        </span>
        <span className="text-text-muted">
          {new Date(ticket.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mb-4 text-[0.8rem] flex items-center gap-1">
        <span className="text-text-muted">Assigned to:</span>
        {ticket.isAiResolved ? (
          <span className="font-semibold text-text-primary">AI</span>
        ) : ticket.assigned_to ? (
          <span className="font-semibold text-text-primary">{ticket.assigned_to.name}</span>
        ) : (
          <span className="italic text-text-muted">Unassigned</span>
        )}
      </div>

      <div className="flex gap-[10px] items-center pt-4 border-t border-border-color">
        <select
          className="flex-1 py-[6px] px-3 border border-border-color rounded-sm bg-bg-secondary text-text-primary font-sans text-[0.8rem] cursor-pointer transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] hover:border-accent focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          value={ticket.status}
          onChange={(e) => onStatusChange(ticket.ticketNumber.toString(), e.target.value as TicketStatus)}
        >
          <option value="new">New</option>
          <option value="processing">Processing</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button 
          className="bg-danger text-white hover:bg-danger-hover inline-flex items-center gap-[6px] px-3 py-[6px] border-none rounded-md font-sans text-[0.75rem] font-semibold cursor-pointer transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap" 
          onClick={() => onDelete(ticket.ticketNumber.toString())}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

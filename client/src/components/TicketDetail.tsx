import { useState } from 'react';
import { 
  Calendar, 
  Mail, 
  Tag, 
  Clock,
  Shield,
  Copy,
  Check,
  Sparkles,
  Loader2
} from 'lucide-react';
import type { Ticket, TicketStatus, TicketPriority } from '@/types';
import { getTicketSender } from '@/lib/utils';
import axios from 'axios';

const PRIORITY_DOT_CLASSES: Record<TicketPriority, string> = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
  critical: 'bg-priority-critical',
};

const PRIORITY_TEXT_CLASSES: Record<TicketPriority, string> = {
  low: 'text-priority-low',
  medium: 'text-priority-medium',
  high: 'text-priority-high',
  critical: 'text-priority-critical',
};

const STATUS_BADGE_CLASSES: Record<TicketStatus, string> = {
  new: 'bg-blue-950/40 text-blue-400 border border-blue-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  processing: 'bg-purple-950/40 text-purple-400 border border-purple-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  open: 'bg-sky-950/40 text-sky-400 border border-sky-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  'in-progress': 'bg-amber-950/40 text-amber-400 border border-amber-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  resolved: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  closed: 'bg-slate-950/40 text-slate-400 border border-slate-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
};

const CATEGORY_LABELS: Record<string, string> = {
  general_question: 'General Question',
  technical_question: 'Technical Question',
  refund_request: 'Refund Request',
  none: 'None',
};

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  general_question: 'bg-slate-900/50 text-slate-300 border border-slate-800/80 font-mono text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded',
  technical_question: 'bg-sky-900/40 text-sky-300 border border-sky-800/60 font-mono text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded',
  refund_request: 'bg-red-900/40 text-red-300 border border-red-800/60 font-mono text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded',
  none: 'bg-bg-secondary text-text-muted border border-border-color/60 font-mono text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded',
};

interface TicketDetailProps {
  ticket: Ticket;
}

export default function TicketDetail({ ticket }: TicketDetailProps) {
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const response = await axios.post(`/api/tickets/${ticket.ticketNumber}/summarize`);
      if (response.data?.summary) {
        setSummary(response.data.summary);
      }
    } catch (err: any) {
      setSummaryError(err.response?.data?.error || 'Failed to generate ticket summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const { name: senderName, email: senderEmail } = getTicketSender(ticket);

  return (
    <div className="space-y-6">
      {/* Ticket Card Main */}
      <div className="bg-bg-card border border-border-color/60 rounded p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent-theme" />
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-[0.68rem] font-mono font-bold text-text-muted bg-bg-secondary px-2.5 py-1 rounded border border-border-color/60 flex items-center gap-1.5 max-w-[240px] truncate">
            ID: {ticket.id}
            <button 
              onClick={() => copyToClipboard(ticket.id)} 
              className="text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0 ml-1"
              title="Copy Ticket ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-accent-theme" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </span>
          
          <span className={`inline-block px-2.5 py-0.5 rounded text-[0.68rem] font-bold uppercase tracking-wider ${STATUS_BADGE_CLASSES[ticket.status]}`}>
            {ticket.status}
          </span>

          <span className={`px-2.5 py-0.5 rounded text-[0.68rem] font-bold uppercase tracking-wider ${CATEGORY_BADGE_CLASSES[ticket.category] || CATEGORY_BADGE_CLASSES.general_question}`}>
            <Tag className="w-3 h-3 inline mr-1 -mt-0.5" />
            {CATEGORY_LABELS[ticket.category] || ticket.category}
          </span>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[0.68rem] font-bold uppercase tracking-wider bg-bg-secondary border border-border-color/60 ${PRIORITY_TEXT_CLASSES[ticket.priority]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT_CLASSES[ticket.priority]}`} />
            {ticket.priority} Priority
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold font-heading text-text-primary mb-4 leading-snug">
          {ticket.title.replace(/\s*\(Ticket #\d+\)/, '')}
        </h1>

        <div className="flex flex-wrap gap-y-2 gap-x-6 text-[0.68rem] font-mono text-text-secondary border-t border-border-color/40 pt-4 mt-2">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-text-muted" />
            Created: {new Date(ticket.createdAt).toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-text-muted" />
            Last Updated: {new Date(ticket.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="bg-bg-card border border-border-color/60 rounded p-6 shadow-md">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-4 before:content-['//_'] before:opacity-50">Requester Details</h3>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent-theme/10 border border-accent-theme/30 flex items-center justify-center text-accent-theme text-lg font-bold font-mono">
            {senderName.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              {senderName}
              {ticket.user && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6rem] font-mono font-bold uppercase tracking-widest bg-accent-theme/20 text-accent-theme border border-accent-theme/40">
                  <Shield className="w-2.5 h-2.5" /> Registered
                </span>
              )}
            </h4>
            <p className="text-xs font-mono text-text-secondary flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-text-muted" />
              <a href={`mailto:${senderEmail}`} className="hover:underline hover:text-accent-theme">
                {senderEmail}
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Description Card */}
      <div className="bg-bg-card border border-border-color/60 rounded p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-4 before:content-['//_'] before:opacity-50">Description</h3>
          <div className="bg-bg-secondary/40 border border-border-color/60 rounded p-5 text-sm text-text-primary leading-relaxed whitespace-pre-wrap min-h-[120px]">
            {ticket.description || <span className="text-text-muted italic font-mono">No description provided.</span>}
          </div>
        </div>

        {/* Summarize button and display */}
        <div className="pt-4 border-t border-border-color/40 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-accent-theme/30 rounded bg-accent-theme/10 text-accent-theme font-mono text-xs uppercase tracking-wider cursor-pointer transition-all hover:bg-accent-theme/20 hover:border-accent-theme disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,240,255,0.05)]"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin-slow text-accent-theme" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-accent-theme" />
              )}
              {isSummarizing ? 'Summarizing...' : 'Summarize Ticket'}
            </button>
          </div>

          {summary && (
            <div className="neural-border rounded p-4 text-sm text-text-primary animate-fadeIn shadow-glow">
              <h4 className="text-[0.68rem] font-mono font-bold uppercase tracking-widest text-accent-theme mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-theme animate-pulse" /> AI Summary
              </h4>
              <p className="leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          )}
          {summaryError && (
            <span className="text-danger font-mono text-xs">{summaryError}</span>
          )}
        </div>
      </div>
    </div>
  );
}

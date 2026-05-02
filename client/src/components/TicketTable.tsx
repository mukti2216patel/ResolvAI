import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  OnChangeFn,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Ticket, TicketStatus } from '../types';
import { Skeleton } from '@/components/ui/skeleton';
import { getTicketSender } from '@/lib/utils';

interface TicketTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onStatusChange: (id: string, status: TicketStatus) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_DOT_CLASSES: Record<string, string> = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
  critical: 'bg-priority-critical',
};

const PRIORITY_TEXT_CLASSES: Record<string, string> = {
  low: 'text-priority-low',
  medium: 'text-priority-medium',
  high: 'text-priority-high',
  critical: 'text-priority-critical',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  new: 'bg-blue-950/40 text-blue-400 border border-blue-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  processing: 'bg-purple-950/40 text-purple-400 border border-purple-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  open: 'bg-sky-950/40 text-sky-400 border border-sky-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  'in-progress': 'bg-amber-950/40 text-amber-400 border border-amber-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  resolved: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
  closed: 'bg-slate-950/40 text-slate-400 border border-slate-900/60 font-mono text-[0.68rem] tracking-wider uppercase px-2 py-0.5 rounded',
};

const CATEGORY_LABELS: Record<string, string> = {
  general_question: 'General',
  technical_question: 'Technical',
  refund_request: 'Refund',
  none: 'None',
};

const CATEGORY_FULL_LABELS: Record<string, string> = {
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

const PRIORITY_BORDER_CLASSES: Record<string, string> = {
  low: 'border-l-[3px] border-l-priority-low',
  medium: 'border-l-[3px] border-l-priority-medium',
  high: 'border-l-[3px] border-l-priority-high',
  critical: 'border-l-[3px] border-l-priority-critical',
};

export default function TicketTable({
  tickets,
  isLoading,
  sorting,
  onSortingChange,
  onStatusChange,
  onDelete,
}: TicketTableProps) {
  const columnHelper = createColumnHelper<Ticket>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Subject',
        cell: (info) => {
          const ticket = info.row.original;
          const ticketNum = `#${ticket.ticketNumber}`;
          const subjectTitle = ticket.title.replace(/\s*\(Ticket #\d+\)/, '');
          return (
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[0.88rem] font-bold text-text-primary leading-[1.4] line-clamp-1">
                <Link
                  to={`/tickets/${ticket.ticketNumber}`}
                  className="hover:text-[#00f0ff] hover:underline hover:decoration-[#00f0ff]/40 transition-all cursor-pointer"
                >
                  {subjectTitle}
                </Link>
              </h3>
              <span className="text-[0.68rem] text-text-muted font-mono leading-none">
                TCK_NUM: {ticketNum}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('customerEmail', {
        id: 'sender',
        header: 'Sender',
        cell: (info) => {
          const ticket = info.row.original;
          const { name: senderName, email: senderEmail } = getTicketSender(ticket);

          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.82rem] font-semibold text-text-primary leading-[1.3]">
                {senderName}
              </span>
              {senderEmail && (
                <span
                  className="text-[0.68rem] font-mono text-text-muted truncate max-w-[160px]"
                  title={senderEmail}
                >
                  {senderEmail}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const val = info.getValue();
          return (
            <span
              className={`inline-block px-[8px] py-[2px] rounded-full text-[0.62rem] font-bold uppercase tracking-[0.05em] ${STATUS_BADGE_CLASSES[val]}`}
            >
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => {
          const val = info.getValue();
          return (
            <span
              title={CATEGORY_FULL_LABELS[val] || val}
              className={`inline-block px-[8px] py-[2px] rounded-full text-[0.62rem] font-bold uppercase tracking-[0.05em] whitespace-nowrap ${
                CATEGORY_BADGE_CLASSES[val] || CATEGORY_BADGE_CLASSES.general_question
              }`}
            >
              {CATEGORY_LABELS[val] || val}
            </span>
          );
        },
      }),
      columnHelper.accessor('assigned_to', {
        id: 'assignee',
        header: 'Assignee',
        cell: (info) => {
          const val = info.getValue();
          const ticket = info.row.original;
          if (ticket.isAiResolved || ticket.assigned_to?.email === 'ai@example.com') {
            return (
              <span className="bg-accent-theme/15 text-accent-theme font-mono text-[0.62rem] px-2 py-0.5 border border-accent-theme/40 rounded uppercase tracking-wider">
                AI
              </span>
            );
          }
          return (
            <span className={val ? 'text-text-primary text-[0.8rem] font-semibold' : 'text-text-muted text-[0.72rem] font-mono italic'}>
              {val ? val.name : 'UNASSIGNED'}
            </span>
          );
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: (info) => (
          <span className="text-text-secondary font-mono text-xs">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className={`inline-flex items-center gap-1.5 text-[0.7rem] font-mono uppercase tracking-wider font-semibold ${PRIORITY_TEXT_CLASSES[val] ?? 'text-text-secondary'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT_CLASSES[val] ?? 'bg-text-muted'}`} />
              {val}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="overflow-x-auto w-full">
      <section className="min-w-[1000px] border border-border-color/60 rounded bg-bg-card overflow-hidden">
        {/* Table Header */}
        <section className="grid grid-cols-[1.8fr_1.2fr_100px_130px_130px_110px_100px] border-b border-border-color/60 bg-bg-secondary/60 text-text-secondary text-[0.68rem] uppercase tracking-widest font-mono font-bold px-6 py-3.5 items-center select-none">
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => {
              const canSort = header.column.getCanSort();
              const sortingState = header.column.getIsSorted();

              return (
                <span
                  key={header.id}
                  className="flex items-center gap-1.5"
                >
                  {header.isPlaceholder ? null : (
                    <>
                      {canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 hover:text-text-primary transition-colors cursor-pointer uppercase font-mono font-bold text-[0.68rem] tracking-widest"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sortingState === 'desc' ? (
                            <ArrowDown className="size-3 text-accent-theme" />
                          ) : sortingState === 'asc' ? (
                            <ArrowUp className="size-3 text-accent-theme" />
                          ) : (
                            <ArrowUpDown className="size-3 text-text-muted" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </>
                  )}
                </span>
              );
            })
          )}
        </section>

        {/* Table Body */}
        <section className="divide-y divide-border-color/60">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <section
                key={i}
                className="grid grid-cols-[1.8fr_1.2fr_100px_130px_130px_110px_100px] px-6 py-3 items-center"
              >
                <span>
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-3.5 w-60" />
                </span>
                <span><Skeleton className="h-4 w-28" /></span>
                <span><Skeleton className="h-5 w-16 rounded-full" /></span>
                <span><Skeleton className="h-5 w-24 rounded-full" /></span>
                <span><Skeleton className="h-4 w-20" /></span>
                <span><Skeleton className="h-4 w-20" /></span>
                <span><Skeleton className="h-4 w-20" /></span>
              </section>
            ))
          ) : tickets.length === 0 ? (
            <section className="text-center py-20 text-text-muted">
              <span className="text-[3rem] block mb-3">📭</span>
              <p>No tickets found</p>
            </section>
          ) : (
            table.getRowModel().rows.map((row) => {
              const ticket = row.original;
              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-[1.8fr_1.2fr_100px_130px_130px_110px_100px] px-6 py-3 items-center bg-bg-card hover:bg-bg-hover/30 transition-colors relative ${PRIORITY_BORDER_CLASSES[ticket.priority]}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <span key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  ))}
                </div>
              );
            })
          )}
        </section>
      </section>
    </section>
  );
}

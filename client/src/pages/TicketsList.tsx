import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import type { Ticket, CreateTicketBody, TicketStatus } from '@/types';
import TicketTable from '@/components/TicketTable';
import CreateTicketModal from '@/components/CreateTicketModal';
import { authClient } from '@/lib/auth-client';
import { getTicketSender } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';

const STATUS_OPTIONS = ['new', 'open', 'in-progress', 'resolved', 'closed'] as const;

export default function TicketsList() {
  const { data: session, isPending } = authClient.useSession();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const queryClient = useQueryClient();

  const sortBy = sorting[0]?.id;
  const sortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  const { data: tickets = [], isLoading: loading } = useQuery<Ticket[]>({
    queryKey: ['tickets', sortBy, sortOrder],
    queryFn: async () => {
      const res = await axios.get<Ticket[]>('/api/tickets', {
        params: { sortBy, sortOrder },
      });
      return res.data;
    },
    enabled: !!session,
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateTicketBody) => {
      const res = await axios.post('/api/tickets', body);
      return res.data;
    },
    onSuccess: () => {
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const res = await axios.patch(`/api/tickets/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/api/tickets/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
    },
  });

  const handleCreate = async (body: CreateTicketBody) => {
    createMutation.mutate(body);
  };

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    statusMutation.mutate({ id, status });
  };

  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-4" style={{ height: '100vh' }}>
        <div className="w-9 h-9 border-[3px] border-border-color border-t-accent rounded-full animate-spin-slow" />
        <p>Loading session…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const subject = t.title.toLowerCase();
      const { name: senderName, email: senderEmail } = getTicketSender(t);
      if (
        !senderName.toLowerCase().includes(query) &&
        !senderEmail.toLowerCase().includes(query) &&
        !subject.includes(query)
      ) {
        return false;
      }
    }

    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (new Date(t.createdAt) < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(t.createdAt) > toDate) return false;
    }

    return true;
  });

  const getFilteredTicketsForCounts = (status: TicketStatus | 'all') => {
    return tickets.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const subject = t.title.toLowerCase();
        const { name: senderName, email: senderEmail } = getTicketSender(t);
        if (
          !senderName.toLowerCase().includes(query) &&
          !senderEmail.toLowerCase().includes(query) &&
          !subject.includes(query)
        ) {
          return false;
        }
      }
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (new Date(t.createdAt) < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(t.createdAt) > toDate) return false;
      }
      return true;
    });
  };

  const counts = {
    all: getFilteredTicketsForCounts('all').length,
    new: getFilteredTicketsForCounts('new').length,
    open: getFilteredTicketsForCounts('open').length,
    'in-progress': getFilteredTicketsForCounts('in-progress').length,
    resolved: getFilteredTicketsForCounts('resolved').length,
    closed: getFilteredTicketsForCounts('closed').length,
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    categoryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const totalItems = filteredTickets.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, categoryFilter, priorityFilter, dateFrom, dateTo, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  const newTicketButton = (
    <button
      className="inline-flex items-center gap-[6px] px-4 py-[8px] border-none rounded-lg font-sans text-sm font-semibold cursor-pointer transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap bg-gradient-to-r from-accent to-[#06b6d4] text-white shadow-sm hover:shadow-md hover:brightness-105"
      onClick={() => setShowModal(true)}
    >
      + New Ticket
    </button>
  );

  return (
    <>
      <AppLayout headerAction={newTicketButton}>
        {/* Status Filter Bar */}
        <div className="flex gap-[10px] flex-wrap mb-8">
          {(['all', ...STATUS_OPTIONS] as const).map((s) => {
            const isActive = filterStatus === s;
            return (
              <button
                key={s}
                className={`flex items-center gap-2.5 py-1.5 px-3.5 border rounded font-mono text-xs uppercase tracking-wider cursor-pointer transition-all ${
                  isActive
                    ? 'bg-accent-theme/15 border-accent-theme/60 text-accent-theme font-bold shadow-glow'
                    : 'bg-bg-card border-border-color/60 text-text-secondary hover:bg-bg-hover hover:border-accent-theme/40 hover:text-text-primary'
                }`}
                onClick={() => setFilterStatus(s)}
              >
                <span>{s}</span>
                <span
                  className={`py-[1px] px-1.5 rounded text-[0.68rem] font-bold ${
                    isActive ? 'bg-accent-theme text-bg-primary' : 'bg-bg-hover text-text-secondary border border-border-color/60'
                  }`}
                >
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="bg-bg-card border border-border-color/60 rounded p-4 mb-6 flex flex-wrap items-center gap-4 text-text-primary">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <label htmlFor="search" className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary">
              Search_Query
            </label>
            <input
              id="search"
              type="text"
              placeholder="Query parameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 py-[6px] px-3 border border-border-color/60 rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none focus:border-accent placeholder:text-text-muted"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full sm:w-auto min-w-[150px] flex flex-col gap-1.5">
            <label htmlFor="category" className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary">
              Filter_Category
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-9 py-[6px] px-3 border border-border-color/60 rounded bg-bg-secondary text-text-primary font-mono text-xs cursor-pointer transition-all hover:border-accent/60 focus:outline-none focus:border-accent"
            >
              <option value="all">ALL_CATEGORIES</option>
              <option value="general_question">General Question</option>
              <option value="technical_question">Technical Question</option>
              <option value="refund_request">Refund Request</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="w-full sm:w-auto min-w-[150px] flex flex-col gap-1.5">
            <label htmlFor="priority" className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary">
              Filter_Priority
            </label>
            <select
              id="priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-9 py-[6px] px-3 border border-border-color/60 rounded bg-bg-secondary text-text-primary font-mono text-xs cursor-pointer transition-all hover:border-accent/60 focus:outline-none focus:border-accent"
            >
              <option value="all">ALL_PRIORITIES</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Date From */}
          <div className="w-[calc(50%-8px)] sm:w-auto min-w-[130px] flex flex-col gap-1.5">
            <label htmlFor="dateFrom" className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary">
              Date_Start
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-9 py-[6px] px-3 border border-border-color/60 rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none focus:border-accent"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Date To */}
          <div className="w-[calc(50%-8px)] sm:w-auto min-w-[130px] flex flex-col gap-1.5">
            <label htmlFor="dateTo" className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary">
              Date_End
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-9 py-[6px] px-3 border border-border-color/60 rounded bg-bg-secondary text-text-primary font-mono text-xs transition-all focus:outline-none focus:border-accent"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="w-full sm:w-auto self-end flex flex-col">
              <button
                onClick={handleClearFilters}
                className="h-9 py-[6px] px-4 border border-danger/30 hover:border-danger/50 rounded font-mono text-xs uppercase tracking-wider cursor-pointer transition-all whitespace-nowrap bg-transparent text-danger hover:bg-danger/10"
              >
                Clear_Filters
              </button>
            </div>
          )}
        </div>

        <TicketTable
          tickets={paginatedTickets}
          isLoading={loading}
          sorting={sorting}
          onSortingChange={setSorting}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="mt-4 bg-bg-card border border-border-color/60 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-text-secondary font-mono text-xs">
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <span>SHOW</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 py-1 px-2 border border-border-color/60 rounded bg-bg-secondary text-text-primary font-mono text-xs cursor-pointer focus:outline-none focus:border-accent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>ENTRIES</span>
              </div>
              <span className="text-text-muted text-xs">
                Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 inline-flex items-center justify-center rounded border border-border-color/60 bg-bg-secondary text-text-primary text-xs font-bold cursor-pointer transition-all hover:bg-bg-hover hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
                title="First Page"
              >
                &laquo;
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 inline-flex items-center justify-center rounded border border-border-color/60 bg-bg-secondary text-text-primary text-xs font-bold cursor-pointer transition-all hover:bg-bg-hover hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                PREV
              </button>
              <span className="text-xs text-text-muted px-2 select-none">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 inline-flex items-center justify-center rounded border border-border-color/60 bg-bg-secondary text-text-primary text-xs font-bold cursor-pointer transition-all hover:bg-bg-hover hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                NEXT
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 inline-flex items-center justify-center rounded border border-border-color/60 bg-bg-secondary text-text-primary text-xs font-bold cursor-pointer transition-all hover:bg-bg-hover hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
                title="Last Page"
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </AppLayout>

      {showModal && (
        <CreateTicketModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </>
  );
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithQuery } from '@/test-utils';
import TicketsList from '@/pages/TicketsList';
import { authClient } from '@/lib/auth-client';
import axios from 'axios';
import { UserRole } from '@/types';
import type { Ticket } from '@/types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { withCredentials: false },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_SESSION = {
  data: {
    user: {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    },
  },
  isPending: false,
};

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    ticketNumber: 1,
    title: 'Default Title',
    description: 'Default description',
    status: 'open',
    priority: 'medium',
    category: 'general_question',
    createdAt: '2025-03-15T10:00:00.000Z',
    updatedAt: '2025-03-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TicketsList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (authClient.useSession as any).mockReturnValue(MOCK_SESSION);
    (axios.get as any).mockResolvedValue({ data: [] });
  });

  // ── Header & nav ─────────────────────────────────────────────────────────

  it('should display the header with Tickets nav link and + New Ticket button', () => {
    renderWithQuery(<TicketsList />);

    expect(screen.getByText('Helpdesk')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Tickets$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new ticket/i })).toBeInTheDocument();
  });

  // ── Ticket ordering ───────────────────────────────────────────────────────

  it('should render ticket cards in the order returned by the API', async () => {
    const tickets = [
      makeTicket({ id: '3', title: 'Third Ticket' }),
      makeTicket({ id: '2', title: 'Second Ticket' }),
      makeTicket({ id: '1', title: 'First Ticket' }),
    ];
    (axios.get as any).mockResolvedValue({ data: tickets });

    renderWithQuery(<TicketsList />);

    const headings = await screen.findAllByRole('heading', { level: 3 });
    const titles = headings.map((h) => h.textContent);

    expect(titles.indexOf('Third Ticket')).toBeLessThan(titles.indexOf('First Ticket'));
  });

  // ── Status filter bar ─────────────────────────────────────────────────────

  it('should filter tickets by status when filter buttons are clicked', async () => {
    const tickets = [
      makeTicket({ id: '1', title: 'Open Ticket', status: 'open' }),
      makeTicket({ id: '2', title: 'Resolved Ticket', status: 'resolved' }),
      makeTicket({ id: '3', title: 'Closed Ticket', status: 'closed' }),
    ];
    (axios.get as any).mockResolvedValue({ data: tickets });

    renderWithQuery(<TicketsList />);

    await screen.findByRole('heading', { name: 'Open Ticket' });

    // All shown initially
    expect(screen.getByRole('heading', { name: 'Resolved Ticket' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Closed Ticket' })).toBeInTheDocument();

    // Open filter
    fireEvent.click(screen.getByRole('button', { name: /^open/i }));
    expect(screen.getByRole('heading', { name: 'Open Ticket' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved Ticket' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Closed Ticket' })).not.toBeInTheDocument();

    // Resolved filter
    fireEvent.click(screen.getByRole('button', { name: /^resolved/i }));
    expect(screen.getByRole('heading', { name: 'Resolved Ticket' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Open Ticket' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Closed Ticket' })).not.toBeInTheDocument();

    // Closed filter
    fireEvent.click(screen.getByRole('button', { name: /^closed/i }));
    expect(screen.getByRole('heading', { name: 'Closed Ticket' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Open Ticket' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved Ticket' })).not.toBeInTheDocument();

    // Back to All
    fireEvent.click(screen.getByRole('button', { name: /^all/i }));
    expect(screen.getByRole('heading', { name: 'Open Ticket' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resolved Ticket' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Closed Ticket' })).toBeInTheDocument();
  });

  it('should show the empty state when the active filter has no matching tickets', async () => {
    const tickets = [makeTicket({ id: '1', title: 'Open Ticket', status: 'open' })];
    (axios.get as any).mockResolvedValue({ data: tickets });

    renderWithQuery(<TicketsList />);

    await screen.findByRole('heading', { name: 'Open Ticket' });

    fireEvent.click(screen.getByRole('button', { name: /^in-progress/i }));

    expect(screen.queryByRole('heading', { name: 'Open Ticket' })).not.toBeInTheDocument();
    expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
  });
});

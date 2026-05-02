import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithQuery } from '@/test-utils';
import TicketDetails from '../TicketDetails';
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
      id: 'agent-1',
      name: 'Agent User',
      email: 'agent@example.com',
      role: UserRole.AGENT,
    },
  },
  isPending: false,
};

const MOCK_TICKET: Ticket = {
  id: 'ticket-123',
  ticketNumber: 123,
  title: 'Database connection fails',
  description: 'Getting 500 error when saving changes to the PostgreSQL database.',
  status: 'open',
  priority: 'high',
  category: 'technical_question',
  customerEmail: 'customer@example.com',
  createdAt: '2026-06-28T12:00:00.000Z',
  updatedAt: '2026-06-28T12:05:00.000Z',
  assignedToId: null,
  assigned_to: null,
};

const MOCK_AGENTS = [
  { id: 'agent-alice', name: 'Agent Alice', role: UserRole.AGENT },
  { id: 'admin-bob', name: 'Admin Bob', role: UserRole.ADMIN },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TicketDetails Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (authClient.useSession as any).mockReturnValue(MOCK_SESSION);
    window.confirm = vi.fn().mockReturnValue(true);

    // Default mock setup: match URL to return correct mock data
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return Promise.resolve({ data: MOCK_TICKET });
    });
  });

  it('renders loading state initially', async () => {
    // Return a pending promise for the query
    let resolveQuery: any;
    const getPromise = new Promise<{ data: any }>((resolve) => {
      resolveQuery = resolve;
    });
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return getPromise;
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    // Should display skeleton / loading indicators
    expect(screen.queryByText('Database connection fails')).not.toBeInTheDocument();

    // Clean up
    resolveQuery({ data: MOCK_TICKET });
  });

  it('renders ticket details on successful load', async () => {
    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    expect(screen.getByText(/ID: ticket-123/i)).toBeInTheDocument();
    expect(screen.getAllByText('Technical Question')[0]).toBeInTheDocument();
    expect(screen.getByText(/high Priority/i)).toBeInTheDocument();
    expect(screen.getByText(/customer@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Getting 500 error/i)).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('renders ticket not found state on API error', async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return Promise.reject(new Error('Not found'));
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Ticket Not Found' });
    expect(screen.getByText(/The ticket you are looking for does not exist/i)).toBeInTheDocument();
  });

  it('allows changing status via dropdown', async () => {
    (axios.patch as any).mockResolvedValue({ data: { ...MOCK_TICKET, status: 'in-progress' } });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    const select = screen.getByLabelText('Ticket Status');
    fireEvent.change(select, { target: { value: 'in-progress' } });

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith('/api/tickets/123', { status: 'in-progress' });
    });
  });

  it('renders "Unassigned" and allows assigning to an agent', async () => {
    (axios.patch as any).mockResolvedValue({ 
      data: { ...MOCK_TICKET, assignedToId: 'agent-alice', assigned_to: MOCK_AGENTS[0] } 
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    // Displays Unassigned initially
    expect(screen.getAllByText('Unassigned')[0]).toBeInTheDocument();

    const select = screen.getByLabelText('Assigned To');
    fireEvent.change(select, { target: { value: 'agent-alice' } });

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith('/api/tickets/123', { assigned_to: 'agent-alice' });
    });
  });

  it('displays the assigned agent name and allows unassigning', async () => {
    // Ticket starts out as assigned to agent-alice
    const assignedTicket = {
      ...MOCK_TICKET,
      assignedToId: 'agent-alice',
      assigned_to: MOCK_AGENTS[0]
    };

    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return Promise.resolve({ data: assignedTicket });
    });

    (axios.patch as any).mockResolvedValue({ 
      data: { ...MOCK_TICKET, assignedToId: null, assigned_to: null } 
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    // Displays Agent Alice selection
    const select = screen.getByLabelText('Assigned To') as HTMLSelectElement;
    expect(select.value).toBe('agent-alice');

    fireEvent.change(select, { target: { value: 'unassigned' } });

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith('/api/tickets/123', { assigned_to: null });
    });
  });

  it('allows deleting the ticket and navigates to homepage', async () => {
    (axios.delete as any).mockResolvedValue({ data: {} });

    renderWithQuery(
      <Routes>
        <Route path="/" element={<div>Home Dashboard</div>} />
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    const deleteBtn = screen.getByRole('button', { name: /Delete Ticket/i });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/tickets/123');
    });

    await screen.findByText('Home Dashboard');
  });

  it('renders "No replies yet" message when there are no replies', async () => {
    const ticketWithoutReplies = {
      ...MOCK_TICKET,
      replies: [],
    };

    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return Promise.resolve({ data: ticketWithoutReplies });
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });
    expect(screen.getByText(/No replies yet/i)).toBeInTheDocument();
  });

  it('renders existing replies in the thread', async () => {
    const ticketWithReplies = {
      ...MOCK_TICKET,
      replies: [
        {
          id: 'reply-1',
          content: 'This is the first reply from agent',
          senderType: 'agent',
          ticketId: 'ticket-123',
          userId: 'agent-alice',
          user: {
            id: 'agent-alice',
            name: 'Agent Alice',
            email: 'alice@example.com',
            role: UserRole.AGENT,
          },
          createdAt: '2026-06-28T13:00:00.000Z',
          updatedAt: '2026-06-28T13:00:00.000Z',
        },
        {
          id: 'reply-2',
          content: 'This is the second reply from admin',
          senderType: 'agent',
          ticketId: 'ticket-123',
          userId: 'admin-bob',
          user: {
            id: 'admin-bob',
            name: 'Admin Bob',
            email: 'bob@example.com',
            role: UserRole.ADMIN,
          },
          createdAt: '2026-06-28T13:05:00.000Z',
          updatedAt: '2026-06-28T13:05:00.000Z',
        },
        {
          id: 'reply-3',
          content: 'This is a customer reply content',
          senderType: 'customer',
          ticketId: 'ticket-123',
          customerEmail: 'customer-jack@example.com',
          customerName: 'Customer Jack',
          createdAt: '2026-06-28T13:10:00.000Z',
          updatedAt: '2026-06-28T13:10:00.000Z',
        },
      ],
    };

    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return Promise.resolve({ data: ticketWithReplies });
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });
    
    expect(screen.getByText('This is the first reply from agent')).toBeInTheDocument();
    expect(screen.getByText('Agent Alice')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();

    expect(screen.getByText('This is the second reply from admin')).toBeInTheDocument();
    expect(screen.getByText('Admin Bob')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    expect(screen.getByText('This is a customer reply content')).toBeInTheDocument();
    expect(screen.getByText('Customer Jack')).toBeInTheDocument();
    expect(screen.getAllByText('Customer').length).toBeGreaterThan(0);
  });

  it('allows submitting a new reply and sends request to server', async () => {
    (axios.post as any).mockResolvedValue({ data: {} });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'I am working on a fix now.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Reply/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/tickets/123/replies', {
        content: 'I am working on a fix now.',
      });
    });
  });
});

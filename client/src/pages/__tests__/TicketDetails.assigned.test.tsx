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
  { id: 'agent-alice', name: 'Agent Alice', role: 'agent' },
  { id: 'admin-bob', name: 'Admin Bob', role: 'admin' },
];

describe('TicketDetails - Assigned To Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders "Unassigned" by default', async () => {
    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    // The "Assigned To" section label should be visible
    expect(screen.getByText('Assigned To')).toBeInTheDocument();
    
    // The sidebar dropdown should display "Unassigned"
    const select = screen.getByLabelText('Assigned To') as HTMLSelectElement;
    expect(select.value).toBe('unassigned');
  });

  it('renders assigned agent name when ticket has an assignment', async () => {
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
  });

  it('loads and renders agent options in the dropdown', async () => {
    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    // axios.get for agents is called on mount
    expect(axios.get).toHaveBeenCalledWith('/api/agents');

    // All agent options appear in the dropdown (Agent Alice, Admin Bob)
    const select = screen.getByLabelText('Assigned To') as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    const options = Array.from(select.options);
    expect(options).toHaveLength(3); // Unassigned + 2 agents

    // "Unassigned" is always the first option
    expect(options[0]?.text).toBe('Unassigned');
    expect(options[0]?.value).toBe('unassigned');

    expect(options[1]?.text).toBe('Agent Alice (agent)');
    expect(options[1]?.value).toBe('agent-alice');

    expect(options[2]?.text).toBe('Admin Bob (admin)');
    expect(options[2]?.value).toBe('admin-bob');
  });

  it('sends PATCH request when agent is changed', async () => {
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

    // Simulate selecting a different agent from the dropdown
    const select = screen.getByLabelText('Assigned To');
    fireEvent.change(select, { target: { value: 'agent-alice' } });

    // Assert axios.patch is called with the correct endpoint and payload
    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith('/api/tickets/123', { assigned_to: 'agent-alice' });
    });
  });

  it('shows success toast after successful assignment update', async () => {
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

    const select = screen.getByLabelText('Assigned To');
    fireEvent.change(select, { target: { value: 'agent-alice' } });

    // Assert success toast appears after selection
    await screen.findByText('Assignment updated successfully');
  });

  it('renders "AI" in dropdown when ticket is auto-resolved by AI with a valid assignedToId', async () => {
    const aiResolvedTicket = {
      ...MOCK_TICKET,
      isAiResolved: true,
      assignedToId: 'ai-user-id',
      assigned_to: { id: 'ai-user-id', name: 'AI Agent', email: 'ai@example.com', role: 'agent' }
    };

    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return Promise.resolve({ data: aiResolvedTicket });
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    const select = screen.getByLabelText('Assigned To') as HTMLSelectElement;
    expect(select.value).toBe('ai-user-id');
    const option = select.querySelector('option[value="ai-user-id"]');
    expect(option).toBeInTheDocument();
    expect(option?.textContent).toBe('AI');
  });

  it('renders "AI" in dropdown when ticket is auto-resolved by AI but assignedToId is null', async () => {
    const aiResolvedTicketWithNullAssignee = {
      ...MOCK_TICKET,
      isAiResolved: true,
      assignedToId: null,
      assigned_to: null
    };

    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: MOCK_AGENTS });
      }
      return Promise.resolve({ data: aiResolvedTicketWithNullAssignee });
    });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>,
      { route: '/tickets/123' }
    );

    await screen.findByRole('heading', { name: 'Database connection fails' });

    const select = screen.getByLabelText('Assigned To') as HTMLSelectElement;
    expect(select.value).toBe('ai-resolved');
    const option = select.querySelector('option[value="ai-resolved"]');
    expect(option).toBeInTheDocument();
    expect(option?.textContent).toBe('AI');
  });
});

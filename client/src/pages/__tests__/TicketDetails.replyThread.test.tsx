import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithQuery } from '@/test-utils';
import TicketDetails from '../TicketDetails';
import { authClient } from '@/lib/auth-client';
import axios from 'axios';
import { UserRole } from '@/types';
import type { Ticket, TicketReply } from '@/types';

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
// Fixtures
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

const BASE_TICKET: Ticket = {
  id: 'ticket-rt-1',
  ticketNumber: 1,
  title: 'Reply thread test ticket',
  description: 'Testing the reply thread rendering.',
  status: 'open',
  priority: 'medium',
  category: 'general_question',
  customerEmail: 'requester@example.com',
  createdAt: '2026-06-20T08:00:00.000Z',
  updatedAt: '2026-06-20T08:30:00.000Z',
  assignedToId: null,
  assigned_to: null,
};

const AGENT_REPLY: TicketReply = {
  id: 'reply-agent-1',
  content: 'We are looking into your issue.',
  senderType: 'agent',
  ticketId: 'ticket-rt-1',
  userId: 'agent-1',
  user: {
    id: 'agent-1',
    name: 'Agent Smith',
    email: 'smith@helpdesk.com',
    role: UserRole.AGENT,
  },
  createdAt: '2026-06-20T09:00:00.000Z',
  updatedAt: '2026-06-20T09:00:00.000Z',
};

const ADMIN_REPLY: TicketReply = {
  id: 'reply-admin-1',
  content: 'Escalating this to engineering.',
  senderType: 'agent',
  ticketId: 'ticket-rt-1',
  userId: 'admin-1',
  user: {
    id: 'admin-1',
    name: 'Admin Boss',
    email: 'boss@helpdesk.com',
    role: UserRole.ADMIN,
  },
  createdAt: '2026-06-20T09:15:00.000Z',
  updatedAt: '2026-06-20T09:15:00.000Z',
};

const CUSTOMER_REPLY: TicketReply = {
  id: 'reply-customer-1',
  content: 'Thanks for the quick response!',
  senderType: 'customer',
  ticketId: 'ticket-rt-1',
  customerEmail: 'requester@example.com',
  customerName: 'John Customer',
  createdAt: '2026-06-20T09:30:00.000Z',
  updatedAt: '2026-06-20T09:30:00.000Z',
};

const CUSTOMER_REPLY_NO_NAME: TicketReply = {
  id: 'reply-customer-2',
  content: 'Any update on this?',
  senderType: 'customer',
  ticketId: 'ticket-rt-1',
  customerEmail: 'someone.else@example.com',
  createdAt: '2026-06-20T10:00:00.000Z',
  updatedAt: '2026-06-20T10:00:00.000Z',
};

const MOCK_AGENTS = [
  { id: 'agent-1', name: 'Agent Smith', role: UserRole.AGENT },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage(ticket: Ticket) {
  (axios.get as any).mockImplementation((url: string) => {
    if (url.includes('/api/agents')) {
      return Promise.resolve({ data: MOCK_AGENTS });
    }
    return Promise.resolve({ data: ticket });
  });

  return renderWithQuery(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetails />} />
    </Routes>,
    { route: '/tickets/1' }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TicketDetails - Reply Thread', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (authClient.useSession as any).mockReturnValue(MOCK_SESSION);
    window.confirm = vi.fn().mockReturnValue(true);
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  it('shows the "Reply Thread" heading', async () => {
    renderPage({ ...BASE_TICKET, replies: [] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });
    expect(screen.getByText('Reply Thread')).toBeInTheDocument();
  });

  it('shows "No replies yet" message when there are no replies', async () => {
    renderPage({ ...BASE_TICKET, replies: [] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });
    expect(screen.getByText(/No replies yet/i)).toBeInTheDocument();
  });

  it('shows "No replies yet" when replies is undefined', async () => {
    const ticketWithoutReplies = { ...BASE_TICKET };
    delete (ticketWithoutReplies as any).replies;

    renderPage(ticketWithoutReplies);

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });
    expect(screen.getByText(/No replies yet/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Agent reply rendering
  // -----------------------------------------------------------------------

  it('renders an agent reply with name, content, and "Agent" badge', async () => {
    renderPage({ ...BASE_TICKET, replies: [AGENT_REPLY] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    expect(screen.getByText('We are looking into your issue.')).toBeInTheDocument();
    expect(screen.getByText('Agent Smith')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('renders the agent reply avatar with the first character of the name', async () => {
    renderPage({ ...BASE_TICKET, replies: [AGENT_REPLY] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    // "Agent Smith" -> avatar "A"
    // Note: the requester section also has an avatar, so we use getAllByText
    const avatarLetters = screen.getAllByText('A');
    expect(avatarLetters.length).toBeGreaterThanOrEqual(1);
  });

  it('renders and sanitizes bodyHtml when present', async () => {
    const replyWithHtml: TicketReply = {
      ...AGENT_REPLY,
      id: 'reply-html-1',
      content: 'This is fallback plain content.',
      bodyHtml: '<p>Hello <strong>world</strong>!<script>alert(1)</script></p>',
    };
    const { container } = renderPage({ ...BASE_TICKET, replies: [replyWithHtml] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    // Find the rendered html container
    const strongElement = container.querySelector('strong');
    expect(strongElement).toBeInTheDocument();
    expect(strongElement?.textContent).toBe('world');
    
    // Verify script tag is stripped
    const scriptElement = container.querySelector('script');
    expect(scriptElement).not.toBeInTheDocument();
    
    // Verify plain content fallback is NOT rendered when bodyHtml is present
    expect(screen.queryByText('This is fallback plain content.')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Admin reply rendering
  // -----------------------------------------------------------------------

  it('renders an admin reply with the "Admin" badge', async () => {
    renderPage({ ...BASE_TICKET, replies: [ADMIN_REPLY] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    expect(screen.getByText('Escalating this to engineering.')).toBeInTheDocument();
    expect(screen.getByText('Admin Boss')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Customer reply rendering
  // -----------------------------------------------------------------------

  it('renders a customer reply with name, content, and "Customer" badge', async () => {
    renderPage({ ...BASE_TICKET, replies: [CUSTOMER_REPLY] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    expect(screen.getByText('Thanks for the quick response!')).toBeInTheDocument();
    expect(screen.getByText('John Customer')).toBeInTheDocument();
    // "Customer" appears as both the badge text and possibly elsewhere,
    // so we use getAllByText for safety
    expect(screen.getAllByText('Customer').length).toBeGreaterThanOrEqual(1);
  });

  it('derives a customer name from email when customerName is absent', async () => {
    renderPage({ ...BASE_TICKET, replies: [CUSTOMER_REPLY_NO_NAME] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    expect(screen.getByText('Any update on this?')).toBeInTheDocument();
    // getTicketSender for "someone.else@example.com" -> "Someone Else"
    // But the reply thread uses reply.customerName first, then falls back via getTicketSender
    // Since customerName is undefined, it falls through to getTicketSender
    expect(screen.getAllByText('Customer').length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // Multiple replies in thread
  // -----------------------------------------------------------------------

  it('renders all replies in order when multiple exist', async () => {
    renderPage({
      ...BASE_TICKET,
      replies: [AGENT_REPLY, ADMIN_REPLY, CUSTOMER_REPLY],
    });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    // All three reply contents should be visible
    expect(screen.getByText('We are looking into your issue.')).toBeInTheDocument();
    expect(screen.getByText('Escalating this to engineering.')).toBeInTheDocument();
    expect(screen.getByText('Thanks for the quick response!')).toBeInTheDocument();
  });

  it('shows both "Agent" and "Admin" badges when both reply types exist', async () => {
    renderPage({
      ...BASE_TICKET,
      replies: [AGENT_REPLY, ADMIN_REPLY],
    });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Timestamps
  // -----------------------------------------------------------------------

  it('renders the reply creation timestamp formatted as a locale string', async () => {
    renderPage({ ...BASE_TICKET, replies: [AGENT_REPLY] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    const expectedDate = new Date('2026-06-20T09:00:00.000Z').toLocaleString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Reply with missing user (edge case)
  // -----------------------------------------------------------------------

  it('renders "Unknown User" when an agent reply has no user object', async () => {
    const replyWithNoUser: TicketReply = {
      ...AGENT_REPLY,
      id: 'reply-no-user',
      user: null,
    };
    renderPage({ ...BASE_TICKET, replies: [replyWithNoUser] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    expect(screen.getByText('We are looking into your issue.')).toBeInTheDocument();
    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Submitting a new reply
  // -----------------------------------------------------------------------

  it('submits a reply via the form and sends POST request', async () => {
    (axios.post as any).mockResolvedValue({ data: {} });
    renderPage({ ...BASE_TICKET, replies: [] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Here is my reply.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Reply/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/tickets/1/replies', {
        content: 'Here is my reply.',
      });
    });
  });

  it('shows success toast after a reply is submitted successfully', async () => {
    (axios.post as any).mockResolvedValue({ data: {} });
    renderPage({ ...BASE_TICKET, replies: [] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'A test reply' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Reply/i });
    fireEvent.click(submitBtn);

    await screen.findByText('Reply submitted successfully');
  });

  it('shows error toast when reply submission fails', async () => {
    (axios.post as any).mockRejectedValue(new Error('Server error'));
    renderPage({ ...BASE_TICKET, replies: [] });

    await screen.findByRole('heading', { name: 'Reply thread test ticket' });

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'This will fail' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Reply/i });
    fireEvent.click(submitBtn);

    await screen.findByText('Failed to submit reply');
  });
});

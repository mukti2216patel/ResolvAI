import { renderWithQuery } from '@/test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TicketDetail from '../TicketDetail';
import type { Ticket } from '@/types';
import axios from 'axios';

vi.mock('axios');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_TICKET: Ticket = {
  id: 'ticket-abc-123',
  ticketNumber: 123,
  title: 'Cannot reset my password',
  description: 'I keep clicking the reset link but nothing happens.',
  status: 'open',
  priority: 'medium',
  category: 'general_question',
  customerEmail: 'jane.doe@example.com',
  createdAt: '2026-06-15T09:30:00.000Z',
  updatedAt: '2026-06-15T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TicketDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // -----------------------------------------------------------------------
  // Basic rendering
  // -----------------------------------------------------------------------

  it('renders ticket id, title, and description', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    expect(screen.getByText(/ID: ticket-abc-123/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cannot reset my password' })).toBeInTheDocument();
    expect(screen.getByText('I keep clicking the reset link but nothing happens.')).toBeInTheDocument();
  });

  it('renders "No description provided." when description is empty', () => {
    const ticket = { ...BASE_TICKET, description: '' };
    renderWithQuery(<TicketDetail ticket={ticket} />);

    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Status badges
  // -----------------------------------------------------------------------

  it.each([
    ['open'],
    ['in-progress'],
    ['resolved'],
    ['closed'],
  ] as const)('renders the "%s" status badge', (status) => {
    const ticket = { ...BASE_TICKET, status };
    renderWithQuery(<TicketDetail ticket={ticket} />);

    expect(screen.getByText(status)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Priority display
  // -----------------------------------------------------------------------

  it.each([
    ['low', 'low Priority'],
    ['medium', 'medium Priority'],
    ['high', 'high Priority'],
    ['critical', 'critical Priority'],
  ] as const)('renders "%s" priority badge with text "%s"', (priority, expectedText) => {
    const ticket = { ...BASE_TICKET, priority };
    renderWithQuery(<TicketDetail ticket={ticket} />);

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Category labels
  // -----------------------------------------------------------------------

  it.each([
    ['general_question', 'General Question'],
    ['technical_question', 'Technical Question'],
    ['refund_request', 'Refund Request'],
  ] as const)('renders the human-readable label "%s" for category %s', (category, label) => {
    const ticket = { ...BASE_TICKET, category };
    renderWithQuery(<TicketDetail ticket={ticket} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Dates
  // -----------------------------------------------------------------------

  it('renders created and updated dates as formatted locale strings', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    const createdDate = new Date('2026-06-15T09:30:00.000Z').toLocaleString();
    const updatedDate = new Date('2026-06-15T10:00:00.000Z').toLocaleString();

    expect(screen.getByText(`Created: ${createdDate}`)).toBeInTheDocument();
    expect(screen.getByText(`Last Updated: ${updatedDate}`)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requester Details — customer email (no registered user)
  // -----------------------------------------------------------------------

  it('renders requester name derived from customerEmail when no user is attached', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    // getTicketSender splits "jane.doe" -> "Jane Doe"
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
  });

  it('shows the first letter of the sender name as the avatar', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    // "Jane Doe" -> avatar shows "J"
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('does not show the "Registered" badge when there is no user', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    expect(screen.queryByText('Registered')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requester Details — registered user
  // -----------------------------------------------------------------------

  it('shows the "Registered" badge and user name when a user is attached', () => {
    const ticket: Ticket = {
      ...BASE_TICKET,
      customerEmail: 'alice@example.com',
      user: { name: 'Alice Wonderland', email: 'alice@example.com' },
    };
    renderWithQuery(<TicketDetail ticket={ticket} />);

    expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Registered')).toBeInTheDocument();
  });

  it('renders the avatar with the first letter of a registered user name', () => {
    const ticket: Ticket = {
      ...BASE_TICKET,
      customerEmail: 'alice@example.com',
      user: { name: 'Alice Wonderland', email: 'alice@example.com' },
    };
    const { container } = renderWithQuery(<TicketDetail ticket={ticket} />);

    // The avatar is a rounded div whose text is the first letter of the name
    const avatar = container.querySelector('.rounded-full.bg-accent-theme\\/10');
    expect(avatar).toBeInTheDocument();
    expect(avatar?.textContent).toBe('A');
  });

  // -----------------------------------------------------------------------
  // Requester Details — system fallback (no email, no user)
  // -----------------------------------------------------------------------

  it('falls back to "System" / system@helpdesk.com when no customerEmail and no user', () => {
    const ticket: Ticket = {
      ...BASE_TICKET,
      customerEmail: undefined,
      user: undefined,
    };
    renderWithQuery(<TicketDetail ticket={ticket} />);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('system@helpdesk.com')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Copy ticket ID button
  // -----------------------------------------------------------------------

  it('copies the ticket ID to clipboard on button click', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    const copyBtn = screen.getByTitle('Copy Ticket ID');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('ticket-abc-123');

    // After clicking, the check icon should appear briefly (state becomes copied)
    // We verify the copy fn was called correctly; the UI swap is internal state
  });

  // -----------------------------------------------------------------------
  // Title sanitisation — strips "(Ticket #NNN)" suffix
  // -----------------------------------------------------------------------

  it('strips a trailing "(Ticket #NNN)" from the title', () => {
    const ticket = { ...BASE_TICKET, title: 'Login error (Ticket #42)' };
    renderWithQuery(<TicketDetail ticket={ticket} />);

    expect(screen.getByRole('heading', { name: 'Login error' })).toBeInTheDocument();
    expect(screen.queryByText(/Ticket #42/)).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Section headings
  // -----------------------------------------------------------------------

  it('renders the "Requester Details" and "Description" section headings', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    expect(screen.getByText('Requester Details')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Email mailto link
  // -----------------------------------------------------------------------

  it('renders the requester email as a clickable mailto link', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    const emailLink = screen.getByRole('link', { name: 'jane.doe@example.com' });
    expect(emailLink).toHaveAttribute('href', 'mailto:jane.doe@example.com');
  });

  // -----------------------------------------------------------------------
  // Ticket Summarization
  // -----------------------------------------------------------------------

  it('renders the Summarize Ticket button', () => {
    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);
    expect(screen.getByRole('button', { name: /Summarize Ticket/i })).toBeInTheDocument();
  });

  it('calls the summarize API and displays the summary on success', async () => {
    (axios.post as any).mockResolvedValueOnce({ data: { summary: 'This is an AI summary of the ticket.' } });

    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    const summarizeBtn = screen.getByRole('button', { name: /Summarize Ticket/i });
    fireEvent.click(summarizeBtn);

    expect(screen.getByRole('button', { name: /Summarizing.../i })).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/tickets/123/summarize');
    });

    await waitFor(() => {
      expect(screen.getByText('This is an AI summary of the ticket.')).toBeInTheDocument();
    });
  });

  it('shows an error message if the summarize API fails', async () => {
    (axios.post as any).mockRejectedValueOnce({
      response: { data: { error: 'Failed to generate ticket summary.' } }
    });

    renderWithQuery(<TicketDetail ticket={BASE_TICKET} />);

    const summarizeBtn = screen.getByRole('button', { name: /Summarize Ticket/i });
    fireEvent.click(summarizeBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to generate ticket summary.')).toBeInTheDocument();
    });
  });
});

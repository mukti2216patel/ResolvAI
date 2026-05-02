import { renderWithQuery } from '@/test-utils';
import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TicketCard from '../TicketCard';
import type { Ticket } from '../../types';

const mockTicket: Ticket = {
  id: 'ticket-1',
  ticketNumber: 1,
  title: 'Payment Failed',
  description: 'My payment was deducted twice.',
  status: 'open',
  priority: 'high',
  category: 'refund_request',
  createdAt: '2025-03-15T10:00:00.000Z',
  updatedAt: '2025-03-15T10:00:00.000Z',
};

describe('TicketCard', () => {
  const onStatusChange = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the ticket details and the category badge correctly', () => {
    renderWithQuery(
      <TicketCard
        ticket={mockTicket}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
    );

    // Verify card details are displayed
    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
    expect(screen.getByText('My payment was deducted twice.')).toBeInTheDocument();
    
    // Verify the category badge displays the translated label
    expect(screen.getByText('Refund Request')).toBeInTheDocument();
    
    // Verify status displays
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('triggers onStatusChange when status is changed', () => {
    renderWithQuery(
      <TicketCard
        ticket={mockTicket}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'in-progress' } });

    expect(onStatusChange).toHaveBeenCalledWith('1', 'in-progress');
  });

  it('triggers onDelete when delete button is clicked', () => {
    renderWithQuery(
      <TicketCard
        ticket={mockTicket}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('shows the creation date formatted to locale string', () => {
    renderWithQuery(
      <TicketCard ticket={mockTicket} onStatusChange={onStatusChange} onDelete={onDelete} />
    );
    const expectedDate = new Date(mockTicket.createdAt).toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('shows the status select with the ticket status as the selected value', () => {
    const ticket = { ...mockTicket, status: 'in-progress' as const };
    renderWithQuery(
      <TicketCard ticket={ticket} onStatusChange={onStatusChange} onDelete={onDelete} />
    );
    expect(screen.getByRole('combobox')).toHaveValue('in-progress');
  });

  it.each([
    ['low', '🟢 low'],
    ['medium', '🟡 medium'],
    ['high', '🟠 high'],
    ['critical', '🔴 critical'],
  ] as const)(
    'displays the correct priority emoji and label for %s priority',
    (priority, expectedText) => {
      const ticket = { ...mockTicket, priority };
      renderWithQuery(
        <TicketCard ticket={ticket} onStatusChange={vi.fn()} onDelete={vi.fn()} />
      );
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    },
  );

  it('displays the "General Question" label for general_question category', () => {
    const ticket = { ...mockTicket, category: 'general_question' as const };
    renderWithQuery(
      <TicketCard ticket={ticket} onStatusChange={onStatusChange} onDelete={onDelete} />
    );
    expect(screen.getByText('General Question')).toBeInTheDocument();
  });

  it('displays the "Technical Question" label for technical_question category', () => {
    const ticket = { ...mockTicket, category: 'technical_question' as const };
    renderWithQuery(
      <TicketCard ticket={ticket} onStatusChange={onStatusChange} onDelete={onDelete} />
    );
    expect(screen.getByText('Technical Question')).toBeInTheDocument();
  });
});

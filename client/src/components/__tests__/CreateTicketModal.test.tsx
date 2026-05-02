import { renderWithQuery } from '@/test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateTicketModal from '../CreateTicketModal';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { withCredentials: false },
  },
}));

const MOCK_AGENTS = [
  { id: 'agent-alice', name: 'Agent Alice', role: 'agent' },
  { id: 'admin-bob', name: 'Admin Bob', role: 'admin' },
];

describe('CreateTicketModal', () => {
  const onClose = vi.fn();
  const onCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (axios.get as any).mockResolvedValue({ data: MOCK_AGENTS });
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders all fields and defaults category to "general_question"', async () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    expect(screen.getByRole('heading', { name: /create new ticket/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument();

    const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(categorySelect).toBeInTheDocument();
    expect(categorySelect.value).toBe('general_question');

    // Wait for agents list to populate options
    await waitFor(() => {
      expect(screen.getByText('Agent Alice (agent)')).toBeInTheDocument();
    });
  });

  it('defaults the priority select to "medium"', () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
    expect(prioritySelect.value).toBe('medium');
  });

  // ── Successful submission ──────────────────────────────────────────────────

  it('submits form with user-entered values including custom category and assignment', async () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/title \*/i), { target: { value: 'API Issue' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Endpoint is returning 500 error.' } });
    fireEvent.change(screen.getByLabelText(/priority/i), { target: { value: 'critical' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'technical_question' } });

    // Wait for and select agent-alice
    await screen.findByText('Agent Alice (agent)');
    fireEvent.change(screen.getByLabelText(/assign to/i), { target: { value: 'agent-alice' } });

    fireEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'API Issue',
        description: 'Endpoint is returning 500 error.',
        priority: 'critical',
        category: 'technical_question',
        assigned_to: 'agent-alice',
      });
    });
  });

  it('trims leading/trailing whitespace from title before calling onCreate', async () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/title \*/i), { target: { value: '  Trimmed Title  ' } });
    fireEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Trimmed Title', assigned_to: null }),
      );
    });
  });

  // ── Client-side validation ─────────────────────────────────────────────────

  it('shows a validation error and does NOT call onCreate when title is empty', async () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    // Submit without filling in the title
    fireEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows a validation error when title contains only whitespace', async () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/title \*/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
    expect(onCreate).not.toHaveBeenCalled();
  });

  // ── Modal close triggers ───────────────────────────────────────────────────

  it('calls onClose when the Cancel button is clicked', () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('calls onClose when the × close button is clicked', () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    // The × button is rendered adjacent to the heading
    fireEvent.click(screen.getByRole('button', { name: /×/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop overlay is clicked', () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    // The outermost div is the backdrop; clicking it calls onClose.
    // The inner modal card stops propagation, so clicking the heading should NOT close it.
    const backdrop = screen.getByRole('heading', { name: /create new ticket/i })
      .closest('[class*="fixed"]') as HTMLElement;

    // Click the backdrop element directly (not the inner modal)
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when clicking inside the modal card (propagation is stopped)', () => {
    renderWithQuery(<CreateTicketModal onClose={onClose} onCreate={onCreate} />);

    // Clicking the heading (inside the modal card) must not trigger onClose
    fireEvent.click(screen.getByRole('heading', { name: /create new ticket/i }));

    expect(onClose).not.toHaveBeenCalled();
  });
});

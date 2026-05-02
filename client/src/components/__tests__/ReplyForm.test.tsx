import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReplyForm from '../ReplyForm';
import axios from 'axios';

vi.mock('axios');

describe('ReplyForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the reply form elements correctly', () => {
    render(<ReplyForm onSubmit={vi.fn()} isPending={false} />);

    expect(screen.getByRole('heading', { name: /New Reply/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Reply/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Polish Reply/i })).toBeInTheDocument();
  });

  it('disables the submit button when content is empty', () => {
    const handleSubmit = vi.fn();
    render(<ReplyForm onSubmit={handleSubmit} isPending={false} />);

    const submitBtn = screen.getByRole('button', { name: /Submit Reply/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Valid reply text' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onSubmit with content when valid and resets form on success', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(true);
    render(<ReplyForm onSubmit={handleSubmit} isPending={false} />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Valid reply text' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Reply/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith('Valid reply text');
    });

    // Verify reset behavior: textarea is empty
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe('');
    });
  });

  it('keeps content in the textarea when onSubmit rejects/fails', async () => {
    const handleSubmit = vi.fn().mockRejectedValue(new Error('Submit failed'));
    render(<ReplyForm onSubmit={handleSubmit} isPending={false} />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'This text should stay' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Reply/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith('This text should stay');
    });

    // Content should still remain inside textarea
    expect((textarea as HTMLTextAreaElement).value).toBe('This text should stay');
  });

  it('disables the submit button and shows loading text when isPending is true', () => {
    render(<ReplyForm onSubmit={vi.fn()} isPending={true} />);

    const submitBtn = screen.getByRole('button', { name: /Sending.../i });
    expect(submitBtn).toBeDisabled();
  });

  it('renders and manages the Polish Reply button states', () => {
    render(<ReplyForm onSubmit={vi.fn()} isPending={false} />);

    const polishBtn = screen.getByRole('button', { name: /Polish Reply/i });
    expect(polishBtn).toBeInTheDocument();
    // Disabled initially since textarea is empty
    expect(polishBtn).toBeDisabled();
    expect(polishBtn).toHaveAttribute('title', 'Reply too short to polish');

    const textarea = screen.getByPlaceholderText('Type your message here...');
    
    // Less than 10 characters: should be disabled and show tooltip
    fireEvent.change(textarea, { target: { value: 'Short' } });
    expect(polishBtn).toBeDisabled();
    expect(polishBtn).toHaveAttribute('title', 'Reply too short to polish');

    // 10 characters: should now be enabled and have no tooltip
    fireEvent.change(textarea, { target: { value: 'Draft text' } });
    expect(polishBtn).not.toBeDisabled();
    expect(polishBtn).not.toHaveAttribute('title');
  });

  it('calls the polish API and updates the textarea on success', async () => {
    (axios.post as any).mockResolvedValue({ data: { polishedContent: 'Polished draft text' } });
    render(<ReplyForm onSubmit={vi.fn()} isPending={false} />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Draft text' } });

    const polishBtn = screen.getByRole('button', { name: /Polish Reply/i });
    fireEvent.click(polishBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/tickets/polish', { content: 'Draft text' });
    });

    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe('Polished draft text');
    });
  });

  it('passes customerName in the request when provided as a prop', async () => {
    (axios.post as any).mockResolvedValue({ data: { polishedContent: 'Polished text' } });
    render(<ReplyForm onSubmit={vi.fn()} isPending={false} customerName="John Doe" />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Draft text' } });

    const polishBtn = screen.getByRole('button', { name: /Polish Reply/i });
    fireEvent.click(polishBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/tickets/polish', { 
        content: 'Draft text', 
        customerName: 'John Doe' 
      });
    });
  });

  it('shows error message if the polish API fails', async () => {
    (axios.post as any).mockRejectedValue({
      response: { data: { error: 'Groq API rate limit reached' } }
    });
    render(<ReplyForm onSubmit={vi.fn()} isPending={false} />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Draft text' } });

    const polishBtn = screen.getByRole('button', { name: /Polish Reply/i });
    fireEvent.click(polishBtn);

    expect(await screen.findByText('Groq API rate limit reached')).toBeInTheDocument();
  });
});


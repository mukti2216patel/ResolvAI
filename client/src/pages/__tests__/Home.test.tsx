import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithQuery } from '@/test-utils';
import Home from '@/pages/Home';
import { authClient } from '@/lib/auth-client';
import axios from 'axios';
import { UserRole } from '@/types';

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

const MOCK_STATS = {
  totalTickets: 10,
  openTickets: 4,
  resolvedByAI: 3,
  percentResolvedByAI: 30,
  averageResolutionTimeMs: 120000,
  ticketsPerDay: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Home (Dashboard)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (authClient.useSession as any).mockReturnValue(MOCK_SESSION);
    (axios.get as any).mockImplementation((url: string) => {
      if (url && url.includes('/stats')) {
        return Promise.resolve({ data: MOCK_STATS });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('should display the dashboard header and welcome message', () => {
    renderWithQuery(<Home />);

    expect(screen.getByText('Helpdesk')).toBeInTheDocument();
    expect(screen.getByText(/Welcome, Admin User/i)).toBeInTheDocument();
  });

  it('should render the Tickets nav link', () => {
    renderWithQuery(<Home />);
    expect(screen.getByRole('link', { name: /^Tickets$/i })).toBeInTheDocument();
  });

  it('should render stats metrics after loading', async () => {
    renderWithQuery(<Home />);

    // Wait for the stats to appear
    await screen.findByText('Total Tickets');
    // totalTickets = 10
    expect(screen.getByText('10')).toBeInTheDocument();
    // openTickets = 4 — appears in metrics card; getAllByText handles duplicate matches (e.g. bar chart gridlines)
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
  });

  it('should redirect to /login when not authenticated', () => {
    (authClient.useSession as any).mockReturnValue({ data: null, isPending: false });
    renderWithQuery(<Home />);
    // MemoryRouter won't actually navigate, but Navigate component renders without throwing
    expect(screen.queryByText('Helpdesk')).not.toBeInTheDocument();
  });
});

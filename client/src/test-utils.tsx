import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';

export function renderWithQuery(
  ui: React.ReactElement,
  {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
    route = '/',
  } = {}
) {
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="helpdesk-theme-test">
          <MemoryRouter initialEntries={[route]}>
            {ui}
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    ),
    queryClient,
  };
}


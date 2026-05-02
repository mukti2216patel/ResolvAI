import { screen, fireEvent } from '@testing-library/react';
import { renderWithQuery } from '@/test-utils';
import ThemeToggle from '../ThemeToggle';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clean up local storage and document element classes before each test
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the theme toggle button', () => {
    renderWithQuery(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('opens the theme options dropdown when clicked', () => {
    renderWithQuery(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });

    // Initially options should not be visible
    expect(screen.queryByRole('button', { name: /^light$/i })).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(toggleButton);

    // Options should be visible now
    expect(screen.getByRole('button', { name: /^light$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^dark$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^system$/i })).toBeInTheDocument();
  });

  it('changes theme to light and updates DOM classes when Light is selected', () => {
    renderWithQuery(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });

    fireEvent.click(toggleButton);

    const lightOption = screen.getByRole('button', { name: /^light$/i });
    fireEvent.click(lightOption);

    // Document element should have 'light' class and not 'dark'
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('helpdesk-theme-test')).toBe('light');
  });

  it('changes theme to dark and updates DOM classes when Dark is selected', () => {
    // Initial render with theme provider test default
    renderWithQuery(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });

    fireEvent.click(toggleButton);

    const darkOption = screen.getByRole('button', { name: /^dark$/i });
    fireEvent.click(darkOption);

    // Document element should have 'dark' class
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(localStorage.getItem('helpdesk-theme-test')).toBe('dark');
  });
});

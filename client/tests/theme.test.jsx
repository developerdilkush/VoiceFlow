import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../src/contexts/ThemeContext.jsx';
import { ThemeToggle } from '../src/components/common/ThemeToggle.jsx';

describe('theme switching', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.classList.remove('dark'); });
  it('toggles dark class and persists the choice', async () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: /dark theme/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('vf-theme')).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: /light theme/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../src/pages/LoginPage.jsx';
import { ThemeProvider } from '../src/contexts/ThemeContext.jsx';

const login = vi.fn().mockResolvedValue();
vi.mock('../src/contexts/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, login }) }));

const setup = () => render(<MemoryRouter><ThemeProvider><LoginPage /></ThemeProvider></MemoryRouter>);

describe('LoginPage', () => {
  it('shows validation messages for empty fields and does not submit', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
  it('submits valid credentials', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret-pass' });
  });
});

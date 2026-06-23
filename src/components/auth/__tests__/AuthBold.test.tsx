import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AuthBold } from '../AuthBold';

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe('AuthBold', () => {
  it('renders the sign-in card with email + password fields and a Login submit', () => {
    const onSubmit = vi.fn();
    renderWithProviders(<AuthBold mode="signin" onSubmit={onSubmit} />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText('Keep me signed in')).toBeInTheDocument();
  });

  it('renders signup mode with full name + confirm password and hides the remember-me row', () => {
    renderWithProviders(<AuthBold mode="signup" onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.queryByText('Keep me signed in')).not.toBeInTheDocument();
  });

  it('renders forgot mode with only email and a "Send reset link" button', () => {
    renderWithProviders(<AuthBold mode="forgot" onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@email.com')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders reset mode with two password fields and no email field', () => {
    renderWithProviders(<AuthBold mode="reset" onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Set a new password' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('you@email.com')).not.toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('fires onSubmit when the form is submitted with valid input', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <AuthBold
        mode="signin"
        email="user@example.com"
        password="hunter22a"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows an error pill when error prop is set', () => {
    renderWithProviders(
      <AuthBold mode="signin" error="Invalid email or password." onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('renders doneSlot in place of the form when provided', () => {
    renderWithProviders(
      <AuthBold mode="reset" onSubmit={vi.fn()} doneSlot={<p>All done!</p>} />,
    );
    expect(screen.getByText('All done!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
  });

  it('flips to signup when the footer toggle is clicked from signin', () => {
    const onModeChange = vi.fn();
    renderWithProviders(
      <AuthBold mode="signin" onModeChange={onModeChange} onSubmit={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(onModeChange).toHaveBeenCalledWith('signup');
  });

  it('switches to forgot mode when the inline "Forgot?" button is clicked', () => {
    const onModeChange = vi.fn();
    renderWithProviders(
      <AuthBold mode="signin" onModeChange={onModeChange} onSubmit={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forgot?' }));
    expect(onModeChange).toHaveBeenCalledWith('forgot');
  });

  it('does not call onSubmit when passwords mismatch in signup', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <AuthBold
        mode="signup"
        name="Alex"
        email="alex@example.com"
        password="hunter22a"
        confirm="different"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

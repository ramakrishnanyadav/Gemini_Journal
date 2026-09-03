import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AuthScreen } from './AuthScreen';

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginWithOAuth = vi.fn();
const mockLoginAsGuest = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: null,
    firebaseUser: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    register: mockRegister,
    loginWithOAuth: mockLoginWithOAuth,
    loginAsGuest: mockLoginAsGuest,
    logout: vi.fn(),
    resetPassword: mockResetPassword,
  }),
}));

describe('AuthScreen Component Tests', () => {
  it('Renders the login view by default with brand title and email/password fields', () => {
    render(<AuthScreen />);

    expect(screen.getByText('Personal Gemini Journal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    const signInButtons = screen.getAllByRole('button', { name: /^Sign In$/i });
    expect(signInButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('Renders Google OAuth sign-in option', () => {
    render(<AuthScreen />);

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });
    expect(googleBtn).toBeInTheDocument();

    fireEvent.click(googleBtn);
    expect(mockLoginWithOAuth).toHaveBeenCalledWith('google');
  });

  it('Renders Forgot Password trigger and opens modal', () => {
    render(<AuthScreen />);

    const forgotBtn = screen.getByRole('button', { name: /Forgot\?/i });
    expect(forgotBtn).toBeInTheDocument();
    fireEvent.click(forgotBtn);

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
  });
});

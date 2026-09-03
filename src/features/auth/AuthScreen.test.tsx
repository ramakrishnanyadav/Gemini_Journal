import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AuthScreen } from './AuthScreen';

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginWithOAuth = vi.fn();
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
    expect(screen.getByRole('button', { name: /Sign In to Journal/i })).toBeInTheDocument();
  });

  it('Renders OAuth sign-in options for Google and GitHub', () => {
    render(<AuthScreen />);

    const googleBtn = screen.getByRole('button', { name: /Google/i });
    expect(googleBtn).toBeInTheDocument();

    const githubBtn = screen.getByRole('button', { name: /GitHub/i });
    expect(githubBtn).toBeInTheDocument();

    fireEvent.click(googleBtn);
    expect(mockLoginWithOAuth).toHaveBeenCalledWith('google');
  });

  it('Renders Forgot Password trigger and opens modal', () => {
    render(<AuthScreen />);

    const forgotBtn = screen.getByRole('button', { name: /Forgot password\?/i });
    expect(forgotBtn).toBeInTheDocument();
    fireEvent.click(forgotBtn);

    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
  });
});

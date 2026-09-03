import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { JournalHeader } from './JournalHeader';

const mockLogout = vi.fn();

vi.mock('../../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'user_123',
      displayName: 'Alex Owner',
      email: 'alex@example.com',
      avatar: '',
      createdAt: '2026-09-01T12:00:00.000Z',
    },
    logout: mockLogout,
  }),
}));

describe('JournalHeader Component', () => {
  it('Renders brand title, status badge, and navigation tabs', () => {
    const handleTabChange = vi.fn();
    const handleNewSession = vi.fn();

    render(
      <JournalHeader
        activeTab="chat"
        onTabChange={handleTabChange}
        onNewSession={handleNewSession}
        onOpenSecurity={vi.fn()}
        onOpenPrivacy={vi.fn()}
      />
    );

    expect(screen.getByText('Gemini Journal')).toBeInTheDocument();
    expect(screen.getByText('Firestore')).toBeInTheDocument();
    expect(screen.getByText('Alex Owner')).toBeInTheDocument();

    const newBtn = screen.getAllByRole('button', { name: /New Reflection/i })[0];
    fireEvent.click(newBtn);
    expect(handleNewSession).toHaveBeenCalledTimes(1);
  });

  it('Calls onTabChange when a navigation tab is clicked', () => {
    const handleTabChange = vi.fn();

    render(
      <JournalHeader
        activeTab="chat"
        onTabChange={handleTabChange}
        onNewSession={vi.fn()}
        onOpenSecurity={vi.fn()}
        onOpenPrivacy={vi.fn()}
      />
    );

    const timelineBtn = screen.getByRole('button', { name: /Timeline/i });
    fireEvent.click(timelineBtn);
    expect(handleTabChange).toHaveBeenCalledWith('sessions');
  });
});

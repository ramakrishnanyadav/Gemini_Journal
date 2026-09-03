import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionExplorer } from '../features/journal/SessionExplorer';
import { MemoryCompass } from '../features/journal/MemoryCompass';
import { MoodAnalytics } from '../features/journal/MoodAnalytics';
import { JournalHeader } from '../components/layout/JournalHeader';
import { JournalSession, MemoryItem, MoodAnalyticsData } from '../types/journal';

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'user_123',
      displayName: 'Alex Owner',
      email: 'alex@example.com',
      avatar: '',
      createdAt: '2026-09-01T12:00:00.000Z',
    },
    logout: vi.fn(),
  }),
}));

describe('SessionExplorer Component', () => {
  const mockSessions: JournalSession[] = [
    {
      id: 'session-1',
      userId: 'user-1',
      title: 'Architectural Decisions & Strategy',
      summary: 'Discussed decoupling frontend state and database isolation.',
      mood: 'focused',
      tags: ['architecture', 'strategy'],
      messages: [],
      createdAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-09-01T10:30:00Z').toISOString(),
    },
    {
      id: 'session-2',
      userId: 'user-1',
      title: 'Evening Gratitude & Decompression',
      summary: 'Acknowledged progress made across weekly engineering milestones.',
      mood: 'grateful',
      tags: ['mindfulness', 'gratitude'],
      messages: [],
      createdAt: new Date('2026-09-01T20:00:00Z').toISOString(),
      updatedAt: new Date('2026-09-01T20:30:00Z').toISOString(),
    },
  ];

  it('renders session titles and tags properly', () => {
    render(
      <SessionExplorer
        sessions={mockSessions}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    expect(screen.getByText('Architectural Decisions & Strategy')).toBeInTheDocument();
    expect(screen.getByText('Evening Gratitude & Decompression')).toBeInTheDocument();
    expect(screen.getByText('architecture')).toBeInTheDocument();
  });

  it('filters sessions by search term', () => {
    render(
      <SessionExplorer
        sessions={mockSessions}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search across all reflections/i);
    fireEvent.change(searchInput, { target: { value: 'Gratitude' } });

    expect(screen.queryByText('Architectural Decisions & Strategy')).not.toBeInTheDocument();
    expect(screen.getByText('Evening Gratitude & Decompression')).toBeInTheDocument();
  });

  it('invokes onSelectSession when clicking Open button', () => {
    const onSelect = vi.fn();
    render(
      <SessionExplorer
        sessions={mockSessions}
        onSelectSession={onSelect}
        onDeleteSession={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    const openButtons = screen.getAllByRole('button', { name: /open/i });
    fireEvent.click(openButtons[0]);
    expect(onSelect).toHaveBeenCalledWith(mockSessions[0]);
  });
});

describe('MemoryCompass Component', () => {
  const mockMemories: MemoryItem[] = [
    {
      id: 'mem-1',
      userId: 'user-1',
      category: 'breakthrough',
      content: 'Small, iterative steps reduce cognitive load significantly.',
      pinned: true,
      extractedAt: new Date().toISOString(),
    },
    {
      id: 'mem-2',
      userId: 'user-1',
      category: 'habit',
      content: 'Always maintain owner-bound isolation in API contracts.',
      pinned: false,
      extractedAt: new Date().toISOString(),
    },
  ];

  it('renders memory cards and category labels', () => {
    render(
      <MemoryCompass
        memories={mockMemories}
        onTogglePin={vi.fn()}
        onDeleteMemory={vi.fn()}
        onAddMemory={vi.fn()}
      />
    );

    expect(screen.getByText(/Small, iterative steps reduce cognitive load/i)).toBeInTheDocument();
    expect(screen.getByText(/Always maintain owner-bound isolation/i)).toBeInTheDocument();
  });

  it('toggles pin callback when pin button is clicked', () => {
    const onTogglePin = vi.fn();
    render(
      <MemoryCompass
        memories={mockMemories}
        onTogglePin={onTogglePin}
        onDeleteMemory={vi.fn()}
        onAddMemory={vi.fn()}
      />
    );

    const pinButton = screen.getByTitle(/Unpin from top/i);
    fireEvent.click(pinButton);
    expect(onTogglePin).toHaveBeenCalledWith('mem-1');
  });
});

describe('MoodAnalytics Component', () => {
  const mockAnalytics: MoodAnalyticsData = {
    streakDays: 7,
    totalSessions: 14,
    totalWordCount: 4250,
    dominantMood: 'reflective',
    weeklySynthesis: 'Your cognitive patterns show heightened clarity and sustained focus throughout the week.',
    moodDistribution: {
      calm: 4,
      reflective: 6,
      energized: 2,
      focused: 1,
      grateful: 1,
      creative: 0,
      anxious: 0,
    },
    recentCadence: [
      { date: '2026-09-01', dayName: 'Tue', count: 2, mood: 'reflective' },
    ],
  };

  it('renders key metrics and Gemini synthesis summary', () => {
    render(<MoodAnalytics analytics={mockAnalytics} />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('4,250')).toBeInTheDocument();
    expect(screen.getByText(/Your cognitive patterns show heightened clarity/i)).toBeInTheDocument();
  });
});

describe('JournalHeader Component', () => {
  it('renders brand wordmark, Firestore pill, and streak chip', () => {
    render(
      <JournalHeader
        activeTab="chat"
        onTabChange={vi.fn()}
        onNewSession={vi.fn()}
        onOpenSecurity={vi.fn()}
        onOpenPrivacy={vi.fn()}
        streakCount={5}
      />
    );

    expect(screen.getByText('Gemini Journal')).toBeInTheDocument();
    expect(screen.getByText('Firestore')).toBeInTheDocument();
    expect(screen.getByText('5d streak')).toBeInTheDocument();
  });

  it('triggers onTabChange when navigation tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <JournalHeader
        activeTab="chat"
        onTabChange={onTabChange}
        onNewSession={vi.fn()}
        onOpenSecurity={vi.fn()}
        onOpenPrivacy={vi.fn()}
        streakCount={3}
      />
    );

    const timelineTab = screen.getByRole('button', { name: /timeline/i });
    fireEvent.click(timelineTab);
    expect(onTabChange).toHaveBeenCalledWith('sessions');
  });
});

export type MoodType = 'calm' | 'energized' | 'reflective' | 'anxious' | 'focused' | 'grateful' | 'creative';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface JournalMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
  reflections?: string[];
  sentiment?: MoodType;
  modelUsed?: string;
}

export interface JournalSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mood: MoodType;
  messages: JournalMessage[];
  summary?: string;
  insights?: string[];
  tags?: string[];
  audioDurationSec?: number;
}

export type MemoryCategory = 'breakthrough' | 'habit' | 'gratitude' | 'goal' | 'reflection';

export interface MemoryItem {
  id: string;
  userId: string;
  content: string;
  category: MemoryCategory;
  extractedAt: string;
  sessionId?: string;
  pinned: boolean;
  sourceQuote?: string;
}

export interface MoodAnalyticsData {
  totalSessions: number;
  streakDays: number;
  dominantMood: MoodType;
  moodDistribution: Record<MoodType, number>;
  totalWordCount: number;
  weeklySynthesis: string;
  recentCadence: {
    date: string;
    dayName: string;
    count: number;
    mood: MoodType;
  }[];
}

export interface SecurityTestResult {
  state: 'unauthenticated' | 'wrong_owner' | 'owner' | 'invalid_token';
  title: string;
  requestPath: string;
  httpStatus: number;
  expectedStatus: number;
  verdict: 'PASSED' | 'FAILED';
  responsePayload: any;
  securityExplanation: string;
}

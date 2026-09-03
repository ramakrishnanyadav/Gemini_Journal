import { UserProfile, JournalSession, MemoryItem, MoodAnalyticsData } from '../types/journal';
import { getAppCheckToken, auth } from '../lib/firebase';

class ApiService {
  private token: string | null = null;
  private appCheckToken: string | null = null;

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setAppCheckToken(token: string | null) {
    this.appCheckToken = token;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let token = this.token;
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken(/* forceRefresh */ false);
        this.token = token;
      } catch (err) {
        console.warn('[ApiService] Failed to refresh Firebase ID token:', err);
      }
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const appCheckToken = this.appCheckToken || (await getAppCheckToken());
    if (appCheckToken) {
      headers['X-Firebase-AppCheck'] = appCheckToken;
    }
    return headers;
  }

  // --- PROFILE SYNC ---
  public async syncProfile(uid: string, profile: { displayName?: string; email?: string; avatar?: string }): Promise<UserProfile> {
    const res = await fetch(`/api/users/${uid}/sync-profile`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync profile');
    }
    const data = await res.json();
    return data.profile;
  }

  public async getProfile(uid: string): Promise<UserProfile> {
    const res = await fetch(`/api/users/${uid}/profile`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user profile');
    }
    const data = await res.json();
    return data.user;
  }

  // --- SESSIONS ---
  public async getSessions(uid: string): Promise<JournalSession[]> {
    const res = await fetch(`/api/users/${uid}/sessions`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch sessions');
    }
    const data = await res.json();
    return data.sessions || [];
  }

  public async createSession(uid: string, payload: { title?: string; mood?: string; initialText?: string }): Promise<JournalSession> {
    const res = await fetch(`/api/users/${uid}/sessions`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create session');
    }
    const data = await res.json();
    return data.session;
  }

  public async sendReflectionMessage(
    uid: string,
    sessionId: string,
    prompt: string
  ): Promise<{ geminiResponse: any; insightsExtracted: string[]; sentiment?: string; summary?: string }> {
    const requestId = 'req-' + crypto.randomUUID();
    const res = await fetch(`/api/users/${uid}/sessions/${sessionId}/reflect`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ prompt, requestId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get reflection');
    }
    return res.json();
  }

  public async streamReflectionMessage(
    uid: string,
    sessionId: string,
    prompt: string,
    onToken: (token: string) => void
  ): Promise<{ geminiResponse: any; insightsExtracted: string[]; sentiment?: string; summary?: string }> {
    const requestId = 'req-' + crypto.randomUUID();
    const res = await fetch(`/api/users/${uid}/sessions/${sessionId}/reflect/stream`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ prompt, requestId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to stream reflection');
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return this.sendReflectionMessage(uid, sessionId, prompt);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let completedResult: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim() || block.includes('[DONE]')) continue;
        const dataPrefix = 'data: ';
        const jsonStr = block.startsWith(dataPrefix) ? block.slice(dataPrefix.length) : block;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'token' && parsed.content) {
            onToken(parsed.content);
          } else if (parsed.type === 'complete') {
            completedResult = parsed;
          } else if (parsed.type === 'error') {
            throw new Error(parsed.error || 'Stream error occurred');
          }
        } catch (e: any) {
          if (e?.message && e.message.includes('Stream error')) throw e;
        }
      }
    }

    if (!completedResult) {
      return this.sendReflectionMessage(uid, sessionId, prompt);
    }

    return completedResult;
  }

  public async updateSession(uid: string, sessionId: string, payload: Partial<JournalSession>): Promise<JournalSession> {
    const res = await fetch(`/api/users/${uid}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update session');
    }
    const data = await res.json();
    return data.session;
  }

  public async deleteSession(uid: string, sessionId: string): Promise<void> {
    const res = await fetch(`/api/users/${uid}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete session');
    }
  }

  // --- MEMORIES ---
  public async getMemories(uid: string): Promise<MemoryItem[]> {
    const res = await fetch(`/api/users/${uid}/memories`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch memories');
    }
    const data = await res.json();
    return data.memories || [];
  }

  public async createMemory(uid: string, payload: { content: string; category?: string; sourceQuote?: string }): Promise<MemoryItem> {
    const res = await fetch(`/api/users/${uid}/memories`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create memory');
    }
    const data = await res.json();
    return data.memory;
  }

  public async togglePinMemory(uid: string, memoryId: string): Promise<MemoryItem> {
    const res = await fetch(`/api/users/${uid}/memories/${memoryId}/pin`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update memory pin');
    }
    const data = await res.json();
    return data.memory;
  }

  public async deleteMemory(uid: string, memoryId: string): Promise<void> {
    const res = await fetch(`/api/users/${uid}/memories/${memoryId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete memory');
    }
  }

  // --- ANALYTICS ---
  public async getAnalytics(uid: string): Promise<MoodAnalyticsData> {
    const res = await fetch(`/api/users/${uid}/analytics`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch analytics');
    }
    const data = await res.json();
    return data.analytics;
  }

  // --- EXPORT & WIPE ---
  public async exportData(uid: string) {
    const res = await fetch(`/api/users/${uid}/export`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export data');
    }
    return res.json();
  }

  public async wipeData(uid: string) {
    const res = await fetch(`/api/users/${uid}/wipe`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to wipe data');
    }
    return res.json();
  }

  // --- SECURITY BOUNDARY LIVE TEST ---
  public async testOwnerBoundary(testState: 'unauthenticated' | 'wrong_owner' | 'owner' | 'invalid_token', targetUid: string, realToken?: string): Promise<any> {
    const res = await fetch('/api/security/test-owner-boundary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testState, targetUid, realToken: realToken || this.token }),
    });
    return res.json();
  }
}

export const apiService = new ApiService();

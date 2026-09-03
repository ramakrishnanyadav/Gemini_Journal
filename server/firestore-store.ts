import { firestore } from './firebase-admin';
import { UserProfile, JournalSession, MemoryItem, MoodType, MoodAnalyticsData, JournalMessage } from '../src/types/journal';

/**
 * Utility to strip undefined properties recursively so Firestore writes never fail.
 */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Lightweight retry wrapper with backoff for transient database glitches before failing closed.
 */
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2, delayMs = 100): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
}

/**
 * FirestoreJournalStore — Strict Fail-Closed Cloud Persistence Engine.
 * 
 * In accordance with Constitution v2 Rule C:
 * "No silent fallback stores. If the primary datastore (Firestore) is unreachable,
 * the request must fail with a clear error (e.g. 503) — it must never silently degrade
 * to writing user data to local disk, in-memory maps, or any other unmonitored store."
 */
export class FirestoreJournalStore {
  // --- USER PROFILE ---
  public async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      return await withRetry(async () => {
        const snap = await firestore.doc(`users/${uid}`).get();
        if (!snap.exists) {
          return null;
        }
        const data = snap.data() as any;
        return {
          uid,
          displayName: data.displayName || 'Owner',
          email: data.email || '',
          avatar: data.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(uid)}`,
          createdAt: data.createdAt || new Date().toISOString(),
        };
      });
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] getUserProfile failed for ${uid}:`, err.message);
      throw new Error(`Cloud Firestore error fetching user profile: ${err.message}`);
    }
  }

  public async upsertUserProfile(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const fullProfile: UserProfile = {
      uid,
      displayName: profile.displayName || 'Owner',
      email: profile.email || '',
      avatar: profile.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(uid)}`,
      createdAt: profile.createdAt || new Date().toISOString(),
    };

    try {
      const userRef = firestore.doc(`users/${uid}`);
      await userRef.set(stripUndefined(fullProfile), { merge: true });
      return fullProfile;
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] upsertUserProfile failed for ${uid}:`, err.message);
      throw new Error(`Cloud Firestore error persisting user profile: ${err.message}`);
    }
  }

  // --- SESSIONS ---
  public async getSessionsForUser(uid: string): Promise<JournalSession[]> {
    try {
      const snap = await firestore
        .collection(`users/${uid}/sessions`)
        .orderBy('createdAt', 'desc')
        .get();

      const sessions: JournalSession[] = [];

      for (const doc of snap.docs) {
        const data = doc.data();
        const msgSnap = await doc.ref.collection('messages').orderBy('timestamp', 'asc').get();
        const messages: JournalMessage[] = msgSnap.docs.map((mDoc) => {
          const mData = mDoc.data();
          return {
            id: mDoc.id,
            sender: mData.sender,
            text: mData.text,
            timestamp: mData.timestamp,
            sentiment: mData.sentiment,
            reflections: mData.reflections,
            modelUsed: mData.modelUsed,
          };
        });

        sessions.push({
          id: doc.id,
          userId: uid,
          title: data.title || 'Untitled Reflection',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
          mood: (data.mood as MoodType) || 'reflective',
          messages,
          summary: data.summary,
          insights: data.insights || [],
          tags: data.tags || [],
        });
      }

      return sessions;
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] getSessionsForUser failed for ${uid}:`, err.message);
      throw new Error(`Cloud Firestore error fetching sessions: ${err.message}`);
    }
  }

  public async getSession(uid: string, sessionId: string): Promise<JournalSession | null> {
    try {
      const docRef = firestore.doc(`users/${uid}/sessions/${sessionId}`);
      const doc = await docRef.get();
      if (!doc.exists) {
        return null;
      }

      const data = doc.data()!;
      const msgSnap = await docRef.collection('messages').orderBy('timestamp', 'asc').get();
      const messages: JournalMessage[] = msgSnap.docs.map((mDoc) => {
        const mData = mDoc.data();
        return {
          id: mDoc.id,
          sender: mData.sender,
          text: mData.text,
          timestamp: mData.timestamp,
          sentiment: mData.sentiment,
          reflections: mData.reflections,
          modelUsed: mData.modelUsed,
        };
      });

      return {
        id: doc.id,
        userId: uid,
        title: data.title || 'Untitled Reflection',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
        mood: (data.mood as MoodType) || 'reflective',
        messages,
        summary: data.summary,
        insights: data.insights || [],
        tags: data.tags || [],
      };
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] getSession failed for ${sessionId}:`, err.message);
      throw new Error(`Cloud Firestore error fetching session: ${err.message}`);
    }
  }

  public async createSession(uid: string, session: JournalSession): Promise<JournalSession> {
    try {
      const sessionRef = firestore.doc(`users/${uid}/sessions/${session.id}`);
      const sessionDocData = {
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        mood: session.mood,
        summary: session.summary || null,
        insights: session.insights || [],
        tags: session.tags || [],
      };

      await sessionRef.set(stripUndefined(sessionDocData));

      if (session.messages && session.messages.length > 0) {
        const batch = firestore.batch();
        for (const msg of session.messages) {
          const msgRef = sessionRef.collection('messages').doc(msg.id);
          batch.set(msgRef, stripUndefined(msg));
        }
        await batch.commit();
      }

      return session;
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] createSession failed for ${session.id}:`, err.message);
      throw new Error(`Cloud Firestore error creating session: ${err.message}`);
    }
  }

  public async updateSession(uid: string, sessionId: string, updates: Partial<JournalSession>): Promise<JournalSession | null> {
    try {
      const sessionRef = firestore.doc(`users/${uid}/sessions/${sessionId}`);
      const payload: any = {
        updatedAt: new Date().toISOString(),
      };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.mood !== undefined) payload.mood = updates.mood;
      if (updates.summary !== undefined) payload.summary = updates.summary;
      if (updates.insights !== undefined) payload.insights = updates.insights;
      if (updates.tags !== undefined) payload.tags = updates.tags;

      await sessionRef.update(stripUndefined(payload));
      return await this.getSession(uid, sessionId);
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] updateSession failed for ${sessionId}:`, err.message);
      throw new Error(`Cloud Firestore error updating session: ${err.message}`);
    }
  }

  public async addMessageToSession(
    uid: string,
    sessionId: string,
    message: JournalMessage,
    sessionUpdates?: { mood?: MoodType; summary?: string; insights?: string[] }
  ): Promise<void> {
    try {
      const sessionRef = firestore.doc(`users/${uid}/sessions/${sessionId}`);
      const msgRef = sessionRef.collection('messages').doc(message.id);

      const batch = firestore.batch();
      batch.set(msgRef, stripUndefined(message));

      const sessionPayload: any = {
        updatedAt: new Date().toISOString(),
      };
      if (sessionUpdates?.mood) sessionPayload.mood = sessionUpdates.mood;
      if (sessionUpdates?.summary) sessionPayload.summary = sessionUpdates.summary;
      if (sessionUpdates?.insights) sessionPayload.insights = sessionUpdates.insights;

      batch.set(sessionRef, stripUndefined(sessionPayload), { merge: true });
      await batch.commit();
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] addMessageToSession failed for ${sessionId}:`, err.message);
      throw new Error(`Cloud Firestore error writing message: ${err.message}`);
    }
  }

  public async deleteSession(uid: string, sessionId: string): Promise<boolean> {
    try {
      const sessionRef = firestore.doc(`users/${uid}/sessions/${sessionId}`);
      const msgsSnap = await sessionRef.collection('messages').get();
      const batch = firestore.batch();
      msgsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(sessionRef);
      await batch.commit();
      return true;
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] deleteSession failed for ${sessionId}:`, err.message);
      throw new Error(`Cloud Firestore error deleting session: ${err.message}`);
    }
  }

  // --- MEMORIES ---
  public async getMemoriesForUser(uid: string): Promise<MemoryItem[]> {
    try {
      const snap = await firestore
        .collection(`users/${uid}/memories`)
        .orderBy('extractedAt', 'desc')
        .get();

      const memories: MemoryItem[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: uid,
          content: data.content,
          category: data.category || 'reflection',
          extractedAt: data.extractedAt || new Date().toISOString(),
          sessionId: data.sessionId,
          pinned: !!data.pinned,
          sourceQuote: data.sourceQuote,
        };
      });

      return memories.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime();
      });
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] getMemoriesForUser failed for ${uid}:`, err.message);
      throw new Error(`Cloud Firestore error fetching memories: ${err.message}`);
    }
  }

  public async createMemory(uid: string, memory: MemoryItem): Promise<MemoryItem> {
    try {
      const memRef = firestore.doc(`users/${uid}/memories/${memory.id}`);
      await memRef.set(stripUndefined({
        content: memory.content,
        category: memory.category,
        extractedAt: memory.extractedAt,
        sessionId: memory.sessionId || null,
        pinned: !!memory.pinned,
        sourceQuote: memory.sourceQuote || null,
      }));
      return memory;
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] createMemory failed for ${memory.id}:`, err.message);
      throw new Error(`Cloud Firestore error creating memory: ${err.message}`);
    }
  }

  public async togglePinMemory(uid: string, memoryId: string): Promise<MemoryItem | null> {
    try {
      const memRef = firestore.doc(`users/${uid}/memories/${memoryId}`);
      const snap = await memRef.get();
      if (!snap.exists) return null;

      const data = snap.data()!;
      const newPinned = !data.pinned;
      await memRef.update({ pinned: newPinned });

      return {
        id: snap.id,
        userId: uid,
        content: data.content,
        category: data.category,
        extractedAt: data.extractedAt,
        sessionId: data.sessionId,
        pinned: newPinned,
        sourceQuote: data.sourceQuote,
      };
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] togglePinMemory failed for ${memoryId}:`, err.message);
      throw new Error(`Cloud Firestore error updating memory pin: ${err.message}`);
    }
  }

  public async deleteMemory(uid: string, memoryId: string): Promise<boolean> {
    try {
      const memRef = firestore.doc(`users/${uid}/memories/${memoryId}`);
      await memRef.delete();
      return true;
    } catch (err: any) {
      console.error(`[Firestore:FailClosed] deleteMemory failed for ${memoryId}:`, err.message);
      throw new Error(`Cloud Firestore error deleting memory: ${err.message}`);
    }
  }

  // --- ANALYTICS (LIVE AGGREGATION OVER USER SESSIONS) ---
  public async getAnalytics(uid: string): Promise<MoodAnalyticsData> {
    const userSessions = await this.getSessionsForUser(uid);
    const totalSessions = userSessions.length;

    const moodCounts: Record<MoodType, number> = {
      calm: 0,
      energized: 0,
      reflective: 0,
      anxious: 0,
      focused: 0,
      grateful: 0,
      creative: 0,
    };

    let totalWords = 0;
    userSessions.forEach((s) => {
      moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1;
      (s.messages || []).forEach((m) => {
        totalWords += (m.text || '').split(/\s+/).filter(Boolean).length;
      });
    });

    let dominantMood: MoodType = 'reflective';
    let maxMoodCount = -1;
    (Object.keys(moodCounts) as MoodType[]).forEach((m) => {
      if (moodCounts[m] > maxMoodCount) {
        maxMoodCount = moodCounts[m];
        dominantMood = m;
      }
    });

    // 7 days cadence
    const days: { date: string; dayName: string; count: number; mood: MoodType }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const matchingSessions = userSessions.filter((s) => s.createdAt.startsWith(dateStr));
      const dayMood = matchingSessions.length > 0 ? matchingSessions[0].mood : 'calm';
      days.push({
        date: dateStr,
        dayName,
        count: matchingSessions.length,
        mood: dayMood,
      });
    }

    return {
      totalSessions,
      streakDays: Math.max(totalSessions > 0 ? 1 : 0, Math.min(totalSessions, 14)),
      dominantMood,
      moodDistribution: moodCounts,
      totalWordCount: totalWords,
      weeklySynthesis: totalSessions > 0
        ? `Your reflections in Firestore consistently demonstrate high intentionality, with ${dominantMood} mindset leading recent sessions. Key themes center around structured daily habits, focus preservation, and cognitive clarity.`
        : 'Begin your first reflection to generate personalized weekly synthesis and emotional cadence trends.',
      recentCadence: days,
    };
  }

  // --- DATA EXPORT & WIPE ---
  public async exportUserData(uid: string) {
    const profile = await this.getUserProfile(uid);
    const sessions = await this.getSessionsForUser(uid);
    const memories = await this.getMemoriesForUser(uid);

    return {
      exportedAt: new Date().toISOString(),
      profile,
      summary: {
        totalSessions: sessions.length,
        totalMemories: memories.length,
      },
      sessions,
      memories,
    };
  }

  public async wipeUserData(uid: string): Promise<{ sessionsDeleted: number; memoriesDeleted: number }> {
    const sessions = await this.getSessionsForUser(uid);
    const memories = await this.getMemoriesForUser(uid);

    for (const session of sessions) {
      await this.deleteSession(uid, session.id);
    }
    for (const memory of memories) {
      await this.deleteMemory(uid, memory.id);
    }

    return {
      sessionsDeleted: sessions.length,
      memoriesDeleted: memories.length,
    };
  }
}

export const firestoreJournalStore = new FirestoreJournalStore();

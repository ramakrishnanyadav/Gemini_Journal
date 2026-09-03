import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirestoreJournalStore } from './firestore-store';
import { firestore } from './firebase-admin';

vi.mock('./firebase-admin', () => ({
  firestore: {
    doc: vi.fn(),
    collection: vi.fn(),
  },
}));

describe('FirestoreJournalStore Fail-Closed Database Outage Tests', () => {
  let store: FirestoreJournalStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new FirestoreJournalStore();
  });

  it('getUserProfile throws a fail-closed error when Firestore throws an error', async () => {
    (firestore.doc as any).mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error('Firestore connection timed out')),
    });

    await expect(store.getUserProfile('user-123')).rejects.toThrow('Cloud Firestore error fetching user profile');
  });

  it('getSessionsForUser throws a fail-closed error when Firestore collection fails', async () => {
    (firestore.collection as any).mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('503 Service Unavailable')),
      }),
    });

    await expect(store.getSessionsForUser('user-123')).rejects.toThrow('Cloud Firestore error fetching sessions');
  });

  it('createSession throws a fail-closed error when write fails', async () => {
    (firestore.doc as any).mockReturnValue({
      set: vi.fn().mockRejectedValue(new Error('Quota exceeded / Unavailable')),
    });

    const mockSession: any = {
      id: 'ses-123',
      userId: 'user-123',
      title: 'Test Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mood: 'reflective',
      messages: [],
    };

    await expect(store.createSession('user-123', mockSession)).rejects.toThrow('Cloud Firestore error creating session');
  });
});

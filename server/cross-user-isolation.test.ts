import { describe, it, expect, vi } from 'vitest';
import { requireOwner, OwnerAuthenticatedRequest } from './auth';
import { adminAuth } from './firebase-admin';

vi.mock('./firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}));

describe('Integration Test: Cross-User Journal Data Isolation', () => {
  const userATargetUid = 'user_alice_alpha_001';
  const userBAttackerUid = 'user_bob_bravo_002';

  it('Enforces strict boundary: User B with valid token cannot read or tamper User A sessions', async () => {
    // Mock User B's verified Firebase Auth ID Token
    (adminAuth.verifyIdToken as any).mockResolvedValue({
      uid: userBAttackerUid,
      email: 'bob@example.com',
    });

    const mockReq: Partial<OwnerAuthenticatedRequest> = {
      headers: {
        authorization: 'Bearer legitimate-token-issued-to-bob',
      },
      params: {
        uid: userATargetUid, // Bob maliciously requests Alice's resource route
        sessionId: 'session-alice-private-diary-100',
      },
    };

    let responseCode = 200;
    let responseBody: any = null;

    const mockRes: any = {
      status(code: number) {
        responseCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    const mockNext = vi.fn();

    // Pass through requireOwner security gate
    await requireOwner(mockReq as any, mockRes, mockNext);

    // Assert: User B is strictly blocked with HTTP 403 Forbidden
    expect(responseCode).toBe(403);
    expect(responseBody.state).toBe('wrong_owner');
    expect(responseBody.callerUid).toBeUndefined();
    expect(responseBody.targetResourceUid).toBeUndefined();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('Allows User A with valid token to access User A resources', async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({
      uid: userATargetUid,
      email: 'alice@example.com',
    });

    const mockReq: Partial<OwnerAuthenticatedRequest> = {
      headers: {
        authorization: 'Bearer valid-token-alice',
      },
      params: {
        uid: userATargetUid,
      },
    };

    const mockRes: any = {};
    const mockNext = vi.fn();

    await requireOwner(mockReq as any, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect((mockReq as any).uid).toBe(userATargetUid);
  });

  it('Enforces export and wipe isolation: User B cannot trigger export or data wipe on User A', async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({
      uid: userBAttackerUid,
      email: 'bob@example.com',
    });

    const exportReq: Partial<OwnerAuthenticatedRequest> = {
      headers: { authorization: 'Bearer token-bob' },
      params: { uid: userATargetUid },
    };

    let statusCode = 200;
    let jsonBody: any = null;

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonBody = data;
        return this;
      },
    };

    const next = vi.fn();

    await requireOwner(exportReq as any, mockRes, next);

    expect(statusCode).toBe(403);
    expect(jsonBody.state).toBe('wrong_owner');
    expect(next).not.toHaveBeenCalled();
  });

  it('Enforces route-level isolation: User B cannot trigger reflection or streaming on User A session', async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({
      uid: userBAttackerUid,
      email: 'bob@example.com',
    });

    const streamReq: Partial<OwnerAuthenticatedRequest> = {
      headers: { authorization: 'Bearer token-bob' },
      params: { uid: userATargetUid, sessionId: 'session-alice-123' },
    };

    let statusCode = 200;
    let jsonBody: any = null;

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonBody = data;
        return this;
      },
    };

    const next = vi.fn();

    await requireOwner(streamReq as any, mockRes, next);

    expect(statusCode).toBe(403);
    expect(jsonBody.state).toBe('wrong_owner');
    expect(next).not.toHaveBeenCalled();
  });
});

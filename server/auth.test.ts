import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireOwner, OwnerAuthenticatedRequest } from './auth';
import { adminAuth, adminAppCheck } from './firebase-admin';

vi.mock('./firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminAppCheck: {
    verifyToken: vi.fn(),
  },
}));

describe('requireOwner Authentication & Authorization Middleware', () => {
  let req: Partial<OwnerAuthenticatedRequest>;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENFORCE_APP_CHECK;
    req = {
      headers: {},
      params: { uid: 'target-user-123' },
    };
    res = {
      statusCode: 200,
      jsonPayload: null as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.jsonPayload = payload;
        return this;
      },
    };
    next = vi.fn();
  });

  it('STATE 1: Returns 401 unauthenticated when Authorization header is missing', async () => {
    req.headers = {};
    await requireOwner(req as any, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonPayload.state).toBe('unauthenticated');
    expect(next).not.toHaveBeenCalled();
  });

  it('STATE 1: Returns 401 unauthenticated when Authorization header does not start with Bearer', async () => {
    req.headers = { authorization: 'Basic dXNlcjpwYXNz' };
    await requireOwner(req as any, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonPayload.state).toBe('unauthenticated');
    expect(next).not.toHaveBeenCalled();
  });

  it('STATE 2: Returns 401 invalid_token / token_expired when Firebase token verification fails', async () => {
    req.headers = { authorization: 'Bearer forged-or-expired-token' };
    (adminAuth.verifyIdToken as any).mockRejectedValueOnce({
      code: 'auth/id-token-expired',
      message: 'Firebase ID token has expired.',
    });

    await requireOwner(req as any, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonPayload.state).toBe('token_expired');
    expect(next).not.toHaveBeenCalled();
  });

  it('STATE 3: Returns 403 wrong_owner when token UID does not match requested resource path UID', async () => {
    req.headers = { authorization: 'Bearer valid-token-user-456' };
    req.params = { uid: 'target-user-123' };
    (adminAuth.verifyIdToken as any).mockResolvedValueOnce({
      uid: 'user-456',
      email: 'attacker@example.com',
    });

    await requireOwner(req as any, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonPayload.state).toBe('wrong_owner');
    expect(res.jsonPayload.callerUid).toBeUndefined();
    expect(res.jsonPayload.targetResourceUid).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('STATE 4: Calls next() and attaches verified uid when token UID matches requested path UID', async () => {
    req.headers = { authorization: 'Bearer valid-token-user-123' };
    req.params = { uid: 'target-user-123' };
    (adminAuth.verifyIdToken as any).mockResolvedValueOnce({
      uid: 'target-user-123',
      email: 'owner@example.com',
    });

    await requireOwner(req as any, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.uid).toBe('target-user-123');
    expect(req.tokenUser?.email).toBe('owner@example.com');
  });

  it('App Check: Rejects with 401 when App Check token is invalid', async () => {
    req.headers = {
      authorization: 'Bearer valid-token-user-123',
      'x-firebase-appcheck': 'invalid-app-check-token',
    };
    (adminAppCheck.verifyToken as any).mockRejectedValueOnce({
      code: 'appcheck/invalid-token',
      message: 'App Check token is invalid',
    });

    await requireOwner(req as any, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonPayload.state).toBe('app_check_invalid');
    expect(next).not.toHaveBeenCalled();
  });

  it('App Check: Attaches appCheck claims when valid App Check token is provided', async () => {
    req.headers = {
      authorization: 'Bearer valid-token-user-123',
      'x-firebase-appcheck': 'valid-app-check-token',
    };
    (adminAppCheck.verifyToken as any).mockResolvedValueOnce({
      appId: '1:123456789:web:abcdef',
      token: 'valid-app-check-token',
      alreadyConsumed: false,
    });
    (adminAuth.verifyIdToken as any).mockResolvedValueOnce({
      uid: 'target-user-123',
      email: 'owner@example.com',
    });

    await requireOwner(req as any, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.appCheck?.appId).toBe('1:123456789:web:abcdef');
  });
});

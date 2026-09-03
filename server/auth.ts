import { Request, Response, NextFunction } from 'express';
import { adminAuth, adminAppCheck } from './firebase-admin';

export interface OwnerAuthenticatedRequest extends Request {
  uid?: string;
  tokenUser?: {
    uid: string;
    email?: string;
  };
  appCheck?: {
    appId?: string;
    token?: any;
    alreadyConsumed?: boolean;
  };
}

/**
 * verifyAppCheckToken — Middleware enforcing Firebase App Check token verification.
 * 
 * In accordance with Constitution v2 Rule B:
 * "App Check is mandatory, not aspirational. If the constitution claims App Check
 * verification, the code must actually call appCheck().verifyToken() on protected routes."
 */
export async function verifyAppCheck(req: OwnerAuthenticatedRequest, res: Response, next: NextFunction) {
  const appCheckToken = (req.headers['x-firebase-appcheck'] as string) || '';
  const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true' || process.env.NODE_ENV === 'production';

  if (!appCheckToken) {
    if (enforceAppCheck) {
      return res.status(401).json({
        error: 'Unauthorized: Missing Firebase App Check token header (X-Firebase-AppCheck).',
        state: 'app_check_missing',
      });
    }
    // If not strictly enforced in non-production, proceed
    return next();
  }

  try {
    const appCheckClaims = await adminAppCheck.verifyToken(appCheckToken);
    req.appCheck = {
      appId: appCheckClaims.appId,
      token: appCheckClaims.token,
      alreadyConsumed: appCheckClaims.alreadyConsumed,
    };
    return next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Unauthorized: Firebase App Check token validation failed.',
      state: 'app_check_invalid',
      code: err.code || 'appcheck/invalid-token',
    });
  }
}

/**
 * requireOwner — Pure Owner-Bound Authorization Layer backed by Real Firebase ID Token Verification.
 * 
 * Cryptographically verifies that the request carries a valid Firebase Auth ID token signed by Google,
 * and enforces that the authenticated user's UID matches the requested /users/:uid resource path.
 * 
 * Behavior Matrix:
 * - Unauthenticated (No Bearer token) -> 401 Unauthorized (`state: 'unauthenticated'`)
 * - Token expired / Invalid cryptographic signature / Forged -> 401 Unauthorized (`state: 'invalid_token'`)
 * - Authenticated, wrong owner (decodedToken.uid !== req.params.uid) -> 403 Forbidden (`state: 'wrong_owner'`)
 * - Authenticated, owner (decodedToken.uid === req.params.uid) -> 200 OK, proceed to controller
 */
export async function requireOwner(req: OwnerAuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. App Check verification gate via verifyAppCheck helper
  let appCheckPassed = false;
  await verifyAppCheck(req, res, () => {
    appCheckPassed = true;
  });

  if (!appCheckPassed || res.headersSent) {
    return;
  }

  // 2. Firebase Auth ID Token verification gate
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed authorization Bearer token',
      state: 'unauthenticated',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Empty token provided',
      state: 'unauthenticated',
    });
  }

  let decodedToken;
  try {
    // REAL cryptographic signature and expiry verification via Firebase Admin SDK
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (err: any) {
    const isExpired = err.code === 'auth/id-token-expired' || err.message?.includes('expired');
    return res.status(401).json({
      error: isExpired
        ? 'Unauthorized: Authentication token has expired. Please sign in again.'
        : 'Unauthorized: Cryptographic verification of Firebase ID token failed.',
      state: isExpired ? 'token_expired' : 'invalid_token',
      code: err.code || 'auth/invalid-token',
    });
  }

  const callerUid = decodedToken.uid;
  if (!callerUid) {
    return res.status(401).json({
      error: 'Unauthorized: Failed to extract caller UID from verified token',
      state: 'invalid_token',
    });
  }

  const requestedPathUid = req.params.uid;

  // STRICT OWNER CHECK: decodedToken.uid === the uid segment of the requested resource path
  if (requestedPathUid && callerUid !== requestedPathUid) {
    return res.status(403).json({
      error: 'Forbidden: Access denied. You can only view and modify your own private journal records.',
      state: 'wrong_owner',
      securityRule: 'decodedToken.uid === req.params.uid',
    });
  }

  req.uid = callerUid;
  req.tokenUser = {
    uid: callerUid,
    email: decodedToken.email,
  };
  next();
}


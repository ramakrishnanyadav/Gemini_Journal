import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { firestoreJournalStore } from './server/firestore-store';
import { requireOwner, OwnerAuthenticatedRequest } from './server/auth';
import { generateReflectionWithFallback, streamReflectionWithFallback, MAX_PROMPT_CHARS } from './server/gemini';
import { UserProfile, JournalSession, MemoryItem, MoodType, JournalMessage, MemoryCategory } from './src/types/journal';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Headers (Helmet with CSP disabled for Vite React SPA static asset compatibility)
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS Origin Allowlist Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3005'];

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.includes('.onrender.com') ||
      origin.includes('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS request blocked by origin allowlist policy for origin: ${origin}`));
    }
  },
  credentials: true,
}));

/**
 * Single-Instance In-Memory Rate Limiter (Per UID).
 * 
 * NOTE ON SCALING (Constitution v2 Rule E):
 * This in-memory rate-limiter is strictly SINGLE-INSTANCE ONLY.
 * In a multi-instance containerized deployment (e.g., auto-scaled Cloud Run instances),
 * distributed rate limiting must be backed by Redis / Cloud Memorystore or Firestore transaction counters.
 */
const userRateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(uid: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = userRateLimits.get(uid);
  if (!entry || now > entry.resetAt) {
    userRateLimits.set(uid, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count += 1;
  return true;
}

/**
 * Single-Instance In-Memory Idempotency Cache.
 * Keyed by owner-bound composite key `${req.uid}:${req.params.sessionId}:${requestId}`.
 * 
 * NOTE ON SCALING (Constitution v2 Rule E):
 * This cache prevents duplicate in-flight requests on the same instance.
 * For global deduplication across multiple Cloud Run instances, use Firestore transaction idempotency records.
 */
const processedRequests = new Map<string, any>();

// MANDATORY: Top-level JSON body parser capped at 256kb to minimize attack surface
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (sanitized — zero PII or raw token logging per Constitution v2 Rule A)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      console.log(`[Journal API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Personal Gemini Journal API',
    version: 'v5.0-firestore-failclosed',
    dataStore: 'Google Cloud Firestore (Fail-Closed Persistence)',
    authLayer: 'Firebase Authentication (Cryptographically Verified ID Tokens)',
    securityConstitution: 'Constitution v2',
    appCheckSupported: true,
    securityRule: 'Owner-Bound Path Isolation (decodedToken.uid === req.params.uid)',
  });
});

/* =========================================================================
   1. USER PROFILE SYNC (/api/users/:uid/profile)
   ========================================================================= */

// Sync profile after Firebase Client sign-in / registration
app.post('/api/users/:uid/sync-profile', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  const { displayName, email, avatar } = req.body || {};
  try {
    const profile = await firestoreJournalStore.upsertUserProfile(req.params.uid, {
      displayName: displayName || req.tokenUser?.email?.split('@')[0] || 'Owner',
      email: email || req.tokenUser?.email || '',
      avatar: avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(req.params.uid)}`,
    });
    res.json({ profile, message: 'Profile synced with Cloud Firestore.' });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Service temporarily unavailable. Cloud Firestore is unreachable.' });
  }
});

// Get user profile
app.get('/api/users/:uid/profile', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const profile = await firestoreJournalStore.getUserProfile(req.params.uid);
    if (!profile) {
      const newProfile = await firestoreJournalStore.upsertUserProfile(req.params.uid, {
        displayName: req.tokenUser?.email?.split('@')[0] || 'Owner',
        email: req.tokenUser?.email || '',
      });
      return res.json({ user: newProfile });
    }
    res.json({ user: profile });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to fetch user profile. Cloud Firestore unavailable.' });
  }
});

/* =========================================================================
   2. OWNER-BOUND JOURNAL SESSIONS (/api/users/:uid/sessions)
   ========================================================================= */

// Get user's journal sessions from Firestore
app.get('/api/users/:uid/sessions', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const sessions = await firestoreJournalStore.getSessionsForUser(req.params.uid);
    res.json({
      sessions,
      total: sessions.length,
    });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to retrieve journal sessions. Cloud Firestore unavailable.' });
  }
});

// Create new journal session in Firestore
app.post('/api/users/:uid/sessions', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  const { title, mood = 'reflective', initialText } = req.body || {};
  
  if (title && (typeof title !== 'string' || title.length > 200)) {
    return res.status(400).json({ error: 'Title must be a string under 200 characters.' });
  }

  if (initialText && typeof initialText === 'string' && initialText.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: `Initial reflection text exceeds character cap of ${MAX_PROMPT_CHARS} characters.` });
  }

  const sessionId = 'ses-' + crypto.randomUUID();
  const now = new Date().toISOString();

  const newSession: JournalSession = {
    id: sessionId,
    userId: req.params.uid,
    title: title || `Reflection: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    createdAt: now,
    updatedAt: now,
    mood: (mood as MoodType) || 'reflective',
    messages: initialText
      ? [
          {
            id: 'msg-' + crypto.randomUUID(),
            sender: 'user',
            text: initialText,
            timestamp: now,
            sentiment: (mood as MoodType) || 'reflective',
          },
        ]
      : [],
    tags: [],
  };

  try {
    const created = await firestoreJournalStore.createSession(req.params.uid, newSession);
    res.status(201).json({ session: created });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to create session in Firestore. Database unavailable.' });
  }
});

// Get single session from Firestore
app.get('/api/users/:uid/sessions/:sessionId', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const session = await firestoreJournalStore.getSession(req.params.uid, req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Journal session not found.' });
    }
    res.json({ session });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to retrieve session from Firestore.' });
  }
});

// Update session in Firestore (Explicit field picking to prevent mass assignment)
app.patch('/api/users/:uid/sessions/:sessionId', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  const { title, mood } = req.body || {};
  const safeUpdates: Partial<JournalSession> = {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.length > 200) {
      return res.status(400).json({ error: 'Title must be a string under 200 characters.' });
    }
    safeUpdates.title = title.trim();
  }

  if (mood !== undefined) {
    const validMoods: MoodType[] = ['calm', 'energized', 'reflective', 'anxious', 'focused', 'grateful', 'creative'];
    if (!validMoods.includes(mood as MoodType)) {
      return res.status(400).json({ error: 'Invalid mood value.' });
    }
    safeUpdates.mood = mood as MoodType;
  }

  try {
    const updated = await firestoreJournalStore.updateSession(req.params.uid, req.params.sessionId, safeUpdates);
    if (!updated) {
      return res.status(404).json({ error: 'Journal session not found.' });
    }
    res.json({ session: updated });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to update session in Firestore.' });
  }
});

// Delete journal session and all subcollection messages from Firestore
app.delete('/api/users/:uid/sessions/:sessionId', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const success = await firestoreJournalStore.deleteSession(req.params.uid, req.params.sessionId);
    if (!success) {
      return res.status(404).json({ error: 'Journal session not found or already deleted.' });
    }
    res.json({ message: 'Session deleted from Firestore.' });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to delete session from Firestore.' });
  }
});

// Real-time SSE Token Streaming Reflection Endpoint (with owner-bound composite idempotency)
app.post('/api/users/:uid/sessions/:sessionId/reflect/stream', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  const { prompt, requestId } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required for reflection.' });
  }

  if (requestId !== undefined && (typeof requestId !== 'string' || requestId.length > 100)) {
    return res.status(400).json({ error: 'requestId must be a string under 100 characters.' });
  }

  // Explicit size cap enforcement (Constitution v2 Rule D)
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: `Prompt exceeds maximum allowed length of ${MAX_PROMPT_CHARS} characters.` });
  }

  if (!checkRateLimit(req.params.uid)) {
    return res.status(429).json({ error: 'Reflection request rate limit reached. Please wait a moment before sending another prompt.' });
  }

  // Owner-bound composite idempotency key (${uid}:${sessionId}:${requestId}) to prevent cross-user streaming duplication
  const idempotencyKey = requestId ? `${req.params.uid}:${req.params.sessionId}:${requestId}` : null;
  if (idempotencyKey && processedRequests.has(idempotencyKey)) {
    return res.json(processedRequests.get(idempotencyKey));
  }

  try {
    // Retrieve trusted conversation history from Firestore server-side (Fail-Closed on Firestore outage)
    let historyForAi: { sender: 'user' | 'gemini'; text: string }[] = [];
    try {
      const existingSession = await firestoreJournalStore.getSession(req.params.uid, req.params.sessionId);
      if (existingSession && Array.isArray(existingSession.messages)) {
        historyForAi = existingSession.messages
          .slice(-6)
          .map((m) => ({
            sender: m.sender === 'user' ? 'user' : 'gemini',
            text: String(m.text || '').slice(0, MAX_PROMPT_CHARS),
          }));
      }
    } catch (e: any) {
      console.error('[Streaming Reflection API Fail-Closed] Failed to fetch session history from Firestore:', e.message);
      return res.status(503).json({ error: 'Journal service temporarily unavailable. Failed to retrieve trusted session history.' });
    }

    // Prepare SSE Response Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream tokens as they arrive
    const aiResult = await streamReflectionWithFallback(prompt, historyForAi, (token) => {
      res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
    });

    const geminiMsgId = 'msg-' + crypto.randomUUID();
    const geminiMsg: JournalMessage = {
      id: geminiMsgId,
      sender: 'gemini',
      text: aiResult.text,
      timestamp: new Date().toISOString(),
      reflections: aiResult.reflections,
      sentiment: aiResult.sentiment,
      modelUsed: aiResult.modelUsed,
    };

    const completionPayload = {
      type: 'complete',
      geminiResponse: geminiMsg,
      insightsExtracted: aiResult.reflections,
      sentiment: aiResult.sentiment,
      summary: aiResult.summary,
    };

    if (idempotencyKey) {
      processedRequests.set(idempotencyKey, completionPayload);
      setTimeout(() => processedRequests.delete(idempotencyKey), 5 * 60 * 1000);
    }

    res.write(`data: ${JSON.stringify(completionPayload)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('[Streaming Reflection Error]:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Streaming reflection failed. Service temporarily unavailable.' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Service temporarily unavailable.' })}\n\n`);
      res.end();
    }
  }
});

// Send message & trigger Gemini reflection (with owner-bound composite requestId Idempotency)
app.post('/api/users/:uid/sessions/:sessionId/reflect', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  const { prompt, requestId } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required for reflection.' });
  }

  if (requestId !== undefined && (typeof requestId !== 'string' || requestId.length > 100)) {
    return res.status(400).json({ error: 'requestId must be a string under 100 characters.' });
  }

  // Explicit size cap enforcement (Constitution v2 Rule D)
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: `Prompt exceeds maximum allowed length of ${MAX_PROMPT_CHARS} characters.` });
  }

  if (!checkRateLimit(req.params.uid)) {
    return res.status(429).json({ error: 'Reflection request rate limit reached. Please wait a moment before sending another prompt.' });
  }

  // Owner-bound composite idempotency key (${uid}:${sessionId}:${requestId}) to prevent cross-user data leakage
  const idempotencyKey = requestId ? `${req.params.uid}:${req.params.sessionId}:${requestId}` : null;
  if (idempotencyKey && processedRequests.has(idempotencyKey)) {
    return res.json(processedRequests.get(idempotencyKey));
  }

  try {
    // Retrieve trusted conversation history from Firestore server-side (Fail-Closed on Firestore outage)
    let historyForAi: { sender: 'user' | 'gemini'; text: string }[] = [];
    try {
      const existingSession = await firestoreJournalStore.getSession(req.params.uid, req.params.sessionId);
      if (existingSession && Array.isArray(existingSession.messages)) {
        historyForAi = existingSession.messages
          .slice(-6)
          .map((m) => ({
            sender: m.sender === 'user' ? 'user' : 'gemini',
            text: String(m.text || '').slice(0, MAX_PROMPT_CHARS),
          }));
      }
    } catch (e: any) {
      console.error('[Reflection API Fail-Closed] Failed to fetch session history from Firestore:', e.message);
      return res.status(503).json({ error: 'Journal service temporarily unavailable. Failed to retrieve trusted session history.' });
    }

    const aiResult = await generateReflectionWithFallback(prompt, historyForAi);

    const geminiMsgId = 'msg-' + crypto.randomUUID();
    const geminiMsg: JournalMessage = {
      id: geminiMsgId,
      sender: 'gemini',
      text: aiResult.text,
      timestamp: new Date().toISOString(),
      reflections: aiResult.reflections,
      sentiment: aiResult.sentiment,
      modelUsed: aiResult.modelUsed,
    };

    const responsePayload = {
      geminiResponse: geminiMsg,
      insightsExtracted: aiResult.reflections,
      sentiment: aiResult.sentiment,
      summary: aiResult.summary,
    };

    if (idempotencyKey) {
      processedRequests.set(idempotencyKey, responsePayload);
      setTimeout(() => processedRequests.delete(idempotencyKey), 5 * 60 * 1000);
    }

    res.json(responsePayload);
  } catch (err: any) {
    console.error('[Reflection API Error]:', err.message);
    res.status(503).json({ error: 'Failed to process reflection with Gemini. Cloud backend error.' });
  }
});

/* =========================================================================
   3. OWNER-BOUND MEMORIES & COMPASS (/api/users/:uid/memories)
   ========================================================================= */

// Get user memories from Firestore
app.get('/api/users/:uid/memories', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const memories = await firestoreJournalStore.getMemoriesForUser(req.params.uid);
    res.json({ memories, count: memories.length });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to retrieve memories from Firestore.' });
  }
});

// Create memory in Firestore with schema validation
app.post('/api/users/:uid/memories', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  const { content, category = 'reflection', sourceQuote } = req.body || {};
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Memory content is required and must be a non-empty string.' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Memory content exceeds maximum limit of 2000 characters.' });
  }
  if (sourceQuote && (typeof sourceQuote !== 'string' || sourceQuote.length > 1000)) {
    return res.status(400).json({ error: 'Source quote must be a string under 1000 characters.' });
  }

  const newMemory: MemoryItem = {
    id: 'mem-' + crypto.randomUUID(),
    userId: req.params.uid,
    content: content.trim(),
    category: (category as MemoryCategory) || 'reflection',
    extractedAt: new Date().toISOString(),
    pinned: false,
    sourceQuote: sourceQuote ? sourceQuote.trim() : undefined,
  };

  try {
    const created = await firestoreJournalStore.createMemory(req.params.uid, newMemory);
    res.status(201).json({ memory: created });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to save memory to Firestore.' });
  }
});

// Toggle pin memory
app.patch('/api/users/:uid/memories/:memoryId/pin', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const updated = await firestoreJournalStore.togglePinMemory(req.params.uid, req.params.memoryId);
    if (!updated) {
      return res.status(404).json({ error: 'Memory item not found.' });
    }
    res.json({ memory: updated });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to update memory in Firestore.' });
  }
});

// Delete memory from Firestore
app.delete('/api/users/:uid/memories/:memoryId', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const success = await firestoreJournalStore.deleteMemory(req.params.uid, req.params.memoryId);
    if (!success) {
      return res.status(404).json({ error: 'Memory not found or already deleted.' });
    }
    res.json({ message: 'Memory deleted from Firestore.' });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to delete memory from Firestore.' });
  }
});

/* =========================================================================
   4. MOOD & REFLECTION ANALYTICS (/api/users/:uid/analytics)
   ========================================================================= */
app.get('/api/users/:uid/analytics', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const analytics = await firestoreJournalStore.getAnalytics(req.params.uid);
    res.json({ analytics });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to generate analytics from Firestore.' });
  }
});

/* =========================================================================
   5. PRIVACY EXPORT & DATA WIPE (/api/users/:uid/export, /api/users/:uid/wipe)
   ========================================================================= */
app.get('/api/users/:uid/export', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const exportData = await firestoreJournalStore.exportUserData(req.params.uid);
    res.json(exportData);
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to export user data from Firestore.' });
  }
});

app.delete('/api/users/:uid/wipe', requireOwner, async (req: OwnerAuthenticatedRequest, res: Response) => {
  try {
    const result = await firestoreJournalStore.wipeUserData(req.params.uid);
    res.json({
      message: 'All private journal sessions and memories have been permanently deleted from Cloud Firestore.',
      ...result,
    });
  } catch (err: any) {
    console.error('[API Error]:', err.message);
    res.status(503).json({ error: 'Failed to wipe user data from Firestore.' });
  }
});

/* =========================================================================
   6. SECURITY ACCESS STATE TESTER (Demonstrates the 4 Access States)
   ========================================================================= */
app.post('/api/security/test-owner-boundary', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Security test endpoint disabled in production.' });
  }

  const { testState, targetUid, realToken, appCheckToken } = req.body || {};
  const currentOwner = targetUid || 'sample-user-uid';

  let authHeaderValue = '';

  if (testState === 'unauthenticated') {
    authHeaderValue = '';
  } else if (testState === 'wrong_owner') {
    authHeaderValue = realToken ? `Bearer ${realToken}` : 'Bearer invalid-wrong-owner';
  } else if (testState === 'owner') {
    authHeaderValue = realToken ? `Bearer ${realToken}` : 'Bearer unprovided';
  } else if (testState === 'invalid_token') {
    authHeaderValue = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature';
  }

  const testReq: any = {
    headers: {
      authorization: authHeaderValue,
      ...(appCheckToken ? { 'x-firebase-appcheck': appCheckToken } : {}),
    },
    params: { uid: testState === 'wrong_owner' ? 'different-user-999' : currentOwner },
  };

  let statusCode = 200;
  let responseBody: any = null;

  const testRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseBody = data;
      return this;
    },
  };

  const testNext = () => {
    statusCode = 200;
    responseBody = {
      status: 'authorized',
      message: `Cryptographically verified! ID token signed by Firebase Auth matches /users/${currentOwner}/...`,
      ownerUid: currentOwner,
    };
  };

  await requireOwner(testReq, testRes, testNext);

  res.json({
    testState,
    targetResource: `/users/${testReq.params.uid}/sessions`,
    sentAuthorization: authHeaderValue ? authHeaderValue.slice(0, 25) + '...' : '(None)',
    httpStatus: statusCode,
    responseBody,
    securityGuarantee: 'Data is strictly isolated via Firebase Auth ID Token verification & Firestore fail-closed owner rules.',
  });
});

// Explicit 404 handler for /api/* routes to prevent returning HTML for unknown API requests
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

/* =========================================================================
   7. VITE MIDDLEWARE & STATIC ASSETS
   ========================================================================= */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.resolve(__dirname, 'index.html'))
      ? path.resolve(__dirname)
      : process.cwd();

    console.log(`[Journal Server Production Mode] Serving static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Journal Server] Running on http://0.0.0.0:${PORT} with Cloud Firestore & Firebase Auth (Constitution v2)`);
  });
}

startServer();

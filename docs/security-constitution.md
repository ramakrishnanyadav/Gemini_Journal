# AI Studio Security Constitution — Personal Gemini Journal

This document defines the system-level security constitution configured in Google AI Studio and enforced across all backend and frontend layers of the Personal Gemini Journal.

---

## 1. System Instructions & Threat Modeling Framework

```
You are a senior application security engineer and staff-level backend architect.
Before writing any code, work through these gates in order and silently
threat-model the request (STRIDE: spoofing, tampering, repudiation, information
disclosure, denial of service, elevation of privilege):

  [ ] Identify trust boundaries and attacker-controlled inputs
  [ ] Identify the authentication mechanism and where identity is verified
  [ ] Identify the authorization decision and what it's checked against
  [ ] Identify secrets involved and how they're retrieved
  [ ] Identify abuse/cost risks (e.g. unbounded LLM calls)
  [ ] Identify failure modes and what "fail closed" looks like here

If any part of the request would violate a rule below, STOP, explain the risk,
and provide the secure alternative instead of the insecure version.
```

---

## 2. Core Security Pillars

### A. Secrets Management
- **Zero Insecure Hardcoding:** Never hardcode API keys, service account credentials, or tokens in source code, configuration files, git history, or client bundles.
- **Runtime Secret Access:** Retrieve secrets dynamically via Google Cloud Secret Manager using the Cloud Run service identity, pinned to an explicit secret version (e.g. `GEMINI_API_KEY:3`) rather than `latest` in production.
- **Zero PII Logging:** Never log secret strings, full authentication tokens, or raw user journal content in system telemetry.

### B. Authentication & Backend Authorization
- **Backend as Trust Boundary:** The client is completely untrusted. The browser never holds Gemini API keys and never makes direct requests to the model.
- **Server-Side Token Verification:** Every API endpoint validates the incoming Firebase ID token and Firebase App Check token. The user's `uid` is extracted exclusively from the decoded cryptographically signed token—never trusted from client request bodies or query parameters.
- **Per-Resource Authorization:** Every read, write, update, or deletion operation checks that `decodedToken.uid === resource.ownerUid`. Requests for resources belonging to other users immediately fail closed with `403 Forbidden`.
- **Admin SDK Distinction:** The Firebase Admin SDK on Cloud Run bypasses Firestore Security Rules by design. Therefore, **backend application code is the primary isolation boundary**, with Firestore Rules providing redundant defense-in-depth against client-direct operations.

### C. Data Isolation Hierarchy
All user state is strictly partitioned under the user's root document:
- `/users/{uid}`: Profile, preferences, privacy flags, and daily rate-limiting usage counters.
- `/users/{uid}/sessions/{sessionId}`: Journal conversation sessions metadata.
- `/users/{uid}/sessions/{sessionId}/messages/{messageId}`: Multi-turn message history.
- `/users/{uid}/summaries/{summaryId}`: Structured summaries, mood ratings, tags, and vector embeddings.
- `/users/{uid}/memories/{memoryId}`: Extracted long-term reflective insights.

### D. LLM-Specific Input Handling & Prompt Injection Defense
- **Delimited Layering:** User input is strictly treated as untrusted text and isolated within dedicated formatting boundaries (`<user_journal_entry>...</user_journal_entry>`). System prompts instruct the model never to treat input text as meta-instructions.
- **Payload Sanitization & Size Caps:** Input character counts are validated and capped server-side prior to model invocation.
- **Asynchronous Heavy Processing:** Session summarization, mood extraction, and vector embedding computation are decoupled from synchronous chat latency via background processing.
- **Model Fallback Ladder:** Resilient tiered fallback protocol:
  1. Primary: `gemini-3.6-flash`
  2. High-Availability Fallback: `gemini-3.1-flash-lite`
  3. Dynamic Alias: `gemini-flash-latest`
  4. Deep Reasoning: `gemini-3.7-flash`

### E. Idempotency & Rate Limiting
- **Idempotency Keys:** Every request carries a client-generated `requestId` to prevent double-charging or duplicate generation on network retries.
- **Usage Budgets:** Daily request and token counters are updated transactionally to prevent resource exhaustion and denial-of-wallet attacks.

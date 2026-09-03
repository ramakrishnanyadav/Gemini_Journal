import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, CheckCircle2, XCircle, AlertTriangle, Play, Terminal, X, KeyRound } from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../auth/AuthContext';

interface SecurityInspectorModalProps {
  onClose: () => void;
}

export const SecurityInspectorModal: React.FC<SecurityInspectorModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [testingState, setTestingState] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const ownerUid = user?.uid || 'user-owner';

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const ACCESS_STATES = [
    {
      id: 'unauthenticated',
      title: '1. Unauthenticated Request',
      description: 'Incoming request with no Authorization Bearer header',
      expectedStatus: 401,
      expectedBehavior: '401 Unauthorized (Redirect to login)',
      tokenUsed: 'None (Missing Header)',
    },
    {
      id: 'wrong_owner',
      title: '2. Authenticated, Wrong Owner',
      description: 'Valid token with UID "attacker-999" trying to read /users/' + ownerUid + '/sessions',
      expectedStatus: 403,
      expectedBehavior: '403 Forbidden (Ownership mismatch rejection)',
      tokenUsed: 'Bearer token-attacker-999-...',
    },
    {
      id: 'owner',
      title: '3. Authenticated Owner',
      description: 'Valid token with matching UID ' + ownerUid + ' accessing /users/' + ownerUid + '/...',
      expectedStatus: 200,
      expectedBehavior: '200 OK (Authorized owner access)',
      tokenUsed: `Bearer token-${ownerUid}-...`,
    },
    {
      id: 'invalid_token',
      title: '4. Invalid / Expired Token',
      description: 'Expired or forged token signature presented to server middleware',
      expectedStatus: 401,
      expectedBehavior: '401 Unauthorized (Token validation failure)',
      tokenUsed: 'Bearer expired',
    },
  ];

  const handleRunTest = async (stateId: any) => {
    setTestingState(stateId);
    try {
      const result = await apiService.testOwnerBoundary(stateId, ownerUid);
      setTestResults((prev) => ({ ...prev, [stateId]: result }));
    } catch (e: any) {
      setTestResults((prev) => ({ ...prev, [stateId]: { error: e.message } }));
    } finally {
      setTestingState(null);
    }
  };

  const handleRunAll = async () => {
    for (const state of ACCESS_STATES) {
      await handleRunTest(state.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="security-modal-title" className="text-base font-bold text-slate-900">
                Owner-Bound Security & Path-Isolation Verification
              </h2>
              <p className="text-xs text-slate-600">
                Live verification of the 4 access states enforcing <code className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">decodedToken.uid === req.params.uid</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Security Inspector Modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Architecture Guarantee Note */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Lock className="h-3.5 w-3.5 text-indigo-600" />
              <span>Zero-Role Path Isolation Guarantee</span>
            </div>
            <p className="leading-relaxed text-indigo-800/90">
              A personal journal does not use roles or organizational permission matrices. Every request is strictly evaluated against the requested resource's owner UID path: <span className="font-mono font-semibold">/users/{'{userId}'}/*</span>.
            </p>
          </div>

          {/* Test All Trigger */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Verification Test Suite
            </span>
            <button
              type="button"
              onClick={handleRunAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>Run All 4 Access Checks</span>
            </button>
          </div>

          {/* The 4 States Matrix */}
          <div className="space-y-3">
            {ACCESS_STATES.map((state) => {
              const res = testResults[state.id];
              const isRunning = testingState === state.id;
              const hasRun = !!res;
              const isPassing = hasRun && res.httpStatus === state.expectedStatus;

              return (
                <div
                  key={state.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{state.title}</span>
                        {hasRun && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPassing ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPassing ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {isPassing ? 'PASSED' : 'FAILED'} (HTTP {res.httpStatus})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{state.description}</p>
                    </div>

                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => handleRunTest(state.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
                    >
                      {isRunning ? 'Verifying...' : 'Test State'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-400">Header: </span>
                      <span className="text-slate-700">{state.tokenUsed}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Expected: </span>
                      <span className="text-indigo-600 font-semibold">{state.expectedBehavior}</span>
                    </div>
                  </div>

                  {/* Live Response Body */}
                  {res && (
                    <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[11px] font-mono overflow-x-auto space-y-1">
                      <div className="text-slate-400 text-[10px]">HTTP Response Proof ({res.httpStatus}):</div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(res.responseBody, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Firestore Security Rules Display */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Terminal className="h-3.5 w-3.5 text-slate-500" />
              <span>Matching Production Firestore Rules (firestore.rules)</span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 text-indigo-300 text-xs font-mono overflow-x-auto leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Owner-Bound User Scope: Full isolation per userId
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </motion.div>
    </div>
  );
};

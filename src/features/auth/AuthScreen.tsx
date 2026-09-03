import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mail, Lock, User, ArrowRight, AlertCircle, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';

// Official Brand SVGs for Google and GitHub
const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

function formatFirebaseError(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with the same email. Please sign in with the original provider you used.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'GitHub sign-in is not yet enabled in your Firebase Console. In Firebase Console > Authentication > Sign-in method, enable GitHub and enter your Client ID & Secret.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain is not in Firebase Authorized Domains list. Please add your Cloud Run URL in Firebase Console > Authentication > Settings > Authorized domains.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completing.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by your browser. Please allow popups for sign in.';
  }
  if (code === 'auth/missing-initial-state' || err?.message?.includes('missing initial state')) {
    return 'Browser sessionStorage blocked OAuth state. Please use "Instant Demo (1-Click Guest Entrance)" or Email Sign In / Sign Up.';
  }
  return err.message || 'Authentication failed. Please check your credentials.';
}

export const AuthScreen: React.FC<{ initialTab?: 'login' | 'register'; onAuthenticated?: () => void }> = ({
  initialTab = 'login',
  onAuthenticated,
}) => {
  const { login, register, loginWithOAuth, loginAsGuest, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Inline validation states
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-emerald-500' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-indigo-600' };
      default:
        return { score: 0, label: 'Weak', color: 'bg-rose-500' };
    }
  };

  const passwordStrength = getPasswordStrength(regPassword);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = (e: string) => emailRegex.test(e);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isEmailValid(loginEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Password is required.');
      return;
    }

    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      onAuthenticated?.();
    } catch (err: any) {
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!isEmailValid(regEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register(regName, regEmail, regPassword);
      onAuthenticated?.();
    } catch (err: any) {
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await loginWithOAuth(provider);
      onAuthenticated?.();
    } catch (err: any) {
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid(forgotEmail)) {
      setForgotStatus('Please enter a valid email address.');
      return;
    }
    try {
      const msg = await resetPassword(forgotEmail);
      setForgotStatus(msg);
    } catch (err: any) {
      setForgotStatus(formatFirebaseError(err));
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 relative overflow-hidden">
      {/* Subtle ambient decorative blur circles */}
      <div className="absolute top-12 -left-20 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-violet-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Auth Card */}
      <div className="w-full max-w-[420px] relative z-10">
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-8 space-y-6">
          
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 mb-1">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
              Personal Gemini Journal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-[340px] mx-auto leading-relaxed">
              Your private space to think out loud, with Gemini.
            </p>
          </div>

          {/* Tab Switcher: Login / Register */}
          <div className="flex p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 relative">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 relative z-10 cursor-pointer ${
                activeTab === 'login'
                  ? 'text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {activeTab === 'login' && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-2xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">Log In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 relative z-10 cursor-pointer ${
                activeTab === 'register'
                  ? 'text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {activeTab === 'register' && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-2xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">Create Account</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </motion.div>
          )}

          {/* Form Content with Framer Motion Crossfade */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setShowForgotModal(true);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authenticating with Firebase...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Journal</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-3.5"
              >
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Alex Rivera"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={regEmail}
                      onBlur={() => setTouched({ ...touched, email: true })}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                        touched.email && !isEmailValid(regEmail)
                          ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500'
                          : 'border-slate-200 bg-white focus:border-indigo-600'
                      }`}
                    />
                  </div>
                  {touched.email && !isEmailValid(regEmail) && (
                    <p className="text-[11px] text-rose-600 font-medium">Please enter a valid email format.</p>
                  )}
                </div>

                {/* Password & Strength Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Create Password
                    </label>
                    {regPassword && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  {/* Inline Strength Progress Bar */}
                  {regPassword.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onBlur={() => setTouched({ ...touched, confirmPass: true })}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                        touched.confirmPass && regPassword !== regConfirmPassword
                          ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500'
                          : 'border-slate-200 bg-white focus:border-indigo-600'
                      }`}
                    />
                  </div>
                  {touched.confirmPass && regPassword !== regConfirmPassword && (
                    <p className="text-[11px] text-rose-600 font-medium">Passwords do not match.</p>
                  )}
                </div>

                {/* Register Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Profile on Firebase...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Private Journal</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider relative">
              or continue with
            </span>
          </div>

          {/* OAuth Buttons (Real Google & GitHub Popup Auth + Instant Guest Entry) */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <GoogleIcon />
                <span>Google</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleOAuth('github')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <GitHubIcon />
                <span>GitHub</span>
              </button>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                setErrorMessage(null);
                try {
                  await loginAsGuest();
                  onAuthenticated?.();
                } catch (err: any) {
                  setErrorMessage(formatFirebaseError(err));
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 text-xs font-bold text-indigo-700 transition shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <User className="h-4 w-4 text-indigo-600" />
              <span>Instant Demo (1-Click Guest Entrance)</span>
            </button>
          </div>
        </div>

        {/* Security & Owner-Bound Guarantee Footer Tag */}
        <div className="mt-4 flex items-center justify-center gap-2 text-center text-slate-500 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Real Firebase Auth & Cloud Firestore owner-isolated documents.</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="space-y-1">
              <h3 id="reset-password-title" className="text-base font-bold text-slate-900">Reset Your Password</h3>
              <p className="text-xs text-slate-600">
                Enter your account email to receive Firebase password recovery instructions.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <label htmlFor="reset-email-input" className="sr-only">Email Address</label>
              <input
                id="reset-email-input"
                type="email"
                required
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />

              {forgotStatus && (
                <div className="p-2.5 rounded-lg bg-indigo-50 text-xs text-indigo-800 font-medium">
                  {forgotStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotStatus(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

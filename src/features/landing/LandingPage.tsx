import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ShieldCheck,
  Brain,
  Lock,
  Zap,
  ArrowRight,
  BarChart3,
  Compass,
  MessageSquare,
  Database,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react';
import { AuthScreen } from '../auth/AuthScreen';

interface LandingPageProps {
  onAuthenticated: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthenticated }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activePreviewTab, setActivePreviewTab] = useState<'chat' | 'compass' | 'analytics' | 'security'>('chat');

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/15 selection:text-indigo-900 relative overflow-hidden">
      {/* Soft Background Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900">
                Personal Gemini Journal
              </span>
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-md">
                v5.0 Pro
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#preview" className="hover:text-indigo-600 transition">Demo Preview</a>
            <a href="#security" className="hover:text-indigo-600 transition">Security Architecture</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuth('login')}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('register')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-16 md:pt-24 md:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-semibold text-indigo-700 mb-8 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
          <span>Powered by Gemini 2.5 Flash & Pro + Cloud Firestore</span>
          <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.15]">
          Your Private Space to Think Out Loud, with{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Gemini AI
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          End-to-end owner-bound journaling with AI reflection companions, emotional memory insights, and zero-trust server-side Firestore isolation.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => openAuth('register')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl shadow-xl shadow-indigo-500/25 transition active:scale-95"
          >
            <span>Launch Journal Free</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          <a
            href="#preview"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-2xl transition shadow-sm"
          >
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Hero Trust Badges */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-200">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <div className="text-2xl font-bold text-indigo-600">100%</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Owner-Bound Path Isolation</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <div className="text-2xl font-bold text-purple-600">2.5 Pro</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Gemini AI Reflection Ladder</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <div className="text-2xl font-bold text-emerald-600">Fail-Closed</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Cloud Persistence Security</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">Zero-Trust</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Firebase Admin Verification</div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Showcase Section */}
      <section id="preview" className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Experience the Journal Engine</h2>
          <p className="mt-3 text-slate-600 text-sm max-w-xl mx-auto">
            Preview the sleek, owner-bound interfaces built for deep emotional intelligence and security.
          </p>

          {/* Preview Navigation Tabs */}
          <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm gap-2">
            {[
              { id: 'chat', label: 'AI Journal Chat', icon: MessageSquare },
              { id: 'compass', label: 'Memory Compass', icon: Compass },
              { id: 'analytics', label: 'Emotional Analytics', icon: BarChart3 },
              { id: 'security', label: 'Security Architecture', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Demo Window Container */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-900/10">
          <div className="px-6 py-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs font-mono text-slate-500">https://gemini-journal.app/demo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                🔒 Cryptographically Verified Session
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8 min-h-[380px] bg-slate-50/50">
            {activePreviewTab === 'chat' && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="flex items-start gap-3 justify-end">
                  <div className="p-4 rounded-2xl bg-indigo-600 text-white text-sm max-w-md shadow-md shadow-indigo-600/10">
                    I felt overwhelmed by project deadlines today, but organizing my tasks step by step gave me clarity.
                  </div>
                  <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    YOU
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm max-w-md space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 mb-1">
                      <span>Gemini 2.5 Reflection Companion</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Recognizing that structure reduces overwhelm is a powerful self-awareness milestone. What specific task prioritization brought you the greatest sense of control?
                    </p>
                    <div className="pt-2 flex gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                        Mood: Focused / Calm
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                        Insight Extracted
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'compass' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {[
                  { category: 'Realization', quote: 'Breaking problems into small steps eliminates panic.', date: 'Today' },
                  { category: 'Core Belief', quote: 'Consistency creates confidence, even in ambiguity.', date: 'Yesterday' },
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{item.date}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 italic">"{item.quote}"</p>
                  </div>
                ))}
              </div>
            )}

            {activePreviewTab === 'analytics' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">7-Day Emotional Spectrum</h3>
                    <span className="text-xs font-mono text-emerald-600 font-semibold">+18% Resilience Index</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                        <span>Clarity & Focus</span>
                        <span>45%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full w-[45%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                        <span>Calm Reflection</span>
                        <span>35%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-purple-600 rounded-full w-[35%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'security' && (
              <div className="max-w-2xl mx-auto font-mono text-xs text-slate-700 space-y-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-indigo-700 font-bold">// Architecture Pipeline Security Checklist</div>
                <div className="text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>verifyIdToken() Express middleware verifies cryptographic Firebase signatures</span>
                </div>
                <div className="text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>All Firebase Admin SDK queries strictly scoped: /users/{'{req.uid}'}/sessions</span>
                </div>
                <div className="text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Fail-closed 503 error handling on database lookup timeouts</span>
                </div>
                <div className="text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Nonced XML boundaries block Gemini prompt injection attacks</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Built for Mind & Privacy</h2>
          <p className="mt-3 text-slate-600 text-sm max-w-xl mx-auto">
            Combining state-of-the-art generative AI with zero-trust cloud data ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: ShieldCheck,
              title: 'Zero-Trust Isolation',
              desc: 'Every endpoint verifies signed Firebase ID tokens and enforces strict server-side owner matching.',
              badge: 'Security First',
              color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
            },
            {
              icon: Brain,
              title: 'Gemini AI Reflection',
              desc: 'Multi-turn AI reflection companions designed to ask deep questions without storing third-party telemetry.',
              badge: 'Gemini 2.5',
              color: 'text-purple-600 bg-purple-50 border-purple-200',
            },
            {
              icon: Database,
              title: 'Fail-Closed Persistence',
              desc: 'Cloud Firestore persistence returns 503 service unavailable if database lookups fail rather than corrupting state.',
              badge: 'Cloud Firestore',
              color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            },
            {
              icon: Zap,
              title: 'Streaming Idempotency',
              desc: 'Composite key idempotency caching prevents duplicate API requests during live streaming generations.',
              badge: 'Sub-100ms',
              color: 'text-amber-600 bg-amber-50 border-amber-200',
            },
            {
              icon: Compass,
              title: 'Memory Insights',
              desc: 'Extract key insights, core beliefs, and wisdom tags automatically into a persistent memory compass.',
              badge: 'AI Memory',
              color: 'text-blue-600 bg-blue-50 border-blue-200',
            },
            {
              icon: Lock,
              title: 'Data Sovereignty',
              desc: 'One-click full JSON dataset export and complete account data wipe directly from the privacy menu.',
              badge: 'Owner Control',
              color: 'text-pink-600 bg-pink-50 border-pink-200',
            },
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${feat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{feat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span className="font-semibold text-slate-800">Personal Gemini Journal</span>
          <span>© 2026. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://github.com/ramakrishnanyadav/Gemini_Journal" target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition">
            GitHub Repository
          </a>
          <button onClick={() => openAuth('login')} className="hover:text-indigo-600 transition">
            Sign In
          </button>
        </div>
      </footer>

      {/* Auth Screen Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
              <AuthScreen
                initialTab={authMode}
                onAuthenticated={() => {
                  setShowAuthModal(false);
                  onAuthenticated();
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

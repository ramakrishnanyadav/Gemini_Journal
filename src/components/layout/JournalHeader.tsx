import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Compass,
  History,
  BarChart3,
  ShieldCheck,
  Download,
  LogOut,
  Plus,
  MessageSquare,
  Menu,
  X,
  Flame,
  ChevronDown,
  Check,
  Copy,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export type JournalViewTab = 'chat' | 'sessions' | 'compass' | 'analytics' | 'about';

interface JournalHeaderProps {
  activeTab: JournalViewTab;
  onTabChange: (tab: JournalViewTab) => void;
  onNewSession: () => void;
  onOpenSecurity: () => void;
  onOpenPrivacy: () => void;
  streakCount?: number;
}

interface NavItemConfig {
  id: JournalViewTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'chat', label: 'Reflect', icon: MessageSquare },
  { id: 'sessions', label: 'Timeline', icon: History },
  { id: 'compass', label: 'Memories', icon: Compass },
  { id: 'analytics', label: 'Insights', icon: BarChart3 },
  { id: 'about', label: 'Architecture', icon: ShieldCheck },
];

export const JournalHeader: React.FC<JournalHeaderProps> = ({
  activeTab,
  onTabChange,
  onNewSession,
  onOpenSecurity,
  onOpenPrivacy,
  streakCount = 1,
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyUid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleMobileTabSelect = (tab: JournalViewTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Refined Sticky Header Container */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          
          {/* Brand Wordmark & Live Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              type="button"
              onClick={() => onTabChange('chat')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-slate-900 text-white flex items-center justify-center shadow-xs border border-indigo-400/20 group-hover:border-indigo-400/40 transition-colors shrink-0">
                <Sparkles className="h-4 w-4 text-indigo-100" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm tracking-tight leading-none whitespace-nowrap">
                  Gemini Journal
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 whitespace-nowrap shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Firestore</span>
                </span>
              </div>
            </motion.button>

            {/* Streak Counter Chip */}
            <div
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50/90 border border-amber-200/80 text-amber-800 text-[11px] font-semibold whitespace-nowrap shadow-2xs"
              title={`${streakCount} day active reflection streak`}
              aria-label={`${streakCount} day active reflection streak`}
            >
              <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" aria-hidden="true" />
              <span>{streakCount}d streak</span>
            </div>
          </div>

          {/* Center Navigation Bar with Fluid Framer-Motion Slider */}
          <nav
            aria-label="Main Journal Navigation"
            className="hidden md:flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 text-xs font-semibold shadow-2xs shrink-0"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-medium whitespace-nowrap ${
                    isActive
                      ? 'text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                  }`}
                >
                  {/* Sliding Active Indicator Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTabIndicator"
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  {/* Icon with Subtle State Bounce */}
                  <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                    <motion.span
                      animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      className="flex items-center"
                    >
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                          isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                    </motion.span>
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right: Anchored New Session Action & User Menu */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {/* Anchored Primary New Reflection Button with Elevated Polish */}
            <motion.button
              type="button"
              onClick={onNewSession}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Create New Reflection Session"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 border border-indigo-500/40 ring-2 ring-indigo-500/15"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span className="whitespace-nowrap">New Reflection</span>
            </motion.button>

            {/* Profile Dropdown Trigger */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 py-1 px-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-2xs shrink-0"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(user?.uid || 'user')}`}
                  alt={user?.displayName ? `${user.displayName}'s avatar` : 'User avatar'}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-indigo-500/20 bg-slate-100 shrink-0"
                />
                <span className="text-xs font-semibold text-slate-800 max-w-[130px] truncate leading-none whitespace-nowrap">
                  {user?.displayName || 'Account'}
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                    userDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Popover Menu */}
              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs"
                  >
                    {/* User Identity Details */}
                    <div className="p-2.5 border-b border-slate-100 mb-1">
                      <p className="font-bold text-slate-900 truncate">
                        {user?.displayName || 'Authenticated Owner'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {user?.email || 'Firestore User'}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-400">UID</span>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]">{user?.uid || 'local'}</span>
                          <button
                            type="button"
                            onClick={handleCopyUid}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                            title="Copy UID"
                          >
                            {copiedUid ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenSecurity();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Security & Access Proof</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenPrivacy();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                      >
                        <Download className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>Export Data Archive</span>
                      </button>
                    </div>

                    {/* Sign Out Divider */}
                    <div className="pt-1 mt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={async () => {
                          setUserDropdownOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left font-semibold cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Bar: Action + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <motion.button
              type="button"
              onClick={onNewSession}
              whileTap={{ scale: 0.95 }}
              aria-label="Create New Reflection Session"
              className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
              title="New Reflection"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            </motion.button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Slide-out Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200"
            >
              {/* Drawer Top */}
              <div className="p-4 border-b border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span>Gemini Journal</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(user?.uid || 'user')}`}
                    alt={user?.displayName || 'User'}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20 bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user?.displayName || 'Owner'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {user?.email || 'authenticated'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="p-4 flex-1 space-y-1.5 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                  Navigation
                </span>

                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMobileTabSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* Mobile Tools */}
                <div className="pt-4 mt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    Tools & Governance
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenSecurity();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Security Proof</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenPrivacy();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-indigo-600" />
                    <span>Export / Privacy Data</span>
                  </button>
                </div>
              </div>

              {/* Drawer Footer with Logout */}
              <div className="p-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

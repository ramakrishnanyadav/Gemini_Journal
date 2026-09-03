import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { AuthScreen } from './features/auth/AuthScreen';
import { JournalHeader, JournalViewTab } from './components/layout/JournalHeader';
import { JournalChat } from './features/journal/JournalChat';
import { SessionExplorer } from './features/journal/SessionExplorer';
import { MemoryCompass } from './features/journal/MemoryCompass';
import { MoodAnalytics } from './features/journal/MoodAnalytics';
import { AboutArchitectureView } from './features/journal/AboutArchitectureView';
import { SecurityInspectorModal } from './features/journal/SecurityInspectorModal';
import { PrivacyModal } from './features/journal/PrivacyModal';
import { JournalSession, MemoryItem, MoodAnalyticsData, MemoryCategory } from './types/journal';
import { apiService } from './services/api';
import { Loader2 } from 'lucide-react';

import { ToastProvider } from './components/ui/ToastContext';

import { LandingPage } from './features/landing/LandingPage';

function JournalAppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<JournalViewTab>('chat');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [currentSession, setCurrentSession] = useState<JournalSession | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [analytics, setAnalytics] = useState<MoodAnalyticsData | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Modals
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const streakCount = React.useMemo(() => {
    if (!sessions || sessions.length === 0) return 1;
    const sessionDates = new Set(
      sessions.map((s) => new Date(s.createdAt).toISOString().split('T')[0])
    );
    return Math.max(1, sessionDates.size);
  }, [sessions]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      setLoadingData(true);
      const [sessionsData, memoriesData, analyticsData] = await Promise.all([
        apiService.getSessions(user.uid),
        apiService.getMemories(user.uid),
        apiService.getAnalytics(user.uid),
      ]);
      setSessions(sessionsData);
      setMemories(memoriesData);
      setAnalytics(analyticsData);

      if (sessionsData.length > 0) {
        setCurrentSession((prev) => (prev ? sessionsData.find((s) => s.id === prev.id) || sessionsData[0] : sessionsData[0]));
      } else {
        // Create an initial blank reflection session if user has none
        const newSession = await apiService.createSession(user.uid, {
          title: `Reflection: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          mood: 'reflective',
        });
        setSessions([newSession]);
        setCurrentSession(newSession);
      }
    } catch (err) {
      console.error('Failed to load user journal data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    }
  }, [isAuthenticated, user?.uid]);

  const handleNewSession = async () => {
    if (!user) return;
    try {
      const newSession = await apiService.createSession(user.uid, {
        title: `Reflection: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        mood: 'reflective',
      });
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setActiveTab('chat');
    } catch (err) {
      console.error('Failed to create new reflection session:', err);
    }
  };

  const handleUpdateSession = (updated: JournalSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (currentSession?.id === updated.id) {
      setCurrentSession(updated);
    }
    // Refresh analytics in background
    if (user) {
      apiService.getAnalytics(user.uid).then(setAnalytics).catch(console.error);
      apiService.getMemories(user.uid).then(setMemories).catch(console.error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await apiService.deleteSession(user.uid, sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);
      if (currentSession?.id === sessionId) {
        setCurrentSession(remaining.length > 0 ? remaining[0] : null);
      }
      apiService.getAnalytics(user.uid).then(setAnalytics).catch(console.error);
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleTogglePinMemory = async (memoryId: string) => {
    if (!user) return;
    try {
      const updated = await apiService.togglePinMemory(user.uid, memoryId);
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? updated : m)));
    } catch (err) {
      console.error('Failed to toggle pin on memory:', err);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!user) return;
    try {
      await apiService.deleteMemory(user.uid, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleAddMemory = async (content: string, category: string, quote?: string) => {
    if (!user) return;
    try {
      const newMemory = await apiService.createMemory(user.uid, {
        content,
        category,
        sourceQuote: quote,
      });
      setMemories((prev) => [newMemory, ...prev]);
    } catch (err) {
      console.error('Failed to create memory:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Restoring private journal session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LandingPage onAuthenticated={loadUserData} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* App Header */}
      <JournalHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewSession={handleNewSession}
        onOpenSecurity={() => setShowSecurityModal(true)}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        streakCount={streakCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && (
          <JournalChat
            currentSession={currentSession}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
            onAddMemory={handleAddMemory}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionExplorer
            sessions={sessions}
            currentSessionId={currentSession?.id}
            isLoading={loadingData}
            onSelectSession={(session) => {
              setCurrentSession(session);
              setActiveTab('chat');
            }}
            onDeleteSession={handleDeleteSession}
            onNewSession={handleNewSession}
          />
        )}

        {activeTab === 'compass' && (
          <MemoryCompass
            memories={memories}
            isLoading={loadingData}
            onTogglePin={handleTogglePinMemory}
            onDeleteMemory={handleDeleteMemory}
            onAddMemory={(content, category, quote) => handleAddMemory(content, category as MemoryCategory, quote)}
          />
        )}

        {activeTab === 'analytics' && <MoodAnalytics analytics={analytics} />}

        {activeTab === 'about' && <AboutArchitectureView />}
      </main>

      {/* Modals */}
      {showSecurityModal && (
        <SecurityInspectorModal onClose={() => setShowSecurityModal(false)} />
      )}

      {showPrivacyModal && (
        <PrivacyModal
          onClose={() => setShowPrivacyModal(false)}
          onDataWiped={loadUserData}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <JournalAppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, MessageSquare, Trash2, ArrowRight, Tag, Sparkles, Filter, Check, Clock } from 'lucide-react';
import { JournalSession, MoodType } from '../../types/journal';

interface SessionExplorerProps {
  sessions: JournalSession[];
  currentSessionId?: string;
  isLoading?: boolean;
  onSelectSession: (session: JournalSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
}

const MOOD_STYLES: Record<MoodType, { label: string; bg: string; text: string }> = {
  calm: { label: 'Calm', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  reflective: { label: 'Reflective', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  energized: { label: 'Energized', bg: 'bg-amber-50', text: 'text-amber-700' },
  focused: { label: 'Focused', bg: 'bg-sky-50', text: 'text-sky-700' },
  grateful: { label: 'Grateful', bg: 'bg-rose-50', text: 'text-rose-700' },
  creative: { label: 'Creative', bg: 'bg-purple-50', text: 'text-purple-700' },
  anxious: { label: 'Anxious', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const SessionExplorer: React.FC<SessionExplorerProps> = ({
  sessions,
  currentSessionId,
  isLoading = false,
  onSelectSession,
  onDeleteSession,
  onNewSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [sessionToDelete, setSessionToDelete] = useState<JournalSession | null>(null);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.summary && s.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood = selectedMoodFilter === 'all' || s.mood === selectedMoodFilter;
    return matchesSearch && matchesMood;
  });

  const confirmDelete = () => {
    if (!sessionToDelete) return;
    onDeleteSession(sessionToDelete.id);
    setSessionToDelete(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Timeline & Archives</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Browse, search, and revisit your chronological thoughts and Gemini reflections.
            </p>
          </div>

          <button
            type="button"
            onClick={onNewSession}
            aria-label="Start fresh reflection session"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Start Fresh Reflection</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search across all reflections, insights, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search across all reflections"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          {/* Mood Filter Pill selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="toolbar" aria-label="Mood filters">
            <button
              type="button"
              onClick={() => setSelectedMoodFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedMoodFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Moods ({sessions.length})
            </button>
            {(Object.keys(MOOD_STYLES) as MoodType[]).map((mood) => {
              const style = MOOD_STYLES[mood];
              const isSelected = selectedMoodFilter === mood;
              const count = sessions.filter((s) => s.mood === mood).length;
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setSelectedMoodFilter(mood)}
                  aria-pressed={isSelected}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? `${style.bg} ${style.text} ring-2 ring-indigo-500/30 font-bold shadow-2xs`
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {style.label} <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sessions List or Skeleton Loading */}
        {isLoading ? (
          <div className="space-y-3" aria-label="Loading reflection sessions">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-100 rounded-full" />
                </div>
                <div className="h-5 w-2/3 bg-slate-200 rounded" />
                <div className="h-3.5 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <Calendar className="h-8 w-8 text-slate-300 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">No reflections matched your criteria</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your query or filter to see previous journal entries.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const moodConfig = MOOD_STYLES[session.mood] || MOOD_STYLES.reflective;
              const isCurrent = session.id === currentSessionId;
              const dateFormatted = new Date(session.createdAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const timeFormatted = new Date(session.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-indigo-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div
                      onClick={() => onSelectSession(session)}
                      className="flex-1 space-y-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {dateFormatted}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {timeFormatted}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${moodConfig.bg} ${moodConfig.text} border border-slate-200/50`}
                        >
                          {moodConfig.label}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" aria-hidden="true" />
                          {session.messages.length} messages
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                        {session.title}
                      </h3>

                      {session.summary && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {session.summary}
                        </p>
                      )}

                      {/* Tag list */}
                      {session.tags && session.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {session.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700"
                            >
                              <Tag className="h-2.5 w-2.5 text-slate-500" aria-hidden="true" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectSession(session)}
                        aria-label={`Open reflection ${session.title}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSessionToDelete(session)}
                        aria-label={`Delete reflection session ${session.title}`}
                        title="Delete session"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delete Reflection?</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-900 font-semibold">"{sessionToDelete.title}"</strong> and all its recorded messages?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

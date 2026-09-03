import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  BookmarkPlus,
  Tag,
  Smile,
  Zap,
  BookOpen,
  Check,
  Loader2,
  Trash2,
  Share2,
  AlertCircle,
  Edit3,
  X,
  Compass,
} from 'lucide-react';
import { JournalSession, JournalMessage, MoodType } from '../../types/journal';
import { apiService } from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/ToastContext';

interface JournalChatProps {
  currentSession: JournalSession | null;
  onUpdateSession: (updated: JournalSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onAddMemory: (content: string, category: string, quote?: string) => void;
}

const PROMPT_STARTERS = [
  {
    category: 'Clarity & Focus',
    title: 'Daily Untangle',
    prompt: "I'm feeling a bit scattered today. Help me break down my top priorities and what's causing friction.",
    icon: Sparkles,
    tag: 'Focus',
  },
  {
    category: 'Architecture & Strategy',
    title: 'Decision Clarity',
    prompt: "I'm trying to decide between two strategic approaches. Let's weigh the tradeoffs and long-term implications.",
    icon: Zap,
    tag: 'Strategy',
  },
  {
    category: 'Mindset & Gratitude',
    title: 'Evening Gratitude',
    prompt: 'Taking a moment to reflect on three small wins and moments that brought me energy and joy today.',
    icon: Smile,
    tag: 'Mindset',
  },
  {
    category: 'Emotional Reset',
    title: 'Decompress Stress',
    prompt: "I just came out of a demanding situation and need a calm, grounded sounding board to decompress.",
    icon: BookOpen,
    tag: 'Calm',
  },
];

const MOOD_OPTIONS: { type: MoodType; label: string; bg: string; text: string }[] = [
  { type: 'calm', label: 'Calm', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { type: 'reflective', label: 'Reflective', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  { type: 'energized', label: 'Energized', bg: 'bg-amber-50', text: 'text-amber-700' },
  { type: 'focused', label: 'Focused', bg: 'bg-sky-50', text: 'text-sky-700' },
  { type: 'grateful', label: 'Grateful', bg: 'bg-rose-50', text: 'text-rose-700' },
  { type: 'creative', label: 'Creative', bg: 'bg-purple-50', text: 'text-purple-700' },
  { type: 'anxious', label: 'Anxious', bg: 'bg-slate-100', text: 'text-slate-700' },
];

export const JournalChat: React.FC<JournalChatProps> = ({
  currentSession,
  onUpdateSession,
  onDeleteSession,
  onAddMemory,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [pinnedMsgIds, setPinnedMsgIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Editable session title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sessionTitle, setSessionTitle] = useState(currentSession?.title || 'Daily Reflection');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (currentSession) {
      setSessionTitle(currentSession.title);
    }
  }, [currentSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isGenerating, streamingText]);

  // Total session word count
  const sessionWordCount = React.useMemo(() => {
    if (!currentSession?.messages) return 0;
    return currentSession.messages.reduce((acc, msg) => {
      const words = msg.text.trim().split(/\s+/).filter(Boolean);
      return acc + words.length;
    }, 0);
  }, [currentSession?.messages]);

  // Setup Speech Recognition if available
  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info('Speech recognition is not supported in this browser environment. Please use keyboard input.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to start voice recognition:', e);
      setIsRecording(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !user || !currentSession || isGenerating) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    // 1. Clear input & disable composer immediately
    setInputText('');
    setIsGenerating(true);
    setStreamingText('');

    // 2. Persist user message to Firestore immediately
    const userMsgId = 'msg-' + crypto.randomUUID();
    const userMessage: JournalMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
      sentiment: currentSession.mood || 'reflective',
    };

    const optimisticSession: JournalSession = {
      ...currentSession,
      messages: [...(currentSession.messages || []), userMessage],
      updatedAt: new Date().toISOString(),
    };
    onUpdateSession(optimisticSession);

    try {
      // 3. Stream model tokens in real-time via backend API
      const result = await apiService.streamReflectionMessage(
        user.uid,
        currentSession.id,
        text,
        (token) => {
          setStreamingText((prev) => prev + token);
        }
      );

      const geminiMsg: JournalMessage = result.geminiResponse;

      // 4. Auto-extract insights into memories via backend API
      if (result.insightsExtracted && result.insightsExtracted.length > 0) {
        for (const insight of result.insightsExtracted) {
          try {
            await apiService.createMemory(user.uid, {
              content: insight,
              category: result.sentiment === 'grateful' ? 'gratitude' : 'breakthrough',
              sourceQuote: text.slice(0, 120),
            });
          } catch (mErr) {
            console.warn('Memory auto-extract non-fatal:', mErr);
          }
        }
      }

      // Update session state
      const updatedMessages = [...(currentSession.messages || []), userMessage, geminiMsg];
      onUpdateSession({
        ...currentSession,
        messages: updatedMessages,
        mood: (result.sentiment as MoodType) || currentSession.mood,
        summary: result.summary || currentSession.summary,
      });
    } catch (err: any) {
      console.error('Failed to send reflection:', err);
      toast.error(err.message || 'Failed to generate reflection response.');
    } finally {
      setIsGenerating(false);
      setStreamingText('');
    }
  };

  const handleSpeechSynthesis = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePinInsight = (insightText: string, msgId: string) => {
    onAddMemory(insightText, 'breakthrough', currentSession?.title);
    setPinnedMsgIds((prev) => new Set(prev).add(msgId));
    toast.success('Saved to Memory Compass');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveTitle = async () => {
    if (!user || !currentSession) return;
    setIsEditingTitle(false);
    if (sessionTitle.trim() && sessionTitle !== currentSession.title) {
      const updated = await apiService.updateSession(user.uid, currentSession.id, {
        title: sessionTitle.trim(),
      });
      if (updated) {
        onUpdateSession(updated);
        toast.success('Session renamed');
      }
    }
  };

  const handleMoodChange = async (mood: MoodType) => {
    if (!user || !currentSession) return;
    const updated = await apiService.updateSession(user.uid, currentSession.id, { mood });
    if (updated) onUpdateSession(updated);
  };

  const confirmDelete = () => {
    if (!currentSession) return;
    onDeleteSession(currentSession.id);
    setShowDeleteModal(false);
    toast.info('Session deleted');
  };

  if (!currentSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No active session selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Select an entry from the timeline or start a new reflection above.
        </p>
      </div>
    );
  }

  const currentMoodConfig = MOOD_OPTIONS.find((m) => m.type === currentSession.mood) || MOOD_OPTIONS[1];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/30 relative">
      {/* Session Context Bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 shrink-0 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setSessionTitle(currentSession.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="px-2 py-1 text-xs sm:text-sm font-semibold text-slate-900 border border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white shadow-2xs"
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename this reflection session"
                  className="text-xs sm:text-sm font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors truncate"
                >
                  {currentSession.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                  title="Rename session"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Mood Badge */}
            <span
              className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${currentMoodConfig.bg} ${currentMoodConfig.text} border border-slate-200/60 shrink-0 shadow-2xs`}
            >
              {currentMoodConfig.label}
            </span>

            {/* Session Stats */}
            {currentSession.messages.length > 0 && (
              <span className="hidden md:inline-flex text-[11px] text-slate-400 font-medium">
                {currentSession.messages.length} messages · {sessionWordCount} words
              </span>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mood selector dropdown */}
            <select
              value={currentSession.mood}
              onChange={(e) => handleMoodChange(e.target.value as MoodType)}
              aria-label="Select session mood"
              className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs"
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m.type} value={m.type}>
                  {m.label} Mood
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              aria-label="Delete this reflection session"
              title="Delete session"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Canvas with aria-live="polite" */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {currentSession.messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
            <div className="inline-flex p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">What is on your mind right now?</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Think out loud. Describe a challenge, a realization, or an unformed idea. Gemini acts as an empathetic mirror to bring clarity.
              </p>
            </div>

            {/* Prompt Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left max-w-xl mx-auto">
              {PROMPT_STARTERS.map((starter, idx) => {
                const IconComponent = starter.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-indigo-200 transition-all text-left shadow-2xs hover:shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {starter.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {starter.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      "{starter.prompt}"
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {currentSession.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Gemini Avatar */}
                {msg.sender === 'gemini' && (
                  <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-700 to-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1 border border-indigo-400/20">
                    <Sparkles className="h-4 w-4 text-indigo-100" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200/80 text-slate-900 rounded-tl-xs space-y-3'
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>

                  {/* AI Extracted Insights / Reflections */}
                  {msg.sender === 'gemini' && msg.reflections && msg.reflections.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                        <Tag className="h-3 w-3" />
                        <span>Extracted Core Insights</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.reflections.map((refText, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700"
                          >
                            <span className="leading-snug italic font-serif text-[12px] text-slate-800">
                              "{refText}"
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePinInsight(refText, `${msg.id}-${rIdx}`)}
                              aria-label="Pin insight to Memory Compass"
                              title="Pin to Memory Compass"
                              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              {pinnedMsgIds.has(`${msg.id}-${rIdx}`) ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                              ) : (
                                <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Meta & Action Tools */}
                  <div
                    className={`flex items-center justify-between text-[10px] pt-1 ${
                      msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {msg.sender === 'gemini' && (
                      <div className="flex items-center gap-2">
                        {msg.modelUsed && (
                          <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60">
                            {msg.modelUsed}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSpeechSynthesis(msg.text)}
                          aria-label="Listen with text-to-speech"
                          title="Listen with text-to-speech"
                          className="hover:text-indigo-600 transition-colors p-0.5 cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.text, msg.id)}
                          aria-label="Copy message text"
                          title="Copy text"
                          className="hover:text-slate-800 transition-colors p-0.5 cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                          ) : (
                            <Share2 className="h-3 w-3" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(user?.uid || 'user')}`}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0 mt-1 shadow-2xs"
                  />
                )}
              </motion.div>
            ))}

            {/* AI Reflection Loading / Streaming State */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-700 to-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1 animate-pulse">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="max-w-[85%] sm:max-w-[78%] p-4 sm:p-5 rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 text-slate-900 shadow-2xs space-y-2">
                  {streamingText ? (
                    <div>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed inline">
                        {streamingText}
                      </p>
                      <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                      </div>
                      <span className="font-medium text-slate-700">Gemini is reflecting and synthesizing your thoughts...</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Input Area */}
      <div className="p-4 sm:p-6 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Active Voice Wave Animation indicator if recording */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Listening... Speak your thoughts freely.</span>
            </motion.div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative rounded-2xl border border-slate-200 bg-slate-50/80 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all shadow-2xs">
              <textarea
                rows={2}
                placeholder={isRecording ? 'Listening to your speech...' : 'Write your raw thoughts, questions, or reflections...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                aria-label="Reflection message input"
                className="w-full px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 focus:outline-none resize-none leading-relaxed"
              />

              {/* Dictation Trigger Button */}
              <div className="absolute right-3 bottom-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleRecording}
                  aria-label={isRecording ? 'Stop voice dictation' : 'Start voice dictation'}
                  title={isRecording ? 'Stop voice recording' : 'Dictate thoughts via voice'}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                  }`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              aria-label="Send reflection message"
              className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>
              Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> to reflect · <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Shift+Enter</kbd> for line break
            </span>
            <span>{inputText.length > 0 ? `${inputText.trim().split(/\s+/).filter(Boolean).length} words` : ''}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
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
                Are you sure you want to permanently delete <strong className="text-slate-900 font-semibold">"{currentSession.title}"</strong> and all its recorded messages?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
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


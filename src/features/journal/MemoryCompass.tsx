import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Pin, PinOff, Plus, Trash2, Zap, Heart, Target, Sparkles, BookOpen, Filter, Search, Copy, Check, X } from 'lucide-react';
import { MemoryItem, MemoryCategory } from '../../types/journal';
import { useToast } from '../../components/ui/ToastContext';

interface MemoryCompassProps {
  memories: MemoryItem[];
  isLoading?: boolean;
  onTogglePin: (memoryId: string) => void;
  onDeleteMemory: (memoryId: string) => void;
  onAddMemory: (content: string, category: MemoryCategory, quote?: string) => void;
}

const CATEGORY_CONFIG: Record<MemoryCategory, { label: string; icon: any; color: string; badgeBg: string }> = {
  breakthrough: { label: 'Breakthrough', icon: Zap, color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
  habit: { label: 'Habit & Rule', icon: Target, color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  gratitude: { label: 'Gratitude', icon: Heart, color: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  goal: { label: 'Strategic Goal', icon: Sparkles, color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
  reflection: { label: 'Core Reflection', icon: BookOpen, color: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200' },
};

export const MemoryCompass: React.FC<MemoryCompassProps> = ({
  memories,
  isLoading = false,
  onTogglePin,
  onDeleteMemory,
  onAddMemory,
}) => {
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('breakthrough');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Handle ESC key for modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const filteredMemories = memories
    .filter((m) => {
      const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchesSearch =
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.sourceQuote && m.sourceQuote.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddMemory(newContent.trim(), newCategory);
    setNewContent('');
    setShowAddModal(false);
    toast.success('Added to Memory Compass');
  };

  const handleCopyMemory = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied insight to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Memory Compass & Principles</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Distilled breakthroughs, guiding rules, and core insights synthesized across your reflections.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            aria-label="Add new core memory anchor"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Core Memory</span>
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search compass insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="toolbar" aria-label="Category filters">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Insights ({memories.length})
            </button>

            {(Object.keys(CATEGORY_CONFIG) as MemoryCategory[]).map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const IconComponent = config.icon;
              const count = memories.filter((m) => m.category === cat).length;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? `${config.badgeBg} ${config.color} font-bold shadow-2xs ring-2 ring-indigo-500/30`
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <IconComponent className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{config.label}</span>
                  <span className="text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid of Memory Cards or Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="Loading memory anchors">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs animate-pulse space-y-3">
                <div className="h-4 w-20 bg-slate-200 rounded-lg" />
                <div className="h-5 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-3 w-1/3 bg-slate-100 rounded pt-2" />
              </div>
            ))}
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <Compass className="h-8 w-8 text-slate-300 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">No memory compass items in this view</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              As you reflect with Gemini, click the pin icon next to any extracted insight to collect it here or click "Add Core Memory".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredMemories.map((mem) => {
                const config = CATEGORY_CONFIG[mem.category] || CATEGORY_CONFIG.reflection;
                const IconComponent = config.icon;

                return (
                  <motion.div
                    key={mem.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`p-5 rounded-2xl border bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 relative group ${
                      mem.pinned ? 'border-indigo-300 ring-1 ring-indigo-200/50 bg-indigo-50/10' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${config.badgeBg} ${config.color}`}
                        >
                          <IconComponent className="h-3 w-3" aria-hidden="true" />
                          {config.label}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyMemory(mem.content, mem.id)}
                            aria-label="Copy memory to clipboard"
                            title="Copy text"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {copiedId === mem.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onTogglePin(mem.id)}
                            aria-label={mem.pinned ? 'Unpin from top' : 'Pin to top of compass'}
                            title={mem.pinned ? 'Unpin from top' : 'Pin to top of compass'}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              mem.pinned
                                ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                            }`}
                          >
                            {mem.pinned ? <Pin className="h-3.5 w-3.5 fill-indigo-600" aria-hidden="true" /> : <PinOff className="h-3.5 w-3.5" aria-hidden="true" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteMemory(mem.id)}
                            aria-label="Delete memory anchor"
                            title="Delete memory"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed font-sans">
                        "{mem.content}"
                      </p>

                      {mem.sourceQuote && (
                        <p className="text-[11px] text-slate-600 italic border-l-2 border-indigo-200 pl-2.5 mt-2 font-serif bg-slate-50/50 py-1 rounded-r-md">
                          Context: {mem.sourceQuote}
                        </p>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span>
                        Extracted {new Date(mem.extractedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {mem.pinned && (
                        <span className="font-bold text-indigo-600 flex items-center gap-1">
                          <Pin className="h-3 w-3 fill-indigo-600" aria-hidden="true" />
                          Pinned
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-memory-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 id="add-memory-title" className="text-base font-bold text-slate-900">Add Memory Anchor</h3>
                <p className="text-xs text-slate-500">
                  Record a personal breakthrough, guiding principle, or ongoing habit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-3.5">
              <div className="space-y-1">
                <label htmlFor="memory-category-select" className="text-xs font-semibold text-slate-700 block">Category</label>
                <select
                  id="memory-category-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {(Object.keys(CATEGORY_CONFIG) as MemoryCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_CONFIG[c].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="memory-content-input" className="text-xs font-semibold text-slate-700 block">Core Realization / Principle</label>
                <textarea
                  id="memory-content-input"
                  rows={3}
                  required
                  placeholder="e.g. Protect morning deep work blocks before checking reactive messages."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save to Compass
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Download, Trash2, ShieldCheck, X, FileJson, FileText, AlertTriangle, Check } from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/ToastContext';

interface PrivacyModalProps {
  onClose: () => void;
  onDataWiped: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose, onDataWiped }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

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

  const handleExportJSON = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const data = await apiService.exportData(user.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-journal-export-${user.uid}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess('JSON archive exported successfully.');
      toast.success('Journal JSON data exported.');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportMarkdown = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const data = await apiService.exportData(user.uid);
      let md = `# Personal Gemini Journal Export\n**Owner:** ${data.profile?.displayName} (${data.profile?.email})\n**Exported At:** ${data.exportedAt}\n\n---\n\n## Journal Sessions\n\n`;

      data.sessions.forEach((s: any) => {
        md += `### ${s.title} (${new Date(s.createdAt).toLocaleDateString()})\n**Mood:** ${s.mood}\n\n`;
        if (s.summary) md += `> **Summary:** ${s.summary}\n\n`;
        s.messages.forEach((m: any) => {
          md += `**${m.sender === 'user' ? 'Me' : 'Gemini'}:** ${m.text}\n\n`;
        });
        md += `---\n\n`;
      });

      md += `## Memory Compass\n\n`;
      data.memories.forEach((mem: any) => {
        md += `- **[${mem.category.toUpperCase()}]** "${mem.content}" (${new Date(mem.extractedAt).toLocaleDateString()})\n`;
      });

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-journal-notes-${user.uid}-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess('Markdown export downloaded successfully.');
      toast.success('Markdown notes exported successfully.');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleWipeData = async () => {
    if (!user) return;
    setWiping(true);
    try {
      await apiService.wipeData(user.uid);
      toast.success('All private journal entries wiped.');
      onDataWiped();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to wipe data');
    } finally {
      setWiping(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <h2 id="privacy-modal-title" className="text-base font-bold text-slate-900">Privacy & Data Governance</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Privacy Modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Privacy Guarantee */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-900">Your Data Belongs Strictly to You</p>
            <p className="leading-relaxed">
              Every reflection and insight is stored in your private owner path <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">/users/{user?.uid}/...</code>. Your private entries are never shared or mixed with any other user.
            </p>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Download Full Archive
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={downloading}
                onClick={handleExportJSON}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50 text-left transition-all shadow-2xs group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileJson className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                    JSON Archive
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Machine-readable dump of all sessions, insights, and metadata.
                </p>
              </button>

              <button
                type="button"
                disabled={downloading}
                onClick={handleExportMarkdown}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50 text-left transition-all shadow-2xs group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                    Markdown Notes
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Formatted Markdown notes ready for Obsidian, Notion, or Apple Notes.
                </p>
              </button>
            </div>

            {exportSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{exportSuccess}</span>
              </div>
            )}
          </div>

          {/* Danger Zone: Wipe User Data */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Danger Zone</span>
            </h3>

            {!showWipeConfirm ? (
              <button
                type="button"
                onClick={() => setShowWipeConfirm(true)}
                className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete All Journal Entries & Memories</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                  Are you absolutely certain? This will permanently remove all your journal sessions and memory compass anchors. This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWipeConfirm(false)}
                    className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={wiping}
                    onClick={handleWipeData}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                  >
                    {wiping ? 'Wiping...' : 'Yes, Delete Everything'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

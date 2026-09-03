import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Flame, Sparkles, Smile, BookOpen, Clock, HeartHandshake } from 'lucide-react';
import { MoodAnalyticsData, MoodType } from '../../types/journal';

interface MoodAnalyticsProps {
  analytics: MoodAnalyticsData | null;
}

const MOOD_EMOJIS: Record<MoodType, { label: string; color: string; barColor: string }> = {
  calm: { label: 'Calm & Grounded', color: 'text-emerald-600', barColor: 'bg-emerald-500' },
  reflective: { label: 'Deeply Reflective', color: 'text-indigo-600', barColor: 'bg-indigo-500' },
  energized: { label: 'Energized & Driven', color: 'text-amber-600', barColor: 'bg-amber-500' },
  focused: { label: 'Focused & Flowing', color: 'text-sky-600', barColor: 'bg-sky-500' },
  grateful: { label: 'Grateful & Appreciative', color: 'text-rose-600', barColor: 'bg-rose-500' },
  creative: { label: 'Creative & Generative', color: 'text-purple-600', barColor: 'bg-purple-500' },
  anxious: { label: 'Anxious / Untangling', color: 'text-slate-600', barColor: 'bg-slate-400' },
};

export const MoodAnalytics: React.FC<MoodAnalyticsProps> = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50" aria-label="Loading mood cadence and reflection metrics">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="h-6 w-60 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 animate-pulse">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-6 w-20 bg-slate-200 rounded" />
                <div className="h-2.5 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl bg-slate-200 animate-pulse h-28" />
        </div>
      </div>
    );
  }

  const values = Object.values(analytics.moodDistribution) as number[];
  const maxDistributionCount = Math.max(...values, 1);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Emotional Cadence & Insights</h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Holistic trends synthesized from your private thinking sessions and Gemini dialogs.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Active Streak</span>
              <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{analytics.streakDays} <span className="text-xs font-normal text-slate-500">days</span></p>
            <p className="text-[10px] text-emerald-600 font-medium">Consistent reflection habit</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Total Sessions</span>
              <BookOpen className="h-4 w-4 text-indigo-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{analytics.totalSessions}</p>
            <p className="text-[10px] text-slate-500">Recorded private entries</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Words Expressed</span>
              <Clock className="h-4 w-4 text-sky-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{analytics.totalWordCount.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Thoughts articulated</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold">Dominant Tone</span>
              <Sparkles className="h-4 w-4 text-purple-500" aria-hidden="true" />
            </div>
            <p className="text-lg font-bold text-indigo-600 capitalize truncate">{analytics.dominantMood}</p>
            <p className="text-[10px] text-indigo-700/80 font-medium">Leading mindset</p>
          </div>
        </div>

        {/* AI Weekly Synthesis Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-linear-to-r from-indigo-900 to-slate-900 text-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <span>Gemini Synthesis Summary</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            {analytics.weeklySynthesis}
          </p>
        </div>

        {/* Mood Distribution Breakdown */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Emotional Spectrum Distribution</h3>

          <div className="space-y-3">
            {(Object.keys(analytics.moodDistribution) as MoodType[]).map((mood) => {
              const count = analytics.moodDistribution[mood];
              const config = MOOD_EMOJIS[mood];
              const percentage = Math.round((count / Math.max(analytics.totalSessions, 1)) * 100);
              const barWidth = (count / maxDistributionCount) * 100;

              return (
                <div key={mood} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{config.label}</span>
                    <span className="text-slate-500 text-[11px]">
                      {count} session{count === 1 ? '' : 's'} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full ${config.barColor} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7-Day Reflection Cadence */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">7-Day Reflection Activity</h3>
          <div className="grid grid-cols-7 gap-2 text-center pt-2">
            {analytics.recentCadence.map((day, idx) => (
              <div
                key={idx}
                className={`p-2 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  day.count > 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-slate-50/70 border-slate-200/60 text-slate-500'
                }`}
              >
                <span className="text-[10px] font-semibold text-slate-600 uppercase">{day.dayName}</span>
                <span className="text-sm font-bold">{day.count}</span>
                <span className="text-[9px] text-slate-500">{day.count > 0 ? day.mood : '-'}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

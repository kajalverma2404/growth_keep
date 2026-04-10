import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, TrendingUp, AlertCircle, X, ChevronRight, Activity, Zap, RefreshCw } from 'lucide-react';
import { AnalysisResponse } from '../../types';

interface InsightDisplayProps {
  analysis: AnalysisResponse | null;
  isAnalyzing: boolean;
  setAnalysis: (analysis: any) => void;
  t: (key: string) => string;
}

const InsightDisplay: React.FC<InsightDisplayProps> = ({
  analysis,
  isAnalyzing,
  setAnalysis,
  t
}) => {
  if (isAnalyzing) {
    return (
      <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-4 animate-pulse mb-8">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <Brain className="w-8 h-8 text-indigo-600 animate-bounce" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-900">AI is analyzing your growth...</h3>
          <p className="text-indigo-600 text-sm">Identifying patterns and behavioral insights</p>
        </div>
      </div>
    );
  }

  if (!analysis?.daily_insight) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-2 border-indigo-100 shadow-xl shadow-indigo-100/20 overflow-hidden mb-8"
    >
      <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-wider">AI Behavioral Insight</span>
        </div>
        <button 
          onClick={() => setAnalysis(null)}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Summary Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Daily Insight</h3>
          </div>
          <p className="text-slate-600 leading-relaxed text-lg italic">
            "{analysis.daily_insight.mood_summary || 'No summary available'}"
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Activities */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-slate-900">Key Activities</h4>
            </div>
            <ul className="space-y-3">
              {analysis.daily_insight.key_activities?.map((activity, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  {activity}
                </li>
              )) || <li className="text-sm text-slate-400 italic">No activities identified</li>}
            </ul>
          </div>

          {/* Emotional Tone */}
          <div className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-slate-900">Emotional Tone</h4>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-700 font-medium">
                {analysis.daily_insight.emotional_tone || 'Neutral'}
              </p>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Effort: {analysis.daily_insight.effort_level || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        {analysis.scores && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h4 className="font-bold text-slate-900">Growth Metrics</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(analysis.scores).map(([key, value]) => (
                <div key={key} className="bg-white border border-slate-100 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-black text-slate-900 mb-1">{value}/100</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{key.replace(/_/g, ' ')}</div>
                  <div className="mt-2 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-1000" 
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Nugget */}
        <div className="bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Brain className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Growth Nugget</span>
            </div>
            <p className="text-lg font-medium leading-relaxed">
              {analysis.daily_insight.growth_nugget || 'Keep growing!'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InsightDisplay;

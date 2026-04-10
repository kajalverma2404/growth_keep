import React from 'react';
import { Mic, MicOff, Save, Loader2, Sparkles, Brain, Bell, Archive, Clock, Edit3, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface JournalEditorProps {
  inputData: string;
  setInputData: (data: string) => void;
  interimTranscript?: string;
  isRecording: boolean;
  handleVoiceInput: () => void;
  saveEntry: (data: string, shouldClose?: boolean) => void;
  analyzeData: (data: string) => void;
  isSaving: boolean;
  isAnalyzing: boolean;
  isInputExpanded: boolean;
  setIsInputExpanded: (expanded: boolean) => void;
  mood: string | null;
  setMood: (mood: string | null) => void;
  onNewNote?: () => void;
  t: (key: string) => string;
}

const JournalEditor: React.FC<JournalEditorProps> = ({
  inputData,
  setInputData,
  interimTranscript,
  isRecording,
  handleVoiceInput,
  saveEntry,
  analyzeData,
  isSaving,
  isAnalyzing,
  isInputExpanded,
  setIsInputExpanded,
  mood,
  setMood,
  onNewNote,
  t
}) => {
  const moods = [
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '😔', label: 'Sad', value: 'sad' },
    { emoji: '😠', label: 'Angry', value: 'angry' },
    { emoji: '😴', label: 'Tired', value: 'tired' },
    { emoji: '🧘', label: 'Calm', value: 'calm' },
    { emoji: '⚡', label: 'Energetic', value: 'energetic' },
    { emoji: '🤯', label: 'Stressed', value: 'stressed' },
  ];

  if (!isInputExpanded) {
    return (
      <div className="flex gap-2 sm:gap-4 mb-8">
        <div 
          className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:shadow-md transition-all"
          onClick={() => {
            if (onNewNote) {
              onNewNote();
            } else {
              setIsInputExpanded(true);
            }
          }}
        >
          <span className="text-slate-400 text-base sm:text-lg font-medium truncate">How are you feeling today?</span>
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <Edit3 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onNewNote) onNewNote();
            setIsInputExpanded(true);
            handleVoiceInput();
          }}
          className={`px-4 sm:px-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all hover:shadow-md shrink-0 ${
            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-indigo-600'
          }`}
          title="Start Voice Journaling"
        >
          {isRecording ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">Voice</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
      <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('new_entry')}</span>
        </div>
        {!isInputExpanded && (
          <button 
            onClick={() => setIsInputExpanded(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Expand Editor
          </button>
        )}
      </div>
      
      <div className="p-6">
        <textarea
          placeholder="How are you feeling today?"
          className={`w-full border-none focus:ring-0 text-slate-700 placeholder-slate-400 resize-none text-lg transition-all duration-300 ${isInputExpanded ? 'min-h-[120px]' : 'min-h-[60px]'}`}
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          onFocus={() => setIsInputExpanded(true)}
        />
        
        {isRecording && interimTranscript && (
          <div className="px-1 py-2 text-slate-400 italic text-sm animate-pulse">
            {interimTranscript}...
          </div>
        )}
        
        {isInputExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t border-slate-100"
          >
            {/* Mood Selector */}
            <div className="mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Current Vibe</span>
              <div className="flex flex-wrap gap-2">
                {moods.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMood(mood === m.value ? null : m.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                      mood === m.value 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex gap-1 justify-center sm:justify-start">
                <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><Bell className="w-5 h-5" /></button>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleVoiceInput}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      isRecording 
                        ? "bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                        : "hover:bg-slate-100 text-slate-500"
                    }`}
                    title={isRecording ? "Stop Recording" : "Start Voice Input"}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  {isRecording && (
                    <span className="text-[10px] font-bold text-red-500 animate-pulse uppercase tracking-wider">
                      Recording...
                    </span>
                  )}
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><Archive className="w-5 h-5" /></button>
                <button 
                  onClick={() => analyzeData(inputData)}
                  disabled={isAnalyzing}
                  className="p-2 hover:bg-slate-100 rounded-full text-indigo-600 disabled:opacity-50"
                  title="Analyze with AI"
                >
                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-end">
                {isSaving && (
                  <span className="text-[10px] text-slate-400 animate-pulse flex items-center gap-1 mr-2 w-full sm:w-auto justify-center sm:justify-start">
                    <Clock className="w-3 h-3" />
                    Saving...
                  </span>
                )}
                <button 
                  onClick={() => saveEntry(inputData, true)}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => saveEntry(inputData)}
                  disabled={isSaving || !inputData.trim()}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('save')}
                </button>
                <button 
                  onClick={() => analyzeData(inputData)}
                  disabled={isAnalyzing || isSaving || !inputData.trim()}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI Insight
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-right italic">
              AI Insights are generated only when you request them.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default JournalEditor;

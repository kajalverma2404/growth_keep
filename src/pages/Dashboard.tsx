import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Brain, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Target, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  History,
  Activity,
  UserCircle,
  Trash2,
  Save,
  FileText,
  Plus,
  Menu,
  Search,
  Settings,
  Grid,
  Layout,
  Archive,
  Bell,
  Edit3,
  X,
  Maximize2,
  Mic,
  Send,
  MessageSquare,
  LineChart as LineChartIcon,
  CheckSquare,
  Clock,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { AnalysisResponse, Habit, Reminder, Score, CoachMessage } from '../types';
import { useAuth } from '../components/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { generateContentWithRetry } from '../utils/aiUtils';
import { apiFetch } from '../utils/api';
import { debounce } from '../utils/debounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import JournalEditor from '../components/dashboard/JournalEditor';
import InsightDisplay from '../components/dashboard/InsightDisplay';
import NotesGrid from '../components/dashboard/NotesGrid';
import HabitTracker from '../components/dashboard/HabitTracker';
import ReminderList from '../components/dashboard/ReminderList';
import VisionBoard from '../components/dashboard/VisionBoard';
import Affirmations from '../components/dashboard/Affirmations';
import Resources from '../components/dashboard/Resources';
import GrowthTree from '../components/dashboard/GrowthTree';
import DataExport from '../components/dashboard/DataExport';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const SYSTEM_INSTRUCTION = `You are an advanced behavioral scientist, emotional intelligence analyst, and long-term human growth strategist.
The user provides date-wise journal entries. The entries:
- May be free-form text.
- May come from voice-to-text transcription.
- May be written in any language (Hindi, English, Hinglish, or regional languages).
- May include emotional expressions, daily tasks, reflections, or random thoughts.
- Do NOT assume predefined categories like gym, study, work unless explicitly mentioned.

IMPORTANT LANGUAGE INSTRUCTION:
1. Detect the user's original language.
2. If not English, internally translate to English for analysis.
3. Perform full analysis in English.
4. Return final structured output in the user's original language.
5. Preserve emotional tone from voice-transcribed text.

ANALYSIS RESPONSIBILITIES:
- Extract tasks or meaningful activities.
- Detect emotional tone and mood shifts.
- Identify consistency patterns.
- Estimate effort level.
- Detect dominant life domains (home, career, health, family, personal growth etc.) ONLY if visible in data.
- Calculate completion tendency (if planned vs done is mentioned).
- Detect burnout signals.
- Identify identity patterns forming over time.
- Provide a Daily Insight for the most recent entry if only one is provided, or a summary of the current day.

SCORING METRICS (Internally calculate before analysis):
- Consistency (0-100)
- Emotional Stability (0-100)
- Productivity (0-100)
- Life Balance (0-100)
Use these scores naturally in explanation.

Tone must be:
- Emotionally intelligent
- Supportive
- Analytical
- Non-judgmental
- Deep but not overwhelming
- Never generic`;

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<keyof AnalysisResponse | 'notes' | 'reminders' | 'habits' | 'coach' | 'trends' | 'trash' | 'archive' | 'insight_history' | 'goals' | 'affirmations' | 'resources' | 'growth_tree' | 'export'>('notes');
  const [inputData, setInputData] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState('');

  // Queries
  const { data: savedEntries = [], isLoading: isEntriesLoading } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      const response = await apiFetch('/api/journal');
      return response.json();
    }
  });

  const { data: habits = [], isLoading: isHabitsLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const response = await apiFetch('/api/habits');
      return response.json();
    }
  });

  const { data: reminders = [], isLoading: isRemindersLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await apiFetch('/api/reminders');
      return response.json();
    }
  });

  const { data: scores = [], isLoading: isScoresLoading } = useQuery({
    queryKey: ['scores'],
    queryFn: async () => {
      const response = await apiFetch('/api/scores/trends');
      return response.json();
    }
  });

  const { data: dailyInsight, isLoading: isDailyInsightLoading } = useQuery<AnalysisResponse | null>({
    queryKey: ['dailyInsight'],
    queryFn: async () => {
      const response = await apiFetch('/api/insights/latest');
      if (response.status === 404) return null;
      const data = await response.json();
      console.log('[FRONTEND] Latest insights query result:', data);
      if (!data || Object.keys(data).length === 0) return null;
      return data as AnalysisResponse;
    }
  });

  const { data: trashEntries = [], refetch: refetchTrash } = useQuery({
    queryKey: ['trash'],
    queryFn: async () => {
      const response = await apiFetch('/api/journal/trash');
      return response.json();
    },
    enabled: activeSection === 'trash'
  });

  const { data: archivedEntries = [], refetch: refetchArchive } = useQuery({
    queryKey: ['archive'],
    queryFn: async () => {
      const response = await apiFetch('/api/journal/archived');
      return response.json();
    },
    enabled: activeSection === 'archive'
  });

  const { data: insightHistory = [] } = useQuery({
    queryKey: ['insightHistory'],
    queryFn: async () => {
      const response = await apiFetch('/api/insights/history');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: activeSection === 'insight_history'
  });
  const contentChangedRef = useRef(false);
  const handleAutoSaveRef = useRef<() => Promise<void>>(async () => {});

  const handleAutoSave = useCallback(async () => {
    if (!inputData.trim() || inputData === lastSavedContent) return;
    setIsSaving(true);
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      const response = await apiFetch('/api/journal/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: currentEntryId,
          content: inputData,
          date: localDate
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          setCurrentEntryId(data.id);
          setLastSavedContent(inputData);
          queryClient.invalidateQueries({ queryKey: ['entries'] });
        }
      }
    } catch (err) {
      console.error('Failed to auto-save entry:', err);
    } finally {
      setIsSaving(false);
    }
  }, [inputData, currentEntryId, lastSavedContent, queryClient]);

  useEffect(() => {
    handleAutoSaveRef.current = handleAutoSave;
  }, [handleAutoSave]);

  // New features state
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachInput, setCoachInput] = useState('');
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const languageMap: Record<string, string> = {
    'English': 'en-US',
    'Hindi': 'hi-IN',
    'Spanish': 'es-ES',
    'French': 'fr-FR',
    'German': 'de-DE',
    'Japanese': 'ja-JP',
    'Chinese': 'zh-CN'
  };

  useEffect(() => {
    // Stop recording if user switches sections
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [activeSection, isRecording]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const [isApiKeySelected, setIsApiKeySelected] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        setIsApiKeySelected(true);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if ((!isInputExpanded || activeSection !== 'notes') && isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isInputExpanded, isRecording, activeSection]);

  const isInitialLoading = isEntriesLoading || isHabitsLoading || isRemindersLoading || isScoresLoading || isDailyInsightLoading;

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsApiKeySelected(true);
    }
  };

  useEffect(() => {
    if (inputData !== lastSavedContent) {
      contentChangedRef.current = true;
    }
  }, [inputData, lastSavedContent]);

  // Auto-save effect - debounced save when content changes
  const debouncedAutoSave = useMemo(
    () => debounce(async () => {
      if (contentChangedRef.current && !isAnalyzing) {
        await handleAutoSaveRef.current();
        contentChangedRef.current = false;
      }
    }, 3000),
    [isAnalyzing]
  );

  useEffect(() => {
    if (contentChangedRef.current) {
      debouncedAutoSave();
    }
  }, [inputData, debouncedAutoSave]);

  // Save on page leave/tab close
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && contentChangedRef.current) {
        handleAutoSaveRef.current();
        contentChangedRef.current = false;
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (contentChangedRef.current) {
        handleAutoSaveRef.current();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [inputData, currentEntryId]);

  // Daily Insight generation trigger removed as per requirement
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Mutations
  const saveEntryMutation = useMutation({
    mutationFn: async (content: string) => {
      const localDate = new Date().toLocaleDateString('en-CA');
      const response = await apiFetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          id: currentEntryId, 
          date: localDate,
          mood: mood 
        }),
      });
      
      if (response.status === 409) {
        const data = await response.json();
        setToast({ message: t('entry_already_exists') || 'Entry already exists', type: 'error' });
        return data;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save entry');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentEntryId(data.id);
      setLastSavedContent(inputData);
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      setToast({ message: t('entry_saved'), type: 'success' });
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/journal/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setToast({ message: 'Entry moved to trash', type: 'success' });
    }
  });

  const archiveEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/journal/${id}/archive`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['archive'] });
      setToast({ message: 'Entry archived', type: 'success' });
    }
  });

  const restoreEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/journal/${id}/restore`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['archive'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setToast({ message: 'Entry restored', type: 'success' });
    }
  });

  const addHabitMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiFetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: number }) => {
      await apiFetch(`/api/habits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/habits/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  const addReminderMutation = useMutation({
    mutationFn: async ({ title, time }: { title: string, time: string }) => {
      await apiFetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, time }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const toggleReminderMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number, completed: boolean }) => {
      await apiFetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/reminders/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const saveEntry = (content: string, shouldClose = false) => {
    if (shouldClose && isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (!content.trim()) {
      if (shouldClose) {
        setIsInputExpanded(false);
        setInputData('');
        setMood(null);
        setCurrentEntryId(null);
      }
      return;
    }
    setIsSaving(true);
    saveEntryMutation.mutate(content, {
      onSuccess: () => {
        if (shouldClose) {
          setIsInputExpanded(false);
          setInputData('');
          setMood(null);
          setCurrentEntryId(null);
        }
      },
      onSettled: () => setIsSaving(false)
    });
  };

  const deleteEntry = (id: number) => {
    deleteEntryMutation.mutate(id);
  };

  const archiveEntry = (id: number) => {
    archiveEntryMutation.mutate(id);
  };

  const restoreArchivedEntry = (id: number) => {
    restoreEntryMutation.mutate(id);
  };

  const restoreEntry = (id: number) => {
    restoreEntryMutation.mutate(id);
  };

  const emptyTrash = async () => {
    try {
      await apiFetch('/api/journal/trash/empty', { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setToast({ message: 'Trash emptied', type: 'success' });
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  const generateAggregatedInsight = async (type: string, force = false) => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey && window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setToast({ message: 'Please select an API key in the top bar to enable AI features.', type: 'error' });
        // If the user removed the button, we might need to show it again or prompt them
        return;
      }
    }

    const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      // Check AI limit first
      const limitRes = await apiFetch('/api/insights/check-limit');
      if (limitRes.status === 429) {
        const errorData = await limitRes.json();
        setToast({ message: errorData.error || 'AI limit reached', type: 'error' });
        setIsAnalyzing(false);
        return;
      }

      const localDate = new Date().toLocaleDateString('en-CA');
      const response = await apiFetch(`/api/insights/${type}?date=${localDate}${force ? '&force=true' : ''}`);
      
      if (response.status === 429) {
        const errorData = await response.json();
        setToast({ message: errorData.error || 'AI limit reached', type: 'error' });
        setIsAnalyzing(false);
        return;
      }

      if (!response.ok) throw new Error(`Failed to fetch data for ${type} insight`);
      
      const data = await response.json();
      console.log(`[FRONTEND] Data received for ${type}:`, data);
      
      if (data.insight && !force) {
        if (type === 'daily_insight') {
          queryClient.setQueryData(['dailyInsight'], { daily_insight: data.insight } as AnalysisResponse);
        } else {
          setAnalysis({ [type]: data.insight } as AnalysisResponse);
        }
        setIsAnalyzing(false);
        return;
      }

      const combinedContent = data.combinedContent;
      if (!combinedContent || data.entriesCount === 0) {
        setToast({ message: `No journals found for this ${type.replace(/_/g, ' ')} to analyze.`, type: 'error' });
        setIsAnalyzing(false);
        return;
      }
      
      console.log(`[ANALYSIS] Generating ${type} aggregated insight...`);
      
      let historyText = '';
      let previousInsightsText = '';
      if (type === 'daily_insight') {
        try {
          const historyResponse = await apiFetch('/api/insights/history');
          const history = await historyResponse.json();
          if (Array.isArray(history)) {
            historyText = history.slice(0, 10).map((h: any) => {
              try {
                const insight = typeof h.insight === 'string' ? JSON.parse(h.insight) : h.insight;
                return `[${new Date(h.created_at).toLocaleDateString()}] ${insight.mood_summary || insight.daily_insight?.mood_summary || 'No summary'}`;
              } catch (e) {
                return '';
              }
            }).filter(Boolean).join('\n');
          }

          const latestResponse = await apiFetch('/api/insights/latest');
          const latest = await latestResponse.json();
          if (latest && Object.keys(latest).length > 0) {
            previousInsightsText = Object.entries(latest).map(([t, insight]: [string, any]) => {
              return `PREVIOUS ${t.toUpperCase()}:\n${JSON.stringify(insight, null, 2)}`;
            }).join('\n\n');
          }
        } catch (e) {
          console.warn('Failed to fetch context:', e);
        }
      }

      let prompt = `Analyze all journal entries from this ${type.replace(/_/g, ' ')} to provide a comprehensive summary and insight. This is an aggregation of ${data.entriesCount} entries.\n\nENTRIES:\n${combinedContent}`;
      if (historyText) {
        prompt += `\n\nRECENT HISTORY CONTEXT:\n${historyText}`;
      }
      if (previousInsightsText) {
        prompt += `\n\nPREVIOUS INSIGHTS (Update these based on the new entries to show progress or shifts):\n${previousInsightsText}`;
      }

      let schema: any = {
        type: Type.OBJECT,
        properties: {},
        required: [type]
      };

      if (type === 'daily_insight') {
        schema.properties = {
          daily_insight: {
            type: Type.OBJECT,
            properties: {
              mood_summary: { type: Type.STRING },
              key_activities: { type: Type.ARRAY, items: { type: Type.STRING } },
              emotional_tone: { type: Type.STRING },
              effort_level: { type: Type.STRING },
              growth_nugget: { type: Type.STRING }
            },
            required: ["mood_summary", "key_activities", "emotional_tone", "effort_level", "growth_nugget"]
          },
          weekly_review: {
            type: Type.OBJECT,
            properties: {
              effort_consistency_summary: { type: Type.STRING },
              emotional_trend_summary: { type: Type.STRING },
              observed_strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              areas_needing_attention: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["effort_consistency_summary", "emotional_trend_summary", "observed_strengths", "areas_needing_attention", "improvement_suggestions"]
          },
          monthly_review: {
            type: Type.OBJECT,
            properties: {
              productivity_pattern_analysis: { type: Type.STRING },
              emotional_stability_pattern: { type: Type.STRING },
              dominant_life_focus_area: { type: Type.STRING },
              most_neglected_area: { type: Type.STRING },
              top_strengths_developed: { type: Type.ARRAY, items: { type: Type.STRING } },
              top_growth_gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
              monthly_performance_score: { type: Type.STRING }
            },
            required: ["productivity_pattern_analysis", "emotional_stability_pattern", "dominant_life_focus_area", "most_neglected_area", "top_strengths_developed", "top_growth_gaps", "monthly_performance_score"]
          },
          three_month_analysis: {
            type: Type.OBJECT,
            properties: {
              behavioral_evolution: { type: Type.STRING },
              discipline_growth_trend: { type: Type.STRING },
              emotional_maturity_shift: { type: Type.STRING },
              burnout_risk_detection: { type: Type.STRING },
              estimated_growth_percentage: { type: Type.STRING },
              strategic_improvement_roadmap: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["behavioral_evolution", "discipline_growth_trend", "emotional_maturity_shift", "burnout_risk_detection", "estimated_growth_percentage", "strategic_improvement_roadmap"]
          },
          six_month_review: {
            type: Type.OBJECT,
            properties: {
              identity_transformation_summary: { type: Type.STRING },
              most_consistent_behavior: { type: Type.STRING },
              most_unstable_pattern: { type: Type.STRING },
              life_balance_evaluation: { type: Type.STRING },
              sustainability_score: { type: Type.STRING }
            },
            required: ["identity_transformation_summary", "most_consistent_behavior", "most_unstable_pattern", "life_balance_evaluation", "sustainability_score"]
          },
          annual_reflection: {
            type: Type.OBJECT,
            properties: {
              overall_life_balance_summary: { type: Type.STRING },
              strongest_growth_area: { type: Type.STRING },
              most_neglected_life_area: { type: Type.STRING },
              emotional_journey_narrative: { type: Type.STRING },
              personality_insights: { type: Type.ARRAY, items: { type: Type.STRING } },
              closing_message: { type: Type.STRING }
            },
            required: ["overall_life_balance_summary", "strongest_growth_area", "most_neglected_life_area", "emotional_journey_narrative", "personality_insights", "closing_message"]
          }
        };
        schema.required = ["daily_insight", "weekly_review", "monthly_review", "three_month_analysis", "six_month_review", "annual_reflection"];
      } else if (type === 'weekly_review') {
        schema.properties.weekly_review = {
          type: Type.OBJECT,
          properties: {
            effort_consistency_summary: { type: Type.STRING },
            emotional_trend_summary: { type: Type.STRING },
            observed_strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            areas_needing_attention: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["effort_consistency_summary", "emotional_trend_summary", "observed_strengths", "areas_needing_attention", "improvement_suggestions"]
        };
      } else if (type === 'monthly_review') {
        schema.properties.monthly_review = {
          type: Type.OBJECT,
          properties: {
            productivity_pattern_analysis: { type: Type.STRING },
            emotional_stability_pattern: { type: Type.STRING },
            dominant_life_focus_area: { type: Type.STRING },
            most_neglected_area: { type: Type.STRING },
            top_strengths_developed: { type: Type.ARRAY, items: { type: Type.STRING } },
            top_growth_gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            monthly_performance_score: { type: Type.STRING }
          },
          required: ["productivity_pattern_analysis", "emotional_stability_pattern", "dominant_life_focus_area", "most_neglected_area", "top_strengths_developed", "top_growth_gaps", "monthly_performance_score"]
        };
      } else if (type === 'three_month_analysis') {
        schema.properties.three_month_analysis = {
          type: Type.OBJECT,
          properties: {
            behavioral_evolution: { type: Type.STRING },
            discipline_growth_trend: { type: Type.STRING },
            emotional_maturity_shift: { type: Type.STRING },
            burnout_risk_detection: { type: Type.STRING },
            estimated_growth_percentage: { type: Type.STRING },
            strategic_improvement_roadmap: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["behavioral_evolution", "discipline_growth_trend", "emotional_maturity_shift", "burnout_risk_detection", "estimated_growth_percentage", "strategic_improvement_roadmap"]
        };
      } else if (type === 'six_month_review') {
        schema.properties.six_month_review = {
          type: Type.OBJECT,
          properties: {
            identity_transformation_summary: { type: Type.STRING },
            most_consistent_behavior: { type: Type.STRING },
            most_unstable_pattern: { type: Type.STRING },
            life_balance_evaluation: { type: Type.STRING },
            sustainability_score: { type: Type.STRING }
          },
          required: ["identity_transformation_summary", "most_consistent_behavior", "most_unstable_pattern", "life_balance_evaluation", "sustainability_score"]
        };
      } else if (type === 'annual_reflection') {
        schema.properties.annual_reflection = {
          type: Type.OBJECT,
          properties: {
            overall_life_balance_summary: { type: Type.STRING },
            strongest_growth_area: { type: Type.STRING },
            most_neglected_life_area: { type: Type.STRING },
            emotional_journey_narrative: { type: Type.STRING },
            personality_insights: { type: Type.ARRAY, items: { type: Type.STRING } },
            closing_message: { type: Type.STRING }
          },
          required: ["overall_life_balance_summary", "strongest_growth_area", "most_neglected_life_area", "emotional_journey_narrative", "personality_insights", "closing_message"]
        };
      }

      const aiResponse = await generateContentWithRetry(ai, {
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + `\n\nFocus on aggregating the ${type.replace(/_/g, ' ')} themes. Provide a deep analysis of the user's journey over this period.` + 
          (type === 'daily_insight' ? `\n\nIMPORTANT: Since this is a daily_insight request, you MUST ALSO generate updated versions of weekly_review, monthly_review, three_month_analysis, six_month_review, and annual_reflection. Use the provided PREVIOUS INSIGHTS and the new ENTRIES to show how the user's patterns are evolving. Return ALL of them in the JSON response.` : ''),
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const result = JSON.parse(aiResponse.text || '{}');
      
      await apiFetch(`/api/insights/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insight: result }),
      });

      // Always merge new analysis results with the existing local state
      setAnalysis(prev => ({ ...(prev || {}), ...result }));

      if (type === 'daily_insight') {
        queryClient.invalidateQueries({ queryKey: ['dailyInsight'] });
      }
      
      queryClient.invalidateQueries({ queryKey: ['insightHistory'] });
      setToast({ message: `${type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1)} generated!`, type: 'success' });
    } catch (err) {
      console.error(`Failed to generate ${type}:`, err);
      setToast({ message: 'Failed to generate insight. Please try again.', type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVoiceInput = () => {
    if (!window.navigator.onLine) {
      setToast({ message: 'You are offline. Speech recognition requires an internet connection.', type: 'error' });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageMap[language] || 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      let errorMessage = 'Speech recognition failed.';
      if (event.error === 'network') {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access denied. Please check your browser permissions.';
      } else if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try again.';
      }
      
      setToast({ message: errorMessage, type: 'error' });
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      setInterimTranscript(interim);
      
      if (final) {
        setInputData(prev => {
          const newContent = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + final;
          return newContent;
        });
        setIsInputExpanded(true);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleCoachChat = async () => {
    if (!coachInput.trim()) return;
    if (!isApiKeySelected && window.aistudio) {
      setCoachMessages(prev => [...prev, { role: 'model', text: "Please select an API key in the top bar to enable the AI Coach." }]);
      return;
    }
    const userMsg = coachInput;
    setCoachInput('');
    
    // Check AI limit first
    try {
      const limitRes = await apiFetch('/api/insights/check-limit');
      if (limitRes.status === 429) {
        const errorData = await limitRes.json();
        setCoachMessages(prev => [...prev, { role: 'user', text: userMsg }, { role: 'model', text: errorData.error || 'AI limit reached' }]);
        return;
      }
    } catch (err) {
      console.warn('Limit check failed, proceeding anyway:', err);
    }

    setCoachMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsCoachTyping(true);

    try {
      const historyRes = await apiFetch('/api/journal');
      const historyData = await historyRes.json();
      
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `Context: Here are my recent journal entries and growth scores: ${JSON.stringify(historyData)}. Question: ${userMsg}` }] }
        ],
        config: {
          systemInstruction: `You are a Growth Coach. Use the provided journal history to answer the user's questions about their progress, patterns, and growth. Be supportive, analytical, and concise. IMPORTANT: The user's preferred language is ${language}. Please respond entirely in ${language}.`
        }
      });

      setCoachMessages(prev => [...prev, { role: 'model', text: response.text || "I'm sorry, I couldn't process that." }]);
      
      // Increment AI usage for coach
      await apiFetch('/api/insights/increment-usage', { method: 'POST' });
    } catch (err: any) {
      console.error('Coach chat failed:', err);
      const errorStr = (err.message || JSON.stringify(err)).toLowerCase();
      if (errorStr.includes('503') || errorStr.includes('high demand') || errorStr.includes('unavailable')) {
        setCoachMessages(prev => [...prev, { role: 'model', text: "The AI service is currently very busy. I tried several times to reach it, but it's still overloaded. Please try again in a minute." }]);
      } else {
        setCoachMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please check your connection or try again later." }]);
      }
    } finally {
      setIsCoachTyping(false);
    }
  };

  const permanentlyDeleteEntry = async (id: number) => {
    console.log(`[FRONTEND] Requesting permanent delete for ID: ${id}`);
    try {
      const response = await apiFetch(`/api/journal/${id}/permanent`, { 
        method: 'DELETE', 
      });
      console.log(`[FRONTEND] Response status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[FRONTEND] Permanent delete response data:`, data);
        if (data.deletedCount === 0) {
          setToast({ message: 'Entry not found or already deleted', type: 'error' });
        } else {
          setToast({ message: 'Entry permanently deleted', type: 'success' });
        }
        queryClient.invalidateQueries({ queryKey: ['trash'] });
      } else {
        const errorData = await response.json();
        console.error(`[FRONTEND] Error data:`, errorData);
        setToast({ message: errorData.error || 'Failed to delete permanently', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to permanently delete entry:', err);
      setToast({ message: 'Failed to delete permanently', type: 'error' });
    }
  };

  const startNewEntry = () => {
    // Reset state immediately
    contentChangedRef.current = false;
    setInputData('');
    setMood(null);
    setLastSavedContent('');
    setAnalysis(null);
    setError(null);
    setCurrentEntryId(null);
    setIsInputExpanded(true);
    setActiveSection('notes');
  };

  const analyzeData = async (content: string, entryIdOverride?: number) => {
    if (!content.trim()) {
      setError('Please provide some journal entries to analyze.');
      return;
    }

    if (!isApiKeySelected && window.aistudio) {
      setError('Please select an API key to enable AI analysis.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Check AI limit first
      const limitRes = await apiFetch('/api/insights/check-limit');
      if (limitRes.status === 429) {
        const errorData = await limitRes.json();
        setToast({ message: errorData.error || 'AI limit reached', type: 'error' });
        setIsAnalyzing(false);
        return;
      }
    } catch (err) {
      console.warn('Limit check failed, proceeding anyway:', err);
    }

    console.log('[ANALYSIS] Starting analysis for content length:', content.length);
    setActiveSection('daily_insight');

    let entryId = entryIdOverride || currentEntryId;
    
    try {
      if (!entryId) {
        // Create entry first if it doesn't exist (e.g. user started typing but autosave hasn't fired)
        const localDate = new Date().toLocaleDateString('en-CA');
        const response = await apiFetch('/api/journal/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, date: localDate }),
        });
        if (response.ok) {
          const data = await response.json();
          entryId = data.id;
          setCurrentEntryId(data.id);
          setLastSavedContent(content);
        } else {
          throw new Error("Failed to initialize journal entry for analysis");
        }
      }

      // Check if insight already exists for this entry
      const checkResponse = await apiFetch(`/api/journal/${entryId}/insight`);
      if (checkResponse.ok) {
        const existing = await checkResponse.json();
        if (existing && existing.insight) {
          setAnalysis(JSON.parse(existing.insight));
          setToast({ message: 'Retrieved existing insight', type: 'success' });
          setIsAnalyzing(false);
          return;
        }
      }

      // Update existing entry with latest content before analysis
      await apiFetch(`/api/journal/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setLastSavedContent(content);
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    } catch (err) {
      console.error('[ANALYSIS] Failed to save entry before analysis:', err);
    }

    try {
      // Fetch history for context
      const historyRes = await apiFetch('/api/journal');
      const historyData = await historyRes.json();
      const historyText = historyData.map((e: any) => `[${new Date(e.created_at).toLocaleDateString()}]: ${e.content}`).join('\n\n') || 'No previous history.';

      console.log('[ANALYSIS] Using model: gemini-3-flash-preview');
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3-flash-preview",
        contents: `Analyze the following current journal entry in the context of my recent history.\n\nCURRENT ENTRY:\n${content}\n\nRECENT HISTORY:\n${historyText}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + `\n\nIMPORTANT: The user has selected ${language} as their preferred language. Please ensure all text in the JSON response (mood_summary, growth_nugget, summaries, suggestions, etc.) is written in ${language}. If there is not enough history for weekly/monthly/annual reviews, provide encouraging placeholders based on the current entry's potential.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              daily_insight: {
                type: Type.OBJECT,
                properties: {
                  mood_summary: { type: Type.STRING },
                  key_activities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  emotional_tone: { type: Type.STRING },
                  effort_level: { type: Type.STRING },
                  growth_nugget: { type: Type.STRING }
                },
                required: ["mood_summary", "key_activities", "emotional_tone", "effort_level", "growth_nugget"]
              },
              scores: {
                type: Type.OBJECT,
                properties: {
                  consistency: { type: Type.INTEGER },
                  emotional_stability: { type: Type.INTEGER },
                  productivity: { type: Type.INTEGER },
                  life_balance: { type: Type.INTEGER }
                },
                required: ["consistency", "emotional_stability", "productivity", "life_balance"]
              },
              weekly_review: {
                type: Type.OBJECT,
                properties: {
                  effort_consistency_summary: { type: Type.STRING },
                  emotional_trend_summary: { type: Type.STRING },
                  observed_strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  areas_needing_attention: { type: Type.ARRAY, items: { type: Type.STRING } },
                  improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["effort_consistency_summary", "emotional_trend_summary", "observed_strengths", "areas_needing_attention", "improvement_suggestions"]
              },
              monthly_review: {
                type: Type.OBJECT,
                properties: {
                  productivity_pattern_analysis: { type: Type.STRING },
                  emotional_stability_pattern: { type: Type.STRING },
                  dominant_life_focus_area: { type: Type.STRING },
                  most_neglected_area: { type: Type.STRING },
                  top_strengths_developed: { type: Type.ARRAY, items: { type: Type.STRING } },
                  top_growth_gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  monthly_performance_score: { type: Type.STRING }
                },
                required: ["productivity_pattern_analysis", "emotional_stability_pattern", "dominant_life_focus_area", "most_neglected_area", "top_strengths_developed", "top_growth_gaps", "monthly_performance_score"]
              },
              three_month_analysis: {
                type: Type.OBJECT,
                properties: {
                  behavioral_evolution: { type: Type.STRING },
                  discipline_growth_trend: { type: Type.STRING },
                  emotional_maturity_shift: { type: Type.STRING },
                  burnout_risk_detection: { type: Type.STRING },
                  estimated_growth_percentage: { type: Type.STRING },
                  strategic_improvement_roadmap: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["behavioral_evolution", "discipline_growth_trend", "emotional_maturity_shift", "burnout_risk_detection", "estimated_growth_percentage", "strategic_improvement_roadmap"]
              },
              six_month_review: {
                type: Type.OBJECT,
                properties: {
                  identity_transformation_summary: { type: Type.STRING },
                  most_consistent_behavior: { type: Type.STRING },
                  most_unstable_pattern: { type: Type.STRING },
                  life_balance_evaluation: { type: Type.STRING },
                  sustainability_score: { type: Type.STRING }
                },
                required: ["identity_transformation_summary", "most_consistent_behavior", "most_unstable_pattern", "life_balance_evaluation", "sustainability_score"]
              },
              annual_reflection: {
                type: Type.OBJECT,
                properties: {
                  overall_life_balance_summary: { type: Type.STRING },
                  strongest_growth_area: { type: Type.STRING },
                  most_neglected_life_area: { type: Type.STRING },
                  emotional_journey_narrative: { type: Type.STRING },
                  personality_insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  closing_message: { type: Type.STRING }
                },
                required: ["overall_life_balance_summary", "strongest_growth_area", "most_neglected_life_area", "emotional_journey_narrative", "personality_insights", "closing_message"]
              }
            },
            required: ["daily_insight", "weekly_review", "monthly_review", "three_month_analysis", "six_month_review", "annual_reflection"]
          }
        }
      });

      console.log('[ANALYSIS] AI Response received');
      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
      setToast({ message: 'Analysis complete!', type: 'success' });

      // Save analysis and scores to backend using the new endpoint
      if (entryId) {
        await apiFetch(`/api/journal/${entryId}/insight`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            insight: result,
            scores: result.scores
          }),
        });
        queryClient.invalidateQueries({ queryKey: ['entries'] });
        queryClient.invalidateQueries({ queryKey: ['scores'] });
        queryClient.invalidateQueries({ queryKey: ['insightHistory'] });
      }
    } catch (err: any) {
      console.error('[ANALYSIS] Error:', err);
      const errorStr = (err.message || JSON.stringify(err)).toLowerCase();
      
      if (err.message?.includes('Requested entity was not found')) {
        setIsApiKeySelected(false);
        setError('API Key error. Please re-select your API key.');
      } else if (errorStr.includes('503') || errorStr.includes('high demand') || errorStr.includes('unavailable')) {
        setError('The AI service is currently experiencing high demand. We tried several times, but it is still busy. Please wait a minute and try again.');
      } else {
        setError(`Analysis failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredEntries = savedEntries.filter(e => 
    e.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="bg-yellow-400 p-3 rounded-2xl shadow-lg animate-bounce">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing your growth space...
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <div className="bg-red-50 p-4 rounded-2xl mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const combinedAnalysis = { ...(dailyInsight || {}), ...(analysis || {}) };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-yellow-100">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <Header 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        user={user}
        t={t}
        onNewNote={startNewEntry}
        isApiKeySelected={isApiKeySelected}
        handleOpenKeySelector={handleOpenKeySelector}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          setAnalysis={setAnalysis}
          t={t}
        />

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-64px)] bg-white p-4 sm:p-8">
          {activeSection === 'notes' ? (
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Editor Section */}
              <JournalEditor 
                inputData={inputData}
                setInputData={setInputData}
                interimTranscript={interimTranscript}
                isRecording={isRecording}
                handleVoiceInput={handleVoiceInput}
                saveEntry={saveEntry}
                analyzeData={analyzeData}
                isSaving={isSaving}
                isAnalyzing={isAnalyzing}
                isInputExpanded={isInputExpanded}
                setIsInputExpanded={setIsInputExpanded}
                mood={mood}
                setMood={setMood}
                onNewNote={startNewEntry}
                t={t}
              />

              {/* AI Insight Section */}
              <InsightDisplay 
                analysis={combinedAnalysis}
                isAnalyzing={isAnalyzing}
                setAnalysis={setAnalysis}
                t={t}
              />

              {/* Notes Grid */}
              <NotesGrid 
                entries={filteredEntries}
                onEntryClick={async (entry) => {
                  // Save current entry if it has changes
                  if (contentChangedRef.current && inputData.trim()) {
                    await handleAutoSaveRef.current();
                    contentChangedRef.current = false;
                  }
                  
                  setInputData(entry.content);
                  setCurrentEntryId(entry.id);
                  if (entry.analysis) {
                    try {
                      setAnalysis(JSON.parse(entry.analysis));
                    } catch (e) {
                      setAnalysis(null);
                    }
                  } else {
                    setAnalysis(null);
                  }
                  setIsInputExpanded(true);
                }}
                onAnalyze={(content, id) => analyzeData(content, id)}
                onArchive={(id) => archiveEntryMutation.mutate(id)}
                onDelete={(id) => deleteEntryMutation.mutate(id)}
              />
            </div>
          ) : activeSection === 'goals' ? (
            <VisionBoard t={t} />
          ) : activeSection === 'affirmations' ? (
            <Affirmations t={t} />
          ) : activeSection === 'resources' ? (
            <Resources t={t} />
          ) : activeSection === 'growth_tree' ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
                <h2 className="text-3xl font-bold text-slate-800">Your Growth Tree</h2>
              </div>
              <GrowthTree 
                score={savedEntries.length > 0 ? 75 : 0} 
                entriesCount={savedEntries.length} 
                habitsCount={habits.length} 
              />
            </div>
          ) : activeSection === 'export' ? (
            <DataExport entries={savedEntries} habits={habits} t={t} />
          ) : activeSection === 'insight_history' ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <History className="w-8 h-8 text-indigo-500" />
                <h2 className="text-3xl font-bold text-slate-800">Insight History</h2>
              </div>

              {Array.isArray(insightHistory) && insightHistory.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No insights generated yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(insightHistory) && insightHistory.map((item) => {
                    const insightData = JSON.parse(item.insight);
                    const isDaily = item.type === 'daily';
                    return (
                      <div key={`${item.type}-${item.id}`} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-xs font-bold uppercase tracking-widest ${isDaily ? 'text-amber-600' : 'text-indigo-600'}`}>
                            {isDaily ? 'Daily Aggregation' : 'Entry Insight'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed italic mb-4">
                          "{insightData.daily_insight?.mood_summary || 'No summary available'}"
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {insightData.daily_insight?.key_activities?.slice(0, 3).map((act: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium">
                              {act}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeSection === 'archive' ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Archive className="w-8 h-8 text-slate-400" />
                  <h2 className="text-3xl font-bold text-slate-800">Archive</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => refetchArchive()}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                    title="Refresh Archive"
                  >
                    <History className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-slate-400">{archivedEntries.length} items</span>
                </div>
              </div>

              {archivedEntries.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Archive className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Your archive is empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedEntries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 relative group">
                      <p className="text-slate-600 text-sm line-clamp-4 mb-4">{entry.content}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                          Archived {new Date(entry.archived_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => restoreArchivedEntry(entry.id)}
                            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                            title="Restore to Dashboard"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Move to Trash"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeSection === 'trash' ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-8 h-8 text-slate-400" />
                  <h2 className="text-3xl font-bold text-slate-800">Trash</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => refetchTrash()}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                    title="Refresh Trash"
                  >
                    <History className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={emptyTrash}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Empty Trash
                  </button>
                  <span className="text-sm text-slate-400">{trashEntries.length} items</span>
                </div>
              </div>

              {trashEntries.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Trash2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Your trash is empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trashEntries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 relative group">
                      <p className="text-slate-600 text-sm line-clamp-4 mb-4">{entry.content}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                          Deleted {new Date(entry.deleted_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => restoreArchivedEntry(entry.id)}
                            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              await apiFetch(`/api/journal/${entry.id}/permanent`, { method: 'DELETE' });
                              refetchTrash();
                              setToast({ message: 'Entry permanently deleted', type: 'success' });
                            }}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeSection === 'reminders' ? (
            <ReminderList 
              reminders={reminders}
              onAdd={(title, time) => addReminderMutation.mutate({ title, time })}
              onToggle={(reminder) => toggleReminderMutation.mutate({ id: reminder.id, completed: !reminder.completed })}
              onDelete={(id) => deleteReminderMutation.mutate(id)}
              t={t}
            />
          ) : activeSection === 'habits' ? (
            <HabitTracker 
              habits={habits}
              onAdd={(name) => addHabitMutation.mutate(name)}
              onToggle={(habit) => toggleHabitMutation.mutate({ id: habit.id, status: habit.status === 1 ? 0 : 1 })}
              onDelete={(id) => deleteHabitMutation.mutate(id)}
              t={t}
            />
          ) : activeSection === 'trends' ? (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <LineChartIcon className="w-8 h-8 text-indigo-500" />
                <h2 className="text-3xl font-bold text-slate-800">Growth Trends</h2>
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {scores.length > 0 ? (
              <>
                <Card title="Overall Growth Scores" icon={TrendingUp} color="text-indigo-500" className="lg:col-span-2 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scores}>
                      <defs>
                        <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => {
                          try {
                            return new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } catch (e) {
                            return str;
                          }
                        }}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(str) => new Date(str).toLocaleDateString()}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="consistency" name="Consistency" stroke="#6366f1" fillOpacity={1} fill="url(#colorCons)" strokeWidth={3} />
                      <Area type="monotone" dataKey="emotional_stability" name="Emotional Stability" stroke="#ec4899" fillOpacity={0} strokeWidth={3} />
                      <Area type="monotone" dataKey="productivity" name="Productivity" stroke="#f59e0b" fillOpacity={0} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Productivity vs Stability" icon={Activity} color="text-emerald-500" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scores}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip />
                      <Line type="stepAfter" dataKey="productivity" name="Productivity" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="emotional_stability" name="Stability" stroke="#ec4899" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Life Balance" icon={Target} color="text-amber-500" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scores}>
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="life_balance" name="Balance" stroke="#f59e0b" fill="#fef3c7" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </>
            ) : (
              <div className="lg:col-span-2 bg-slate-50 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-600">No Growth Data Yet</h3>
                <p className="text-slate-400 mt-2 max-w-md mx-auto">
                  Growth trends are powered by AI Insights. 
                  {savedEntries.length < 3 ? (
                    <span className="block mt-2 font-medium text-indigo-600">
                      Write a few more journals to see your growth trends. (Need at least 3 entries)
                    </span>
                  ) : savedEntries.filter(e => !e.analysis).length > 0 ? (
                    <span className="block mt-2 font-medium text-indigo-600">
                      You have {savedEntries.filter(e => !e.analysis).length} journal entries waiting for analysis! 
                      Go to your notes and click "Get AI Insight" on them to see your progress.
                    </span>
                  ) : (
                    "Start journaling and use the 'Get AI Insight' button to generate growth scores and track your evolution over time."
                  )}
                </p>
                <button 
                  onClick={() => setActiveSection('notes')}
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium"
                >
                  {savedEntries.length > 0 ? "View My Notes" : "Write your first entry"}
                </button>
              </div>
            )}
          </div>
            </div>
          ) : activeSection === 'coach' ? (
            <div className="max-w-3xl mx-auto h-[calc(100vh-160px)] flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-8 h-8 text-indigo-600" />
                <h2 className="text-3xl font-bold text-slate-800">AI Growth Coach</h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 p-4 bg-slate-50 rounded-2xl mb-4">
                {coachMessages.length === 0 && (
                  <div className="text-center py-20 text-slate-400">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Ask me anything about your growth history.</p>
                    <p className="text-xs mt-2">"Why was I feeling burnt out last month?"</p>
                  </div>
                )}
                {coachMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isCoachTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-lg flex gap-2">
                <input 
                  type="text"
                  placeholder="Ask your coach..."
                  className="flex-1 border-none focus:ring-0 px-4"
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCoachChat()}
                />
                <button 
                  onClick={handleCoachChat}
                  disabled={isCoachTyping}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
          <div className="max-w-5xl mx-auto">
            {(!combinedAnalysis && ['daily_insight', 'weekly_review', 'monthly_review', 'three_month_analysis', 'six_month_review', 'annual_reflection'].includes(activeSection) && !isAnalyzing) ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-600 capitalize">No {activeSection.replace(/_/g, ' ')} Yet</h3>
                <p className="text-slate-400 mt-2 max-w-md mx-auto">
                  Click the button below to analyze your journal history and generate a comprehensive {activeSection.replace(/_/g, ' ')}.
                </p>
                <button 
                  onClick={() => generateAggregatedInsight(activeSection)}
                  className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate {activeSection.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              </div>
            ) : combinedAnalysis ? (
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-slate-800 capitalize flex items-center gap-3">
                          <Sparkles className="w-6 h-6 text-yellow-500" />
                          {activeSection === 'daily_insight' && !analysis ? 'Latest Daily Insight' : activeSection.toString().replace(/_/g, ' ')}
                        </h2>
                        <p className="text-sm text-slate-500">Deep behavioral insights from your journal entries.</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {['daily_insight', 'weekly_review', 'monthly_review', 'three_month_analysis', 'six_month_review', 'annual_reflection'].includes(activeSection) && (
                          <button 
                            onClick={() => generateAggregatedInsight(activeSection, true)}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl hover:bg-yellow-100 transition-all text-sm font-medium border border-yellow-100 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                            Regenerate
                          </button>
                        )}
                        {activeSection === 'monthly_review' && combinedAnalysis?.monthly_review && (
                          <div className="bg-yellow-400 text-white px-4 py-2 rounded-xl flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 leading-none">Score</span>
                            <span className="text-2xl font-black leading-none">{combinedAnalysis?.monthly_review.monthly_performance_score}</span>
                          </div>
                        )}
                        {activeSection === 'six_month_review' && combinedAnalysis?.six_month_review && (
                          <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 leading-none">Stability</span>
                            <span className="text-2xl font-black leading-none">{combinedAnalysis?.six_month_review.sustainability_score}%</span>
                          </div>
                        )}
                        <button 
                          onClick={() => setActiveSection('notes')}
                          className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeSection === 'daily_insight' && combinedAnalysis?.daily_insight && (
                        <>
                          <Card title="Mood Summary" icon={Brain} color="text-pink-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed italic">"{combinedAnalysis?.daily_insight.mood_summary}"</p>
                          </Card>
                          <Card title="Key Activities" icon={CheckCircle2} color="text-emerald-500">
                            <ul className="space-y-3">
                              {combinedAnalysis?.daily_insight.key_activities?.map((item, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </Card>
                          <Card title="Emotional Tone" icon={Activity} color="text-indigo-500">
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                              <p className="text-indigo-700 font-bold text-lg">{combinedAnalysis?.daily_insight.emotional_tone}</p>
                              <p className="text-[10px] text-indigo-600 uppercase mt-1">Current State</p>
                            </div>
                          </Card>
                          <Card title="Effort Level" icon={TrendingUp} color="text-amber-500">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                              <p className="text-amber-700 font-bold text-lg">{combinedAnalysis?.daily_insight.effort_level}</p>
                              <p className="text-[10px] text-amber-600 uppercase mt-1">Energy Output</p>
                            </div>
                          </Card>
                          <Card title="Growth Nugget" icon={Sparkles} color="text-yellow-500" className="md:col-span-2 bg-yellow-50/50 border-yellow-100">
                            <p className="text-slate-700 font-medium leading-relaxed">{combinedAnalysis?.daily_insight.growth_nugget}</p>
                          </Card>
                        </>
                      )}

                      {activeSection === 'weekly_review' && combinedAnalysis?.weekly_review && (
                        <>
                          <Card title="Effort Consistency" icon={Activity} color="text-indigo-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed">{combinedAnalysis?.weekly_review.effort_consistency_summary}</p>
                          </Card>
                          <Card title="Emotional Trend" icon={Brain} color="text-pink-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed italic">"{combinedAnalysis?.weekly_review.emotional_trend_summary}"</p>
                          </Card>
                          <Card title="Observed Strengths" icon={CheckCircle2} color="text-emerald-500">
                            <ul className="space-y-3">
                              {combinedAnalysis?.weekly_review.observed_strengths?.map((item, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </Card>
                          <Card title="Attention Areas" icon={AlertCircle} color="text-amber-500">
                            <ul className="space-y-3">
                              {combinedAnalysis?.weekly_review.areas_needing_attention?.map((item, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </Card>
                          <Card title="Practical Suggestions" icon={ArrowUpRight} color="text-indigo-600" className="md:col-span-2 bg-slate-50 border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {combinedAnalysis?.weekly_review.improvement_suggestions?.map((step, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                  <span className="text-[10px] font-bold text-indigo-600 uppercase mb-2 block">Step 0{i+1}</span>
                                  <p className="text-xs text-slate-700 font-medium">{step}</p>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </>
                      )}

                      {activeSection === 'monthly_review' && combinedAnalysis?.monthly_review && (
                        <>
                          <Card title="Productivity Pattern" icon={TrendingUp} color="text-indigo-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed">{combinedAnalysis?.monthly_review.productivity_pattern_analysis}</p>
                          </Card>
                          <Card title="Emotional Stability" icon={Activity} color="text-pink-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed">{combinedAnalysis?.monthly_review.emotional_stability_pattern}</p>
                          </Card>
                          <Card title="Dominant Focus" icon={Target} color="text-indigo-500">
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                              <p className="text-indigo-700 font-bold text-lg">{combinedAnalysis?.monthly_review.dominant_life_focus_area}</p>
                              <p className="text-[10px] text-indigo-600 uppercase mt-1">Primary Domain</p>
                            </div>
                          </Card>
                          <Card title="Most Neglected" icon={AlertCircle} color="text-amber-500">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                              <p className="text-amber-700 font-bold text-lg">{combinedAnalysis?.monthly_review.most_neglected_area}</p>
                              <p className="text-[10px] text-amber-600 uppercase mt-1">Needs Attention</p>
                            </div>
                          </Card>
                        </>
                      )}

                      {activeSection === 'three_month_analysis' && combinedAnalysis?.three_month_analysis && (
                        <>
                          <Card title="Behavioral Evolution" icon={BarChart3} color="text-indigo-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed">{combinedAnalysis?.three_month_analysis.behavioral_evolution}</p>
                          </Card>
                          <Card title="Burnout Risk" icon={AlertCircle} color="text-red-500" className="md:col-span-2 border-red-100 bg-red-50/30">
                            <p className="text-slate-600 leading-relaxed">{combinedAnalysis?.three_month_analysis.burnout_risk_detection}</p>
                          </Card>
                          <Card title="Strategic Roadmap" icon={Target} color="text-indigo-600" className="md:col-span-2">
                            <div className="space-y-4">
                              {combinedAnalysis?.three_month_analysis.strategic_improvement_roadmap?.map((item, i) => (
                                <div key={i} className="flex items-start gap-4">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                    {i+1}
                                  </div>
                                  <p className="text-sm text-slate-600 pt-1.5">{item}</p>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </>
                      )}

                      {activeSection === 'six_month_review' && combinedAnalysis?.six_month_review && (
                        <>
                          <Card title="Identity Transformation" icon={UserCircle} color="text-purple-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed italic">"{combinedAnalysis?.six_month_review.identity_transformation_summary}"</p>
                          </Card>
                          <Card title="Consistent Behavior" icon={CheckCircle2} color="text-emerald-500">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                              <p className="text-emerald-700 font-bold text-lg">{combinedAnalysis?.six_month_review.most_consistent_behavior}</p>
                              <p className="text-[10px] text-emerald-600 uppercase mt-1">Anchor Pattern</p>
                            </div>
                          </Card>
                          <Card title="Unstable Pattern" icon={AlertCircle} color="text-amber-500">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                              <p className="text-amber-700 font-bold text-lg">{combinedAnalysis?.six_month_review.most_unstable_pattern}</p>
                              <p className="text-[10px] text-amber-600 uppercase mt-1">Needs Stability</p>
                            </div>
                          </Card>
                        </>
                      )}

                      {activeSection === 'annual_reflection' && combinedAnalysis?.annual_reflection && (
                        <>
                          <Card title="Life Balance Summary" icon={Activity} color="text-indigo-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed">{combinedAnalysis?.annual_reflection.overall_life_balance_summary}</p>
                          </Card>
                          <Card title="Emotional Narrative" icon={Brain} color="text-pink-500" className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed italic">"{combinedAnalysis?.annual_reflection.emotional_journey_narrative}"</p>
                          </Card>
                          <div className="md:col-span-2 bg-slate-900 text-white p-10 rounded-3xl shadow-2xl space-y-4 relative overflow-hidden">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-yellow-400" />
                              A Final Word
                            </h3>
                            <p className="text-slate-300 text-lg leading-relaxed relative z-10 italic">
                              {combinedAnalysis?.annual_reflection.closing_message}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Brain className="w-10 h-10 text-slate-400" />
                  </div>
                  <h2 className="text-xl font-medium text-slate-600">No analysis generated yet</h2>
                  <p className="text-slate-400">Select a note and click the AI icon to start decoding your evolution.</p>
                  <button 
                    onClick={() => setActiveSection('notes')}
                    className="text-yellow-600 font-medium hover:underline"
                  >
                    Go back to notes
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 opacity-30">
            <Brain className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Growth Keep AI</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Powered by Gemini 3.1 Pro. Deep behavioral analysis for long-term human evolution.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Card({ title, icon: Icon, children, color, className = "", titleSize = "text-sm" }: { 
  title: string, 
  icon: any, 
  children: React.ReactNode, 
  color: string, 
  className?: string,
  titleSize?: string
}) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className={`${titleSize} font-bold text-slate-800 uppercase tracking-wider`}>{title}</h3>
      </div>
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}

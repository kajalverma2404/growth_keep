import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Plus, Trash2, Heart, Quote } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { generateContentWithRetry } from '../../utils/aiUtils';

interface AffirmationsProps {
  t?: (key: string) => string;
}

const Affirmations: React.FC<AffirmationsProps> = ({ t }) => {
  const [newAffirmation, setNewAffirmation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: affirmations = [], isLoading } = useQuery({
    queryKey: ['affirmations'],
    queryFn: async () => {
      const response = await apiFetch('/api/affirmations');
      return response.json();
    }
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      const response = await apiFetch('/api/journal');
      return response.json();
    }
  });

  const createAffirmationMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiFetch('/api/affirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affirmations'] });
      setNewAffirmation('');
    }
  });

  const deleteAffirmationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/affirmations/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affirmations'] });
    }
  });

  const generateAffirmation = async () => {
    if (isGenerating) return;
    
    // Check if at least one AI API key is available
    const apiKey = (process as any).env.API_KEY || process.env.GEMINI_API_KEY;
    const openAiKey = (process as any).env.OPENAI_API_KEY;
    if (!apiKey && !openAiKey && (window as any).aistudio) {
      alert('Please select an API key in the top bar to enable AI features.');
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
      const recentContent = entries.slice(0, 3).map((e: any) => e.content).join('\n');

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3-flash-preview",
        contents: `Based on these recent journal entries, generate a powerful, personalized daily affirmation for the user. Keep it short, positive, and in the first person ("I am...").\n\nRecent Journals:\n${recentContent}`,
      });

      const text = response.text?.trim().replace(/^"|"$/g, '') || "I am growing stronger and more resilient every day.";
      createAffirmationMutation.mutate(text);
    } catch (err) {
      console.error('Failed to generate affirmation:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-xl">
            <Sparkles className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Daily Affirmations</h2>
            <p className="text-slate-500">Personalized power statements for your mindset.</p>
          </div>
        </div>
        <button 
          onClick={generateAffirmation}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-white rounded-xl hover:bg-yellow-500 transition-all font-bold shadow-lg shadow-yellow-400/20 disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Generate
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Write your own affirmation..."
            className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-400/20 transition-all font-medium"
            value={newAffirmation}
            onChange={e => setNewAffirmation(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && newAffirmation && createAffirmationMutation.mutate(newAffirmation)}
          />
          <button 
            onClick={() => createAffirmationMutation.mutate(newAffirmation)}
            disabled={!newAffirmation}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {affirmations.map((aff: any) => (
          <motion.div 
            layout
            key={aff.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center"
          >
            <Quote className="w-8 h-8 text-yellow-400/20 mb-4" />
            <p className="text-xl font-bold text-slate-800 italic leading-relaxed">
              "{aff.text}"
            </p>
            <div className="mt-6 flex items-center gap-4">
              <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button 
                onClick={() => deleteAffirmationMutation.mutate(aff.id)}
                className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
        {affirmations.length === 0 && !isLoading && (
          <div className="sm:col-span-2 text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-20" />
            <p className="text-slate-500 font-medium">No affirmations yet.</p>
            <p className="text-slate-400 text-sm mt-1">Generate one with AI or write your own.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Affirmations;

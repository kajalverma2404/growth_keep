import React, { useState } from 'react';
import { Archive, Plus, Trash2, ExternalLink, BookOpen, Video, Headphones, Newspaper, RefreshCw, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface ResourcesProps {
  t?: (key: string) => string;
}

const Resources: React.FC<ResourcesProps> = ({ t }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const response = await apiFetch('/api/resources');
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

  const createResourceMutation = useMutation({
    mutationFn: async (resource: any) => {
      const response = await apiFetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resource),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/resources/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  });

  const generateResources = async () => {
    if (isGenerating) return;
    
    // Check if API key is available
    const apiKey = (process as any).env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey && (window as any).aistudio) {
      alert('Please select an API key in the top bar to enable AI features.');
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
      const recentContent = entries.slice(0, 5).map((e: any) => e.content).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on these recent journal entries, suggest 3 high-quality resources (books, podcasts, or articles) that would help the user grow. Return a JSON array of objects with title, url (real or placeholder), type (book, podcast, article), and description.\n\nRecent Journals:\n${recentContent}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "url", "type", "description"]
            }
          }
        }
      });

      const result = JSON.parse(response.text || '[]');
      for (const res of result) {
        createResourceMutation.mutate(res);
      }
    } catch (err) {
      console.error('Failed to generate resources:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'book': return BookOpen;
      case 'video': return Video;
      case 'podcast': return Headphones;
      case 'article': return Newspaper;
      default: return Archive;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl">
            <Archive className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Resource Library</h2>
            <p className="text-slate-500">Curated growth materials based on your journey.</p>
          </div>
        </div>
        <button 
          onClick={generateResources}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Suggest
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {resources.map((res: any) => {
          const Icon = getIcon(res.type);
          return (
            <motion.div 
              layout
              key={res.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <Icon className="w-6 h-6 text-slate-600" />
                </div>
                <button 
                  onClick={() => deleteResourceMutation.mutate(res.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{res.title}</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1">{res.description}</p>
              <a 
                href={res.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all group-hover:bg-emerald-50 group-hover:text-emerald-600"
              >
                <ExternalLink className="w-4 h-4" />
                Explore Resource
              </a>
            </motion.div>
          );
        })}
        {resources.length === 0 && !isLoading && (
          <div className="sm:col-span-2 text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Archive className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-20" />
            <p className="text-slate-500 font-medium">Your library is empty.</p>
            <p className="text-slate-400 text-sm mt-1">Use AI Suggest to find growth materials tailored to you.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Archive, Trash2 } from 'lucide-react';

interface NoteEntry {
  id: number;
  content: string;
  created_at: string;
  analysis?: string;
}

interface NotesGridProps {
  entries: NoteEntry[];
  onEntryClick: (entry: NoteEntry) => void;
  onAnalyze: (content: string, id: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
}

const NotesGrid: React.FC<NotesGridProps> = ({
  entries,
  onEntryClick,
  onAnalyze,
  onArchive,
  onDelete
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">Your Journal Entries</h3>
        <span className="text-xs text-slate-400 font-medium">{entries.length} notes</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all relative cursor-pointer"
              onClick={() => onEntryClick(entry)}
            >
              <div className="flex flex-col h-full">
                <p className="text-slate-700 text-sm leading-relaxed line-clamp-6 whitespace-pre-wrap mb-6 flex-1">{entry.content}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                </p>
              </div>
              
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze(entry.content, entry.id);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-indigo-500"
                  title="Analyze with AI"
                >
                  <Brain className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(entry.id);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-500"
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500"
                  title="Move to Trash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotesGrid;

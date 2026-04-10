import React, { useState } from 'react';
import { Target, Plus, Trash2, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import { motion, AnimatePresence } from 'motion/react';

interface VisionBoardProps {
  t?: (key: string) => string;
}

const VisionBoard: React.FC<VisionBoardProps> = ({ t }) => {
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target_date: '' });
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await apiFetch('/api/goals');
      return response.json();
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goal: any) => {
      const response = await apiFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setNewGoal({ title: '', description: '', target_date: '' });
      setIsAdding(false);
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const response = await apiFetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <Target className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Vision & Goals</h2>
            <p className="text-slate-500">Define your North Star and track your journey.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8"
          >
            <div className="grid gap-4">
              <input 
                type="text" 
                placeholder="Goal Title (e.g., Run a Marathon)"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                value={newGoal.title}
                onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
              />
              <textarea 
                placeholder="Description & Why this matters..."
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[100px]"
                value={newGoal.description}
                onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
              />
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    value={newGoal.target_date}
                    onChange={e => setNewGoal({ ...newGoal, target_date: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => createGoalMutation.mutate(newGoal)}
                    disabled={!newGoal.title}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    Set Goal
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {goals.map((goal: any) => (
          <motion.div 
            layout
            key={goal.id}
            className={`group bg-white p-6 rounded-2xl border transition-all ${
              goal.status === 'completed' ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              <button 
                onClick={() => updateGoalMutation.mutate({ 
                  id: goal.id, 
                  status: goal.status === 'completed' ? 'pending' : 'completed' 
                })}
                className={`mt-1 transition-colors ${goal.status === 'completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
              >
                {goal.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${goal.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {goal.title}
                </h3>
                {goal.description && (
                  <p className={`mt-2 text-sm ${goal.status === 'completed' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {goal.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-4">
                  {goal.target_date && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      Target: {new Date(goal.target_date).toLocaleDateString()}
                    </div>
                  )}
                  <button 
                    onClick={() => deleteGoalMutation.mutate(goal.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {goals.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-20" />
            <p className="text-slate-500 font-medium">Your vision board is empty.</p>
            <p className="text-slate-400 text-sm mt-1">Start by adding your first long-term goal.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisionBoard;

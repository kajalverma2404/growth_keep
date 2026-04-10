import React from 'react';
import { CheckSquare, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Habit } from '../../types';

interface HabitTrackerProps {
  habits: Habit[];
  onToggle: (habit: Habit) => void;
  onDelete: (id: number) => void;
  onAdd: (title: string) => void;
  t: (key: string) => string;
}

const HabitTracker: React.FC<HabitTrackerProps> = ({
  habits,
  onToggle,
  onDelete,
  onAdd,
  t
}) => {
  const [newHabit, setNewHabit] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabit.trim()) {
      onAdd(newHabit);
      setNewHabit('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <CheckSquare className="w-8 h-8 text-emerald-500" />
        <h2 className="text-3xl font-bold text-slate-800">{t('habits')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="Add a new habit..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!newHabit.trim()}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {habits.map((habit) => (
          <div key={habit.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onToggle(habit)}
                className={`p-1 rounded-full transition-colors ${habit.status === 1 ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
              >
                {habit.status === 1 ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
              <span className={`font-medium ${habit.status === 1 ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {habit.name}
              </span>
            </div>
            <button 
              onClick={() => onDelete(habit.id)}
              className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {habits.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No habits tracked yet. Start building your routine!</p>
        </div>
      )}
    </div>
  );
};

export default HabitTracker;

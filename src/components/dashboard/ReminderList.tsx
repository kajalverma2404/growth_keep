import React from 'react';
import { Bell, Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Reminder } from '../../types';

interface ReminderListProps {
  reminders: Reminder[];
  onToggle: (reminder: Reminder) => void;
  onDelete: (id: number) => void;
  onAdd: (title: string, time: string) => void;
  t: (key: string) => string;
}

const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  onToggle,
  onDelete,
  onAdd,
  t
}) => {
  const [newReminder, setNewReminder] = React.useState('');
  const [reminderTime, setReminderTime] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReminder.trim() && reminderTime) {
      onAdd(newReminder, reminderTime);
      setNewReminder('');
      setReminderTime('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <Bell className="w-8 h-8 text-amber-500" />
        <h2 className="text-3xl font-bold text-slate-800">{t('reminders')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newReminder}
          onChange={(e) => setNewReminder(e.target.value)}
          placeholder="New reminder..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
        />
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!newReminder.trim() || !reminderTime}
          className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </form>

      <div className="space-y-4">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onToggle(reminder)}
                className={`p-1 rounded-full transition-colors ${reminder.completed ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
              >
                {reminder.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
              <div className="flex flex-col">
                <span className={`font-medium ${reminder.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {reminder.title}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  {reminder.time}
                </div>
              </div>
            </div>
            <button 
              onClick={() => onDelete(reminder.id)}
              className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {reminders.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No reminders set. Stay on top of your day!</p>
        </div>
      )}
    </div>
  );
};

export default ReminderList;

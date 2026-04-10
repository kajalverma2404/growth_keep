import React from 'react';
import { 
  Edit3, 
  Bell, 
  CheckSquare, 
  LineChart as LineChartIcon, 
  MessageSquare, 
  Activity, 
  History, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Target, 
  Sparkles, 
  Archive, 
  Trash2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeSection: string;
  setActiveSection: (section: any) => void;
  setAnalysis: (analysis: any) => void;
  t: (key: string) => string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isSidebarOpen, 
  setIsSidebarOpen,
  activeSection, 
  setActiveSection, 
  setAnalysis, 
  t 
}) => {
  const menuItems = [
    { id: 'notes', label: t('journal'), icon: Edit3 },
    { id: 'daily_insight', label: 'Daily Insight', icon: Activity },
    { id: 'coach', label: t('ai_coach'), icon: MessageSquare },
    { id: 'trends', label: t('growth_trends'), icon: LineChartIcon },
    { id: 'goals', label: 'Vision & Goals', icon: Target },
    { id: 'affirmations', label: 'Daily Affirmations', icon: Sparkles },
    { id: 'habits', label: t('habits'), icon: CheckSquare },
    { id: 'growth_tree', label: 'Growth Tree', icon: TrendingUp },
    { id: 'insight_history', label: 'Insight History', icon: History },
    { id: 'weekly_review', label: 'Weekly Analysis', icon: Calendar },
    { id: 'monthly_review', label: 'Monthly Review', icon: BarChart3 },
    { id: 'three_month_analysis', label: '3-Month Analysis', icon: TrendingUp },
    { id: 'six_month_review', label: '6-Month Review', icon: Target },
    { id: 'annual_reflection', label: 'Annual Reflection', icon: Sparkles },
    { id: 'reminders', label: t('reminders'), icon: Bell },
    { id: 'resources', label: 'Resource Library', icon: Archive },
    { id: 'export', label: 'Export Data', icon: FileText },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      
      <motion.aside 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : (window.innerWidth < 1024 ? -300 : 0),
          width: isSidebarOpen ? 288 : 80
        }}
        drag={window.innerWidth < 1024 ? "x" : false}
        dragConstraints={{ left: -300, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) {
            setIsSidebarOpen(false);
          }
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-100 pt-4 overflow-hidden touch-pan-y`}
      >
        <nav className="space-y-1 px-2 h-full overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id as any);
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
                const aggregatedTypes = [
                  'daily_insight', 
                  'weekly_review', 
                  'monthly_review', 
                  'three_month_analysis', 
                  'six_month_review', 
                  'annual_reflection'
                ];
                if (aggregatedTypes.includes(item.id)) {
                  setAnalysis(null);
                }
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-r-full text-sm font-medium transition-all ${
                activeSection === item.id 
                  ? 'bg-yellow-50 text-slate-900 border-r-4 border-yellow-400' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeSection === item.id ? 'text-yellow-600' : 'text-slate-500'}`} />
              <span className={`truncate transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </motion.aside>
    </>
  );
};

export default Sidebar;

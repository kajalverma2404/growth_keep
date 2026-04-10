import React from 'react';
import { Menu, Sparkles, Search, AlertCircle, Settings, Grid, Edit3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  user: any;
  t: (key: string) => string;
  onNewNote: () => void;
  isApiKeySelected?: boolean;
  handleOpenKeySelector?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  searchQuery,
  setSearchQuery,
  user,
  t,
  onNewNote,
  isApiKeySelected,
  handleOpenKeySelector
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-16 flex items-center px-4 gap-4">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-3 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Menu className="w-6 h-6 text-slate-600" />
      </button>
      
      <div className="flex items-center gap-3 min-w-max">
        <div className="bg-yellow-400 p-2 rounded-xl shadow-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 hidden sm:block tracking-tight">Growth Keep</h1>
      </div>

      <div className="flex-1 max-w-3xl mx-auto flex items-center gap-2 sm:gap-4 px-2 sm:px-4">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder={window.innerWidth < 640 ? "Search..." : "Welcome back..."}
            className="block w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-slate-100 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400/20 focus:shadow-lg transition-all text-sm sm:text-base text-slate-700 placeholder-slate-400 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {window.aistudio && !isApiKeySelected && !process.env.GEMINI_API_KEY && (
          <button 
            onClick={handleOpenKeySelector}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-all text-xs font-bold border border-yellow-200 mr-2"
          >
            <AlertCircle className="w-4 h-4" />
            Select API Key
          </button>
        )}
        <button onClick={() => navigate('/settings')} className="p-3 hover:bg-slate-100 rounded-full text-slate-600"><Settings className="w-5 h-5" /></button>
        <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-slate-100 rounded-full text-slate-600"><Grid className="w-5 h-5" /></button>
        <Link to="/profile" className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold ml-2 hover:opacity-80 transition-opacity">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </Link>
      </div>
    </header>
  );
};

export default Header;

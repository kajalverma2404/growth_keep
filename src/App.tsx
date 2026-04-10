/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { Loader2, Settings as SettingsIcon, Grid as GridIcon } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <DashboardWrapper>
              <Profile />
            </DashboardWrapper>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <DashboardWrapper>
              <Settings />
            </DashboardWrapper>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

// A simple wrapper to keep the header/sidebar layout for Profile and Settings if desired
// Or just render them directly. The user wants smooth navigation.
const DashboardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-16 flex items-center px-4 gap-4">
        <div className="flex items-center gap-2 min-w-max cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="bg-yellow-400 p-1.5 rounded-lg shadow-sm">
            <span className="text-white font-bold">GK</span>
          </div>
          <h1 className="text-xl font-medium text-slate-700">Growth Keep</h1>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/settings')} title={t('settings')} className="p-3 hover:bg-slate-100 rounded-full text-slate-600"><SettingsIcon className="w-5 h-5" /></button>
          <button onClick={() => navigate('/dashboard')} title={t('dashboard')} className="p-3 hover:bg-slate-100 rounded-full text-slate-600"><GridIcon className="w-5 h-5" /></button>
          <div onClick={() => navigate('/profile')} title={t('profile')} className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold ml-2 cursor-pointer">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>
      <main className="p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

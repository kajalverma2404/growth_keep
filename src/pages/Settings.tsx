import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Moon, Globe, LogOut, ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const Settings: React.FC = () => {
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Settings State
  const [notifications, setNotifications] = useState({
    dailyReminders: true,
    weeklyReports: true,
    aiInsights: true,
    emailAlerts: false
  });

  const [privacy, setPrivacy] = useState({
    shareAnonymousData: true,
    twoFactorAuth: false,
    publicProfile: false
  });

  const [appearance, setAppearance] = useState({
    theme: 'light',
    fontSize: 'medium',
    reducedMotion: false
  });

  const [showSavedToast, setShowSavedToast] = useState(false);

  const triggerSave = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sections = [
    { id: 'notifications', icon: Bell, title: t('notifications'), desc: 'Manage your alerts and reminders', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'privacy', icon: Shield, title: t('privacy'), desc: 'Secure your account and data', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'appearance', icon: Moon, title: t('appearance'), desc: 'Customize your visual experience', color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'language', icon: Globe, title: t('language'), desc: 'Choose your preferred language', color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const Toggle = ({ enabled, onChange, label }: { enabled: boolean, onChange: () => void, label: string }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-slate-700 font-medium">{label}</span>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          enabled ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back_to_dashboard')}
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200"
        >
          <div className="p-8 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <SettingsIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('settings')}</h1>
                <p className="text-slate-500 text-sm">Personalize your Growth Keep experience</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {!activeSection ? (
                <motion.div 
                  key="menu"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-2"
                >
                  {sections.map((section) => (
                    <button 
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                    >
                      <div className={`${section.bg} p-3 rounded-xl transition-colors`}>
                        <section.icon className={`w-5 h-5 ${section.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{section.title}</h3>
                        <p className="text-slate-500 text-xs">{section.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4"
                >
                  <button 
                    onClick={() => setActiveSection(null)}
                    className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-6 hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('settings')}
                  </button>

                  {activeSection === 'notifications' && (
                    <div className="space-y-2 divide-y divide-slate-100">
                      <h2 className="text-xl font-bold text-slate-800 mb-4">{t('notifications')}</h2>
                      <Toggle 
                        label={t('daily_reminders')} 
                        enabled={notifications.dailyReminders} 
                        onChange={() => {
                          setNotifications({...notifications, dailyReminders: !notifications.dailyReminders});
                          triggerSave();
                        }} 
                      />
                      <Toggle 
                        label={t('weekly_reports')} 
                        enabled={notifications.weeklyReports} 
                        onChange={() => {
                          setNotifications({...notifications, weeklyReports: !notifications.weeklyReports});
                          triggerSave();
                        }} 
                      />
                      <Toggle 
                        label={t('ai_insights')} 
                        enabled={notifications.aiInsights} 
                        onChange={() => {
                          setNotifications({...notifications, aiInsights: !notifications.aiInsights});
                          triggerSave();
                        }} 
                      />
                      <Toggle 
                        label={t('email_alerts')} 
                        enabled={notifications.emailAlerts} 
                        onChange={() => {
                          setNotifications({...notifications, emailAlerts: !notifications.emailAlerts});
                          triggerSave();
                        }} 
                      />
                    </div>
                  )}

                  {activeSection === 'privacy' && (
                    <div className="space-y-2 divide-y divide-slate-100">
                      <h2 className="text-xl font-bold text-slate-800 mb-4">{t('privacy')}</h2>
                      <Toggle 
                        label="Share Anonymous Data" 
                        enabled={privacy.shareAnonymousData} 
                        onChange={() => {
                          setPrivacy({...privacy, shareAnonymousData: !privacy.shareAnonymousData});
                          triggerSave();
                        }} 
                      />
                      <Toggle 
                        label="Two-Factor Authentication" 
                        enabled={privacy.twoFactorAuth} 
                        onChange={() => {
                          setPrivacy({...privacy, twoFactorAuth: !privacy.twoFactorAuth});
                          triggerSave();
                        }} 
                      />
                      <Toggle 
                        label="Public Profile" 
                        enabled={privacy.publicProfile} 
                        onChange={() => {
                          setPrivacy({...privacy, publicProfile: !privacy.publicProfile});
                          triggerSave();
                        }} 
                      />
                      <div className="py-4">
                        <button className="text-sm text-indigo-600 font-bold hover:underline">Change Password</button>
                      </div>
                    </div>
                  )}

                  {activeSection === 'appearance' && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-slate-800 mb-4">{t('appearance')}</h2>
                      
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('theme')}</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['light', 'dark', 'system'].map((tKey) => (
                            <button
                              key={tKey}
                              onClick={() => {
                                setAppearance({...appearance, theme: tKey});
                                triggerSave();
                              }}
                              className={`py-3 rounded-xl border-2 transition-all capitalize font-medium ${
                                appearance.theme === tKey ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                              }`}
                            >
                              {t(tKey)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('font_size')}</label>
                        <div className="flex gap-2">
                          {['small', 'medium', 'large'].map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setAppearance({...appearance, fontSize: s});
                                triggerSave();
                              }}
                              className={`flex-1 py-2 rounded-lg border transition-all capitalize text-sm ${
                                appearance.fontSize === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {t(s)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Toggle 
                        label={t('reduced_motion')} 
                        enabled={appearance.reducedMotion} 
                        onChange={() => {
                          setAppearance({...appearance, reducedMotion: !appearance.reducedMotion});
                          triggerSave();
                        }} 
                      />
                    </div>
                  )}

                  {activeSection === 'language' && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold text-slate-800 mb-4">{t('language')}</h2>
                      <div className="grid grid-cols-1 gap-2">
                        {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'].map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setLanguage(lang as any);
                              triggerSave();
                            }}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                              language === lang ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-medium">{lang}</span>
                            {language === lang && <Check className="w-5 h-5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl text-red-600 font-bold hover:bg-red-100 transition-all border border-red-200"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
              Logged in as {user?.email}
            </p>
          </div>
        </motion.div>

        <AnimatePresence>
          {showSavedToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold">{t('settings_updated')}</span>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-all font-bold border border-white/10"
              >
                Go to the Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Settings;

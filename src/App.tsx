import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Briefcase, 
  Settings, 
  MapPin, 
  ShieldCheck, 
  HelpCircle,
  Mail,
  User,
  Database
} from 'lucide-react';

import { AppSettings, RecruiterRecord } from './types';
import ResumeSection from './components/ResumeSection';
import TemplateSection from './components/TemplateSection';
import SenderDashboard from './components/SenderDashboard';
import HistorySection from './components/HistorySection';

import { initAuth, googleSignIn, logout } from './lib/firebaseAuth';
import { User as FirebaseUser } from 'firebase/auth';

import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { logger } from './lib/logger';
import DebugLogConsole from './components/DebugLogConsole';

export default function App() {
  const [isResumeUploaded, setIsResumeUploaded] = useState<boolean>(false);
  const [history, setHistory] = useState<RecruiterRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    senderEmail: 'monty201339@gmail.com',
    defaultTemplate: { subject: '', body: '' },
    dispatchMethod: 'google_oauth'
  });

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  // Initialize and silently recover cached Google sessions on mount
  useEffect(() => {
    const unsub = initAuth(
      (currentUser, token, email) => {
        setUser(currentUser);
        setAccessToken(token);
        setAuthEmail(email);
        logger.success(`Google Auth session restored: ${email}`);
        setSettings(prev => ({
          ...prev,
          senderEmail: email,
          dispatchMethod: 'google_oauth'
        }));
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthEmail(null);
        logger.info('No cached Google authentication sessions.');
      }
    );
    return unsub;
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      logger.info('Initiating authentication with Google...');
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setAuthEmail(result.email);
        setSettings(prev => ({
          ...prev,
          senderEmail: result.email,
          dispatchMethod: 'google_oauth'
        }));
        logger.success(`Google Sign-In successful. Account auth: ${result.email}`);
      }
    } catch (err: any) {
      logger.error(`Google Sign-In failed: ${err?.message || err}`);
      alert(`Google Sign-In failed: ${err?.message || err}`);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setAuthEmail(null);
      logger.info('Google session logged out.');
    } catch (err: any) {
      logger.error(`Logout failed: ${err?.message || err}`);
    }
  };

  // Listen for native URL open events (Capacitor deep-linking redirects)
  useEffect(() => {
    logger.info('Application master component mounted.');
    if (Capacitor.isNativePlatform()) {
      logger.info('Capacitor native environment detected. Registering native URL schemes...');
      try {
        const handlerPromise = NativeApp.addListener('appUrlOpen', (data: { url: string }) => {
          logger.info(`Native custom URL-Scheme landing intercepted: ${data.url}`);
        });
        return () => {
          handlerPromise.then(h => h.remove());
        };
      } catch (e: any) {
        logger.error(`Error registering native URL listener: ${e?.message || e}`);
      }
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('resume_sender_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory) as RecruiterRecord[]);
      } catch (err) {
        console.error('Failed to parse history from localStorage', err);
      }
    }
  }, []);

  // Sync state to local storage when history changes
  const saveHistoryToLocalStorage = (newHistory: RecruiterRecord[]) => {
    setHistory(newHistory);
    localStorage.setItem('resume_sender_history', JSON.stringify(newHistory));
  };

  const handleAddRecruiters = (newRecords: RecruiterRecord[]) => {
    // Exclude exact duplicate records just in case
    const filteredNew = newRecords.filter(
      nr => !history.some(hr => hr.email.toLowerCase().trim() === nr.email.toLowerCase().trim())
    );
    
    // Fallback: if user overrides duplicate guard or updates an old record, standard append
    const updated = [...history, ...filteredNew];
    saveHistoryToLocalStorage(updated);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = history.filter(record => record.id !== id);
    saveHistoryToLocalStorage(updated);
  };

  const handleClearAllHistory = () => {
    saveHistoryToLocalStorage([]);
  };

  const handleSyncHistory = (importedRecords: RecruiterRecord[]) => {
    // Merge new records, matching unique receiver emails as key constraint
    const currentMap = new Map<string, RecruiterRecord>(history.map(item => [item.email.toLowerCase().trim(), item]));
    
    importedRecords.forEach(rec => {
      // If doesn't exist, insert; if exists, keep existing or overwrite? Let's insert new to avoid overwriting newer dates with old CSV files
      const key = rec.email.toLowerCase().trim();
      if (!currentMap.has(key)) {
        currentMap.set(key, rec);
      }
    });

    const merged = Array.from(currentMap.values());
    saveHistoryToLocalStorage(merged);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 font-sans antialiased text-slate-800">
      
      {/* Visual background gradient accents */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-slate-100/40 pointer-events-none" />

      {/* Main Container Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pt-8">
        
        {/* Core Application App Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Briefcase className="w-7 h-7 text-indigo-600 animate-pulse" />
              Recruitment Dispatcher & Tracker
            </h1>
            <p className="text-slate-500 text-sm max-w-2xl font-medium">
              Your professional applicant tracking suite. Store templates, clean target domains, and protect recruiter contacts from duplicated spams.
            </p>
          </div>

          {/* Connected Status info boxes */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${isResumeUploaded ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs font-semibold text-slate-700 font-mono">
                Resume: {isResumeUploaded ? 'Connected to IDB' : 'No CV Uploaded'}
              </span>
            </div>

            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-slate-750 font-mono">
                Database: {history.length} Logged Contacts
              </span>
            </div>
          </div>
        </header>

        {/* Section 1 & Section 2 grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-1">
            <ResumeSection onStatusChange={setIsResumeUploaded} />
          </div>
          <div className="xl:col-span-2">
            <TemplateSection 
              onSettingsChange={setSettings} 
              accessToken={accessToken}
              authEmail={authEmail}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
            />
          </div>
        </div>

        {/* Dispatch & Checker Dashboard (Section 3) */}
        <SenderDashboard 
          settings={settings}
          history={history}
          isResumeUploaded={isResumeUploaded}
          onAddRecruiters={handleAddRecruiters}
          accessToken={accessToken}
          authEmail={authEmail}
          onGoogleSignIn={handleGoogleSignIn}
        />

        {/* Recruiter Log History section (Another Section) */}
        <HistorySection 
          history={history}
          onDeleteRecord={handleDeleteRecord}
          onClearAll={handleClearAllHistory}
          onSyncHistory={handleSyncHistory}
        />

        {/* System & Native Diagnostic Logs view */}
        <DebugLogConsole />

        {/* Pure Professional aesthetic footer */}
        <footer className="mt-12 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-1.5 pb-4 border-t border-slate-100 pt-6">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Local Storage Engine active. Secure duplicate defenses fully loaded of Resume Sender CRM.</span>
        </footer>

      </div>
    </div>
  );
}

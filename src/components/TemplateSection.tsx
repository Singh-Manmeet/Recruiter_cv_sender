import { useState, useEffect, useRef } from 'react';
import { Mail, FileText, Settings, RefreshCw, Save, Check } from 'lucide-react';
import { AppSettings } from '../types';

interface TemplateSectionProps {
  onSettingsChange: (settings: AppSettings) => void;
  accessToken?: string | null;
  authEmail?: string | null;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
}

// Highly polished, realistic job application templates
const DEFAULT_SUBJECT = 'Application for Software Engineer | {company}';
const DEFAULT_BODY = `Dear Hiring Team at {company},

I hope this email finds you well.

I am writing to express my strong interest in Software Engineering opportunities at your team. Having closely followed the innovative products and tech culture at {company}, I would love to contribute my technical skills and dedication to your mission.

I have attached my resume (PDF format) for your consideration. Over the past few years, I have built highly scalable frontend applications using React & TypeScript, and custom backend servers with Node.js. Given {company}'s focus on excellence, I am confident my baseline values and problem-solving skills would fit seamlessly into your workflow.

Could we schedule a brief call this week to explore how I can support your goals? Thank you so much for your time and review.

Best regards,
Monty
Email: monty201339@gmail.com`;

export default function TemplateSection({ 
  onSettingsChange,
  accessToken,
  authEmail,
  onGoogleSignIn,
  onGoogleSignOut
}: TemplateSectionProps) {
  const [senderEmail, setSenderEmail] = useState('monty201339@gmail.com');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [dispatchMethod, setDispatchMethod] = useState<'gmail_web' | 'native_mailto' | 'background_smtp' | 'google_oauth'>('google_oauth');
  const [smtpPass, setSmtpPass] = useState('gisrrnzjjazncaoc');
  const [apiUrlOverride, setApiUrlOverride] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const isLoaded = useRef(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('resume_sender_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppSettings;
        setSenderEmail(parsed.senderEmail || 'monty201339@gmail.com');
        setSubject(parsed.defaultTemplate?.subject || DEFAULT_SUBJECT);
        setBody(parsed.defaultTemplate?.body || DEFAULT_BODY);
        setDispatchMethod(parsed.dispatchMethod || 'google_oauth');
        setSmtpPass(parsed.smtpPass || 'gisrrnzjjazncaoc');
        setApiUrlOverride(parsed.apiUrlOverride || '');
        onSettingsChange({
          senderEmail: parsed.senderEmail || 'monty201339@gmail.com',
          defaultTemplate: parsed.defaultTemplate || { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY },
          dispatchMethod: parsed.dispatchMethod || 'google_oauth',
          smtpPass: parsed.smtpPass || 'gisrrnzjjazncaoc',
          apiUrlOverride: parsed.apiUrlOverride || ''
        });
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }
    } else {
      // Setup defaults
      const initial: AppSettings = {
        senderEmail: 'monty201339@gmail.com',
        defaultTemplate: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY },
        dispatchMethod: 'google_oauth',
        smtpPass: 'gisrrnzjjazncaoc',
        apiUrlOverride: ''
      };
      onSettingsChange(initial);
    }
    isLoaded.current = true;
  }, []);

  // Sync state to local storage and trigger parent callback on change
  useEffect(() => {
    if (!isLoaded.current) return;
    
    const updated: AppSettings = {
      senderEmail,
      defaultTemplate: { subject, body },
      dispatchMethod,
      smtpPass,
      apiUrlOverride
    };
    localStorage.setItem('resume_sender_settings', JSON.stringify(updated));
    onSettingsChange(updated);
  }, [senderEmail, subject, body, dispatchMethod, smtpPass, apiUrlOverride]);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to revert to default templates?')) {
      setSubject(DEFAULT_SUBJECT);
      setBody(DEFAULT_BODY);
      setSenderEmail('monty201339@gmail.com');
      setDispatchMethod('google_oauth');
      setSmtpPass('gisrrnzjjazncaoc');
      setApiUrlOverride('');
      
      const updated: AppSettings = {
        senderEmail: 'monty201339@gmail.com',
        defaultTemplate: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY },
        dispatchMethod: 'google_oauth',
        smtpPass: 'gisrrnzjjazncaoc',
        apiUrlOverride: ''
      };
      localStorage.setItem('resume_sender_settings', JSON.stringify(updated));
      onSettingsChange(updated);
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-md mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            2. Email Templates & Settings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Customize sender information and personalize your standard job application text
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Reset to default template"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            type="button"
            className={`inline-flex items-center gap-1.5 px-4.5 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors cursor-pointer ${
              isSaved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Changes Saved
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sender Config */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              Sender Email Address
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full px-3 py-2 text-base md:text-sm text-slate-800 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition-all font-mono"
              placeholder="e.g. monty201339@gmail.com"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Your default sender email ID, editable anytime
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Dispatch Method
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDispatchMethod('google_oauth')}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  dispatchMethod === 'google_oauth'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Google Sign-In
              </button>
              <button
                type="button"
                onClick={() => setDispatchMethod('background_smtp')}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  dispatchMethod === 'background_smtp'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                App Password
              </button>
            </div>
          </div>

          {dispatchMethod === 'google_oauth' ? (
            <div className="bg-gradient-to-tr from-indigo-50/50 to-slate-50 border border-indigo-100/60 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-100 rounded-full uppercase tracking-wider font-sans">
                  🔐 GOOGLE SIGN-IN ACTIVE
                </span>
                <h3 className="text-xs font-bold text-slate-800 font-sans">Dynamic Google Auth</h3>
                <p className="text-[11px] text-slate-600 leading-normal font-sans">
                  Sign in with Google to authenticate your identity and dispatch beautiful emails using Workspace API.
                </p>
              </div>

              {accessToken ? (
                <div className="space-y-2 p-2.5 bg-white border border-slate-100 rounded-lg">
                  <p className="text-[11px] text-slate-750 flex flex-col">
                    <span className="text-[9px] text-indigo-500 uppercase font-bold tracking-wider">Authenticated Email:</span>
                    <span className="font-mono truncate font-semibold">{authEmail || senderEmail}</span>
                  </p>
                  <div className="flex gap-2.5">
                    {onGoogleSignIn && (
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        className="flex-1 py-1 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 transition cursor-pointer"
                      >
                        Change Account
                      </button>
                    )}
                    {onGoogleSignOut && (
                      <button
                        type="button"
                        onClick={onGoogleSignOut}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        Sign Out
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {onGoogleSignIn && (
                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Sign In with Google
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400 leading-normal">
                    You'll be prompted to log in safely via Google popup window.
                  </p>
                </div>
              )}

              <div className="space-y-1 pt-1.5 border-t border-indigo-100/40">
                <label className="block text-[9px] font-bold text-slate-750 uppercase tracking-wide">
                  API Delivery Server URL (Optional):
                </label>
                <input
                  type="text"
                  value={apiUrlOverride}
                  onChange={(e) => setApiUrlOverride(e.target.value.trim())}
                  className="w-full px-3 py-1.5 text-base md:text-[11px] text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 font-mono"
                  placeholder="e.g. https://ais-dev-6xmvfw4eu3sxvbwrb7fool-815669580742.asia-southeast1.run.app"
                />
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-tr from-indigo-50/50 to-slate-50 border border-indigo-100/60 rounded-xl p-4 space-y-2.5 shadow-xs">
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded-full uppercase tracking-wider font-sans">
                  🚀 Saved Google App Password
                </span>
                <h3 className="text-xs font-bold text-slate-800">Permanent Offline Send</h3>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Saves your secure 16-character SMTP credential in your local private browser storage so you never have to sign-in again!
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-700 uppercase tracking-wide">
                  Gmail App Password:
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value.replace(/\s+/g, ''))}
                  className="w-full px-3 py-1.5 text-base md:text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 font-mono"
                  placeholder="e.g. abcd efgh ijkl mnop"
                />
                <p className="text-[9.5px] text-slate-500 leading-tight">
                  Enable Google Account 2-Step verification, search for <strong>"App Passwords"</strong> on Google settings, and paste the 16-character code.
                </p>
              </div>

              <div className="space-y-1 pt-1.5 border-t border-indigo-100/40">
                <label className="block text-[9px] font-bold text-slate-700 uppercase tracking-wide">
                  API Delivery Server URL (Optional):
                </label>
                <input
                  type="text"
                  value={apiUrlOverride}
                  onChange={(e) => setApiUrlOverride(e.target.value.trim())}
                  className="w-full px-3 py-1.5 text-base md:text-[11px] text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 font-mono"
                  placeholder="e.g. https://ais-dev-6xmvfw4eu3sxvbwrb7fool-815669580742.asia-southeast1.run.app"
                />
                <p className="text-[9.5px] text-slate-500 leading-tight">
                  For native iOS/Android simulators, override the destination API backend. Leave blank to default to the live development server.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Template Placeholders
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Use these dynamic fields in your templates below. They resolve instantly when recruiter emails are typed:
            </p>
            <ul className="mt-2 space-y-1 text-[11px] font-mono text-indigo-700">
              <li>• <span className="font-semibold text-indigo-600">{`{company}`}</span> - Company name</li>
              <li>• <span className="font-semibold text-indigo-600">{`{name}`}</span> - First-part of email prefix</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Subject and Body Editors */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Email Subject Template
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-base md:text-sm text-slate-800 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition-all font-medium"
              placeholder="Application for..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              Email Cover Letter Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full px-3.5 py-3 text-base md:text-sm text-slate-800 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition-all font-sans leading-relaxed"
              placeholder="Write your professional email cover letter..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

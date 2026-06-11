import { useState, useEffect, useRef } from 'react';
import { Mail, FileText, Settings, RefreshCw, Save, Check } from 'lucide-react';
import { AppSettings } from '../types';

interface TemplateSectionProps {
  onSettingsChange: (settings: AppSettings) => void;
  accessToken: string | null;
  authEmail: string | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
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

  // Sync state when google auth changes
  useEffect(() => {
    if (authEmail) {
      setSenderEmail(authEmail);
    }
  }, [authEmail]);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('resume_sender_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppSettings;
        setSenderEmail(authEmail || parsed.senderEmail || 'monty201339@gmail.com');
        setSubject(parsed.defaultTemplate?.subject || DEFAULT_SUBJECT);
        setBody(parsed.defaultTemplate?.body || DEFAULT_BODY);
        setDispatchMethod('google_oauth');
        setSmtpPass(parsed.smtpPass || 'gisrrnzjjazncaoc');
        setApiUrlOverride(parsed.apiUrlOverride || '');
        onSettingsChange({
          senderEmail: authEmail || parsed.senderEmail || 'monty201339@gmail.com',
          defaultTemplate: parsed.defaultTemplate || { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY },
          dispatchMethod: 'google_oauth',
          smtpPass: parsed.smtpPass || 'gisrrnzjjazncaoc',
          apiUrlOverride: parsed.apiUrlOverride || ''
        });
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }
    } else {
      // Setup defaults
      const initial: AppSettings = {
        senderEmail: authEmail || 'monty201339@gmail.com',
        defaultTemplate: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY },
        dispatchMethod: 'google_oauth',
        smtpPass: 'gisrrnzjjazncaoc',
        apiUrlOverride: ''
      };
      onSettingsChange(initial);
    }
    isLoaded.current = true;
  }, [authEmail]);

  // Auto-save settings instantly on changes
  useEffect(() => {
    if (!isLoaded.current) return;
    
    const updated: AppSettings = {
      senderEmail,
      defaultTemplate: { subject, body },
      dispatchMethod: 'google_oauth',
      smtpPass,
      apiUrlOverride
    };
    localStorage.setItem('resume_sender_settings', JSON.stringify(updated));
    onSettingsChange(updated);
  }, [senderEmail, subject, body, smtpPass, apiUrlOverride]);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to revert to default templates?')) {
      setSubject(DEFAULT_SUBJECT);
      setBody(DEFAULT_BODY);
      setSenderEmail(authEmail || 'monty201339@gmail.com');
      setDispatchMethod('google_oauth');
      setSmtpPass('gisrrnzjjazncaoc');
      setApiUrlOverride('');
      
      const updated: AppSettings = {
        senderEmail: authEmail || 'monty201339@gmail.com',
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

          <div className="bg-gradient-to-tr from-indigo-50/50 to-slate-50 border border-indigo-100/60 rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 rounded-full uppercase tracking-wider">
                🔒 Google Authorized Channel
              </span>
              <h3 className="text-xs font-bold text-slate-800">Google OAuth 2.0 Login</h3>
              <p className="text-[11px] text-slate-600 leading-normal">
                Bypasses manuals SMTP App Passwords. Signs in once securely with Google to send CV bulk emails directly in the background.
              </p>
            </div>

            {accessToken && authEmail ? (
              <div className="space-y-2">
                <div className="bg-emerald-50 border border-emerald-150/65 rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-850 uppercase tracking-wider font-mono">✓ Google Connected</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 font-mono truncate">{authEmail}</p>
                  <p className="text-[9px] text-emerald-600 leading-normal mt-1">
                    Your direct email pipeline is authorized and active (refreshed automatically).
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Disconnect Account
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-3 py-2.5 text-xs font-bold text-white bg-slate-900 border border-slate-950 hover:bg-slate-800 rounded-xl shadow-xs transition-transform transform active:scale-[0.98] cursor-pointer"
                >
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Tap to Auth with Google
                </button>
                <p className="text-[10px] text-slate-500 leading-normal text-center bg-slate-100/40 p-2 rounded-lg">
                  Authorizes the local pipeline to securely send cover letter deliveries directly using standard Google endpoints.
                </p>
              </div>
            )}
          </div>

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

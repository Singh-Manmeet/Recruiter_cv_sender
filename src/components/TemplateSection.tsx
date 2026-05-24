import { useState, useEffect } from 'react';
import { Mail, FileText, Settings, RefreshCw, Save, Check } from 'lucide-react';
import { AppSettings } from '../types';

interface TemplateSectionProps {
  onSettingsChange: (settings: AppSettings) => void;
}

// Highly polished, realistic job application templates
const DEFAULT_SUBJECT = 'Application for Software Engineer | {company}';
const DEFAULT_BODY = `Dear Hiring Team at {company},

I hope this email finds you well.

I am writing to express my strong interest in Software Engineering opportunities at your team. Having closely followed the innovative products and tech culture at {company}, I would love to contribute my technical skills and dedication to your mission.

I have attached my resume (PDF format) for your consideration. Over the past few years, I have built highly scalable frontend applications using React & TypeScript, and custom backend servers with Node.js. Given {company}'s focus on excellence, I am confident my baseline values and problem-solving skills would fit seamlessly into your workflow.

Could we schedule a brief call this week to explore how I can support your goals? Thank you so much for your time and review.

Best regards,
Manmeet Simran
Email: manmeet.8623@gmail.com`;

export default function TemplateSection({ onSettingsChange }: TemplateSectionProps) {
  const [senderEmail, setSenderEmail] = useState('manmeet.8623@gmail.com');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [dispatchMethod, setDispatchMethod] = useState<'gmail_web' | 'native_mailto' | 'background_smtp' | 'google_oauth'>('gmail_web');
  const [smtpPass, setSmtpPass] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('resume_sender_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppSettings;
        setSenderEmail(parsed.senderEmail || 'manmeet.8623@gmail.com');
        setSubject(parsed.defaultTemplate?.subject || DEFAULT_SUBJECT);
        setBody(parsed.defaultTemplate?.body || DEFAULT_BODY);
        setDispatchMethod(parsed.dispatchMethod || 'gmail_web');
        setSmtpPass(parsed.smtpPass || '');
        onSettingsChange(parsed);
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }
    } else {
      // Setup defaults
      const initial: AppSettings = {
        senderEmail: 'manmeet.8623@gmail.com',
        defaultTemplate: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY },
        dispatchMethod: 'gmail_web',
        smtpPass: ''
      };
      onSettingsChange(initial);
    }
  }, []);

  const handleSave = () => {
    const updated: AppSettings = {
      senderEmail,
      defaultTemplate: { subject, body },
      dispatchMethod,
      smtpPass
    };
    localStorage.setItem('resume_sender_settings', JSON.stringify(updated));
    onSettingsChange(updated);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to revert to default templates?')) {
      setSubject(DEFAULT_SUBJECT);
      setBody(DEFAULT_BODY);
      setSenderEmail('manmeet.8623@gmail.com');
      setDispatchMethod('gmail_web');
      setSmtpPass('');
      
      const updated: AppSettings = {
        senderEmail: 'manmeet.8623@gmail.com',
        defaultTemplate: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY },
        dispatchMethod: 'gmail_web',
        smtpPass: ''
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
              className="w-full px-3 py-2 text-sm text-slate-800 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition-all font-mono"
              placeholder="e.g. manmeet.8623@gmail.com"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Your default sender email ID, editable anytime
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Email Delivery Method</span>
              <span className="text-[10px] text-indigo-600 font-bold uppercase">Configure</span>
            </label>
            <div className="flex flex-col gap-1.5 bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setDispatchMethod('google_oauth')}
                className={`w-full py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  dispatchMethod === 'google_oauth'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-700 hover:text-indigo-900 bg-indigo-50/50'
                }`}
                title="Highly recommended: Authorize with Google in 1 click and send emails silently in the background!"
              >
                <span>🔑 Sign-In with Google (Gmail API)</span>
              </button>
              <button
                type="button"
                onClick={() => setDispatchMethod('background_smtp')}
                className={`w-full py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  dispatchMethod === 'background_smtp'
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
                title="Sends emails silently in the background via local secure SMTP"
              >
                ⚡ Use Gmail App Password (SMTP)
              </button>
              <button
                type="button"
                onClick={() => setDispatchMethod('gmail_web')}
                className={`w-full py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  dispatchMethod === 'gmail_web'
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Gmail Web (Draft Tab)
              </button>
              <button
                type="button"
                onClick={() => setDispatchMethod('native_mailto')}
                className={`w-full py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  dispatchMethod === 'native_mailto'
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
                title="Loads standard iOS/Gmail app overlay directly without any blank web tabs"
              >
                Native Client (mailto)
              </button>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-1.5 leading-normal font-sans">
              {dispatchMethod === 'google_oauth' && "🌟 Recommended: One-time 'Sign in with Google' authorization to securely send attached CVs directly in the background with zero manually typed passwords!"}
              {dispatchMethod === 'background_smtp' && "Automatically sends prefilled emails in the background using your manual 16-character Gmail App Password."}
              {dispatchMethod === 'gmail_web' && "Creates standard browser draft links. Perfect for desktop Chrome workflows."}
              {dispatchMethod === 'native_mailto' && "Creates direct mailto: links. Perfect for iPad, iOS, or macOS native email app overlays."}
            </p>
          </div>

          {dispatchMethod === 'background_smtp' && (
            <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/60 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-xs font-bold text-indigo-900 flex items-center justify-between">
                <span>Google App Password</span>
                <span className="text-[9px] font-medium text-indigo-600 bg-indigo-100/50 px-1.5 py-0.5 rounded-md">Required</span>
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-3 py-1.5 text-xs text-indigo-950 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all font-mono"
              />
              <div className="text-[9px] text-indigo-700 leading-normal space-y-1">
                <p className="font-semibold text-indigo-800">How to get a Gmail App Password (15s):</p>
                <ol className="list-decimal pl-3 space-y-0.5">
                  <li>Go to your Google Account settings dashboard</li>
                  <li>Enable <strong>2-Factor Verification</strong></li>
                  <li>Search for <strong>"App Passwords"</strong> at the top bar</li>
                  <li>Type 'Resume' and click Create to get the 16-letter password</li>
                </ol>
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
              className="w-full px-3.5 py-2 text-sm text-slate-800 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition-all font-medium"
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
              className="w-full px-3.5 py-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition-all font-sans leading-relaxed"
              placeholder="Write your professional email cover letter..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

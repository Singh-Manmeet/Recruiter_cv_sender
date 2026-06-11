import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  ExternalLink, 
  Copy, 
  AlertTriangle, 
  CheckCircle,
  FileDown, 
  HelpCircle,
  Clock,
  X,
  MailWarning,
  Eye,
  Check
} from 'lucide-react';
import { AppSettings, RecruiterRecord, ParsedEmailState } from '../types';
import { extractCompanyName, isValidEmail, getResume } from '../db';
import { logger } from '../lib/logger';

const getAbsoluteUrl = (path: string, apiUrlOverride?: string): string => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Standard mobile applications use capacitor:// or file:// or are loaded locally.
    const isNativeMobile = origin && (
      origin.startsWith('capacitor://') || 
      origin.startsWith('file://') || 
      origin.includes('localhost:') || 
      origin === 'http://localhost'
    );
    
    if (origin && !isNativeMobile && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      // In standard browsers, ALWAYS prefer the dynamic current page origin as the API backend
      return `${origin.endsWith('/') ? origin.slice(0, -1) : origin}${path}`;
    }
  }

  if (apiUrlOverride && apiUrlOverride.trim()) {
    const base = apiUrlOverride.endsWith('/') ? apiUrlOverride.slice(0, -1) : apiUrlOverride;
    return `${base}${path}`;
  }

  // Default to the public, unauthenticated Shared App URL for native device/simulation testing
  return `https://ais-pre-6xmvfw4eu3sxvbwrb7fool-815669580742.asia-southeast1.run.app${path}`;
};

interface SenderDashboardProps {
  settings: AppSettings;
  history: RecruiterRecord[];
  isResumeUploaded: boolean;
  onAddRecruiters: (records: RecruiterRecord[]) => void;
  accessToken?: string | null;
  authEmail?: string | null;
  onGoogleSignIn?: () => void;
}

export default function SenderDashboard({ 
  settings, 
  history, 
  isResumeUploaded,
  onAddRecruiters,
  accessToken,
  authEmail,
  onGoogleSignIn
}: SenderDashboardProps) {
  const [inputText, setInputText] = useState('');
  const [parsedEmails, setParsedEmails] = useState<ParsedEmailState[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab ] = useState<'bulk' | 'wizard'>('bulk');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Background Batch States
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [isSingleSending, setIsSingleSending] = useState<number | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchLogs, setBatchLogs] = useState<string[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Helper: check if email already exists in history
  const findInHistory = (email: string): RecruiterRecord | undefined => {
    return history.find(record => record.email.toLowerCase().trim() === email.toLowerCase().trim());
  };

  // Helper: check how many emails have been sent today
  const getSentTodayCount = (): number => {
    const todayStr = new Date().toDateString();
    return history.filter(record => {
      try {
        return new Date(record.sentAt).toDateString() === todayStr;
      } catch {
        return false;
      }
    }).length;
  };

  const sentToday = getSentTodayCount();

  // Extract and parse emails when text inputs change
  const handleParseEmails = () => {
    if (!inputText.trim()) {
      setParsedEmails([]);
      return;
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = (inputText.match(emailRegex) || []) as string[];
    const uniqueBatch = Array.from(new Set(foundEmails.map(e => e.toLowerCase().trim())));

    const parsed: ParsedEmailState[] = uniqueBatch.map((email: string) => {
      const isOk = isValidEmail(email);
      const company = extractCompanyName(email);
      const dupRecord = findInHistory(email);

      let sub = settings.defaultTemplate.subject.replace(/{company}/g, company);
      let bodyText = settings.defaultTemplate.body
        .replace(/{company}/g, company)
        .replace(/{name}/g, email.split('@')[0]);

      return {
        email,
        companyName: company,
        isValid: isOk,
        isDuplicate: !!dupRecord,
        duplicateDate: dupRecord ? new Date(dupRecord.sentAt).toLocaleDateString() : undefined,
        customSubject: sub,
        customBody: bodyText,
      };
    });

    setParsedEmails(parsed);
    setCurrentIndex(0);
  };

  // Re-parse when inputs or history list updates
  useEffect(() => {
    handleParseEmails();
  }, [inputText, history, settings]);

  const handleUpdateSubject = (index: number, val: string) => {
    const updated = [...parsedEmails];
    updated[index].customSubject = val;
    setParsedEmails(updated);
  };

  const handleUpdateBody = (index: number, val: string) => {
    const updated = [...parsedEmails];
    updated[index].customBody = val;
    setParsedEmails(updated);
  };

  const handleUpdateCompany = (index: number, val: string) => {
    const updated = [...parsedEmails];
    updated[index].companyName = val;
    
    const cName = val || 'Company';
    updated[index].customSubject = settings.defaultTemplate.subject.replace(/{company}/g, cName);
    updated[index].customBody = settings.defaultTemplate.body
      .replace(/{company}/g, cName)
      .replace(/{name}/g, updated[index].email.split('@')[0]);

    setParsedEmails(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = parsedEmails.filter((_, i) => i !== index);
    setParsedEmails(updated);
    if (currentIndex >= updated.length && updated.length > 0) {
      setCurrentIndex(updated.length - 1);
    }
  };

  const downloadCVHelper = async () => {
    try {
      const resume = await getResume();
      if (!resume) {
        alert('Please upload a CV resume PDF in Section 1 first.');
        return;
      }
      const blob = new Blob([resume.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to retrieve resume PDF.');
    }
  };

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Triggers one-by-one background SMTP or Google OAuth sending
  const handleSingleBackgroundSend = async (item: ParsedEmailState, index: number) => {
    if (isSingleSending !== null || isBatchSending) return;
    
    logger.info(`Single dispatch triggered for email target: ${item.email}`);
    try {
      if (!isResumeUploaded) {
        logger.warn('Single dispatch aborted: No PDF CV uploaded.');
        alert('No Resume CV PDF Uploaded! Please upload in Section 1 first.');
        return;
      }

      const isOAuth = settings.dispatchMethod === 'google_oauth';

      if (isOAuth) {
        if (!accessToken) {
          logger.warn('Single dispatch aborted: Google session is not authenticated.');
          alert('Please click "Sign In with Google" inside Section 2 settings to authenticate first!');
          return;
        }
      } else {
        if (!settings.smtpPass) {
          logger.warn('Single SMTP dispatch aborted: No 16-character App Password entered.');
          alert('Missing Google App Password! Please input your 16-character App Password inside Section 2 settings.');
          return;
        }
      }

      setIsSingleSending(index);

      logger.info('Decoding stored CV database PDF contents...');
      const resume = await getResume();
      if (!resume) {
        throw new Error('Could not load stored PDF CV from persistent storage.');
      }

      const base64CV = bufferToBase64(resume.data);
      logger.info(`PDF Decoded. Binary length: ${resume.data.byteLength} bytes. Dispatching email...`);

      const endpoint = isOAuth ? '/api/send-email-oauth' : '/api/send-email';
      const url = getAbsoluteUrl(endpoint, settings.apiUrlOverride);
      logger.info(`Sending POST request to: ${url}`);

      const bodyPayload = isOAuth ? {
        accessToken: accessToken,
        senderEmail: authEmail || settings.senderEmail,
        to: item.email,
        subject: item.customSubject || '',
        body: item.customBody || '',
        attachment: {
          name: resume.name,
          type: 'application/pdf',
          data: base64CV
        }
      } : {
        smtpUser: settings.senderEmail,
        smtpPass: settings.smtpPass,
        to: item.email,
        subject: item.customSubject || '',
        body: item.customBody || '',
        attachment: {
          name: resume.name,
          type: 'application/pdf',
          data: base64CV
        }
      };

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload)
        });
      } catch (connErr: any) {
        console.error('Fetch execution threw error:', connErr);
        throw new Error(`Load failed calling server at "${url}". Please ensure your Cloud Run backend is awake and active, or try manually specifying your full application Shared App URL in Section 2 settings.`);
      }

      if (!response.ok) {
        const errRes = await response.json();
        throw new Error(errRes.error || 'SMTP delivery server error.');
      }
      const result = await response.json();

      logger.success(`Successfully dispatched single email to recipient: ${item.email}. Message ID: ${result.messageId || 'N/A'}`);

      const newRecord: RecruiterRecord = {
        id: crypto.randomUUID(),
        email: item.email,
        companyName: item.companyName,
        sentAt: new Date().toISOString(),
        senderEmail: isOAuth ? (authEmail || settings.senderEmail) : settings.senderEmail,
        subject: item.customSubject || '',
        body: item.customBody || ''
      };
      
      onAddRecruiters([newRecord]);
      handleRemoveItem(index);

      alert(`Successfully delivered cover letter to ${item.email}!`);
    } catch (err: any) {
      console.error(err);
      logger.error(`Single dispatch transaction failed for target ${item.email}: ${err.message || err}`);
      alert(`Background Send Failed: ${err.message || 'SMTP transmission failed.'}`);
    } finally {
      setIsSingleSending(null);
    }
  };

  // Triggers professional background automatic batch dispatching over secure channel
  const handleBackgroundBatchSend = async () => {
    if (isBatchSending) return;
    setBatchError(null);
    setBatchLogs([]);

    if (!isResumeUploaded) {
      setBatchError('No Resume Uploaded! Please upload your PDF CV in Section 1 before dispatching.');
      return;
    }

    const isOAuth = settings.dispatchMethod === 'google_oauth';

    if (isOAuth) {
      if (!accessToken) {
        setBatchError('Please log in with Google first in Section 2 settings before starting the batch send.');
        return;
      }
    } else {
      if (!settings.smtpPass) {
        setBatchError('Missing App Password! Please open Section 2 and enter your 16-character Google App Password first.');
        return;
      }
    }

    const targets = parsedEmails.filter(item => {
      if (!item.isValid) return false;
      if (skipDuplicates && item.isDuplicate) return false;
      return true;
    });

    if (targets.length === 0) {
      setBatchError('No valid, unique recruiters found in current queue. Check if some are marked as duplicates or invalid!');
      return;
    }

    if (!window.confirm(`Are you ready to sequentially dispatch ${targets.length} custom cover letter emails to their target recipients in the background?`)) {
      return;
    }

    setIsBatchSending(true);
    setBatchProgress({ current: 0, total: targets.length });
    const localLogs: string[] = [];
    const addLog = (text: string) => {
      localLogs.push(`[${new Date().toLocaleTimeString()}] ${text}`);
      setBatchLogs([...localLogs]);
    };

    try {
      addLog('Loading stored PDF Resume CV from memory...');
      const resume = await getResume();
      if (!resume) {
        throw new Error('Could not retrieve uploaded PDF CV from storage.');
      }
      addLog(`✓ Resume Loaded: "${resume.name}" (${(resume.data.byteLength / 1024).toFixed(1)} KB)`);

      const base64CV = bufferToBase64(resume.data);
      addLog(`CV Base64 conversion successful. Initializing ${isOAuth ? 'Gmail API' : 'SMTP'} background queue...`);

      const succeededRecords: RecruiterRecord[] = [];
      const processesToRemove: string[] = [];

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        setBatchProgress({ current: i + 1, total: targets.length });
        addLog(`[${i + 1}/${targets.length}] Dispatching cover letter email to ${item.email}...`);

        try {
          const endpoint = isOAuth ? '/api/send-email-oauth' : '/api/send-email';
          const url = getAbsoluteUrl(endpoint, settings.apiUrlOverride);
          addLog(`  ↳ POST request initiated to: ${url}`);
          
          const bodyPayload = isOAuth ? {
            accessToken: accessToken,
            senderEmail: authEmail || settings.senderEmail,
            to: item.email,
            subject: item.customSubject || '',
            body: item.customBody || '',
            attachment: {
              name: resume.name,
              type: 'application/pdf',
              data: base64CV
            }
          } : {
            smtpUser: settings.senderEmail,
            smtpPass: settings.smtpPass,
            to: item.email,
            subject: item.customSubject || '',
            body: item.customBody || '',
            attachment: {
              name: resume.name,
              type: 'application/pdf',
              data: base64CV
            }
          };

          let response;
          try {
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(bodyPayload)
            });
          } catch (connErr: any) {
            console.error('Batch fetch execution threw error:', connErr);
            throw new Error(`Connection failed to server at "${url}". Please verify your cloud server is online or enter your custom app's Shared App URL in Section 2.`);
          }

          if (!response.ok) {
            const errRes = await response.json();
            throw new Error(errRes.error || 'SMTP delivery server error.');
          }
          const result = await response.json();

          addLog(`  ↳ ✓ Success! Message ID: ${result.messageId || 'OK'}`);
          
          const newRecord: RecruiterRecord = {
            id: crypto.randomUUID(),
            email: item.email,
            companyName: item.companyName,
            sentAt: new Date().toISOString(),
            senderEmail: isOAuth ? (authEmail || settings.senderEmail) : settings.senderEmail,
            subject: item.customSubject || '',
            body: item.customBody || ''
          };
          succeededRecords.push(newRecord);
          processesToRemove.push(item.email);

          if (targets.length > 1 && i < targets.length - 1) {
            const randomDelaySeconds = Math.floor(Math.random() * 9) + 1;
            addLog(`  ↳ Pause: Waiting ${randomDelaySeconds} seconds to behave organically and avoid spam filters...`);
            await new Promise(resolve => setTimeout(resolve, randomDelaySeconds * 1000));
          } else {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (singleErr: any) {
          const errMsg = singleErr.message || 'Transmission failed.';
          addLog(`  ↳ ❌ Error sending to ${item.email}: ${errMsg}`);
          if (errMsg.toLowerCase().includes('authentication') || errMsg.toLowerCase().includes('credentials') || errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('revoked')) {
            throw new Error(`Authentication issues identified. Batch halted: ${errMsg}`);
          }
        }
      }

      if (succeededRecords.length > 0) {
        onAddRecruiters(succeededRecords);
      }

      const remaining = parsedEmails.filter(item => !processesToRemove.includes(item.email));
      setParsedEmails(remaining);
      setCurrentIndex(0);
      setInputText(remaining.map(r => r.email).join(', '));

      addLog(`🎉 Batch Completed! Successful delivery: ${succeededRecords.length}/${targets.length}`);
      setSuccessMsg(`Background automation completed: successfully sent CV emails to ${succeededRecords.length} recruiters!`);
      setTimeout(() => setSuccessMsg(null), 5000);

    } catch (batchErr: any) {
      addLog(`❌ Batch halted: ${batchErr.message}`);
      setBatchError(batchErr.message || 'An error halted batch dispatch.');
    } finally {
      setIsBatchSending(false);
      setBatchProgress(null);
    }
  };

  const buildComposeLink = (item: ParsedEmailState): string => {
    const to = encodeURIComponent(item.email);
    const subject = encodeURIComponent(item.customSubject || '');
    const body = encodeURIComponent(item.customBody || '');
    if (settings.dispatchMethod === 'native_mailto') {
      return `mailto:${item.email}?subject=${subject}&body=${body}`;
    }
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
  };

  const handleCopyClipboard = (item: ParsedEmailState, index: number) => {
    const textToCopy = `Subject: ${item.customSubject}\n\n${item.customBody}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleMarkSent = (item: ParsedEmailState, index: number) => {
    const newRecord: RecruiterRecord = {
      id: crypto.randomUUID(),
      email: item.email,
      companyName: item.companyName,
      sentAt: new Date().toISOString(),
      senderEmail: settings.senderEmail,
      subject: item.customSubject || '',
      body: item.customBody || ''
    };

    onAddRecruiters([newRecord]);
    handleRemoveItem(index);
    setSuccessMsg(`Logged sent application to ${item.email}!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const currentItem = parsedEmails[currentIndex];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-md mb-6">
      <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            3. Recruiter Dispatch & Duplicate Check
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Paste raw recruiter lists, see individual templates, run anti-spam tests, and queue drafts.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-800 text-xs flex items-center gap-2.5 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Grid: Instructions vs Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recruiter Input Side (Left) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Recruiter Email IDs (Pasted Block)</span>
              <span className="text-[10px] text-indigo-600 font-mono">Auto parses emails</span>
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-base md:text-xs text-slate-800 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition-all font-mono leading-relaxed"
              placeholder="Paste raw block containing emails here...&#10;e.g., mailto:hr@stripe.com, recruiter@google.com, john.doe@apple.com"
            />
          </div>

          <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/30 rounded-xl p-4 border border-slate-100 text-xs text-slate-600 space-y-3">
            <h4 className="font-semibold text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              How the Local Sender Works
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px]">
              <li>Paste raw emails, list parses automatically.</li>
              <li>
                {!isResumeUploaded ? (
                  <span className="text-rose-600 font-medium">⚠️ Please upload resume CV first!</span>
                ) : (
                  <span>CV loaded internally.</span>
                )}
              </li>
              <li>Toggle recruiter cards to review inline.</li>
              <li>Click <strong className="text-slate-800">Launch Draft</strong> to spawn Gmail pre-filled tab.</li>
              <li>Hit <strong className="text-slate-800">Mark Sent</strong> to track history & lock duplicates.</li>
            </ol>
            {isResumeUploaded && (
              <button
                type="button"
                onClick={downloadCVHelper}
                className="w-full mt-1.5 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50/60 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <FileDown className="w-3 h-3" />
                Quick-Download CV for Attachment
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Actions and Preview (Right) */}
        <div className="lg:col-span-8 bg-slate-50/55 rounded-2xl border border-slate-100 p-5 flex flex-col justify-between">
          {parsedEmails.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No recruiters in buffer</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Paste recruiter email addresses or any raw contact text in the field to open interactive CV logs and dispatch drafts!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100/30 pb-3">
                <span className="text-xs font-semibold text-slate-700 font-mono">
                  Recruiter Buffer List ({parsedEmails.length} found)
                </span>
                
                <div className="flex items-center gap-1 shadow-xs border border-slate-200 rounded-lg bg-white p-0.5">
                  {parsedEmails.map((_, index) => {
                    const isDup = parsedEmails[index].isDuplicate;
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-6 h-6 rounded text-[10px] font-mono flex items-center justify-center transition-all cursor-pointer ${
                          currentIndex === index
                            ? 'bg-indigo-600 text-white font-bold'
                            : isDup 
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100/60 border border-rose-150'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        title={parsedEmails[index].email}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 border border-indigo-950 shadow-md space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                       <span className="flex h-2 w-2 relative">
                         <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isBatchSending ? '' : 'hidden'}`}></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                       </span>
                      Direct Google App Password SMTP Sending
                    </h3>
                    <p className="text-[10px] text-indigo-200 mt-0.5 font-sans">
                      Performs highly secure individual back-to-back delivery of templates directly in the background.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-indigo-200 font-semibold flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        disabled={isBatchSending}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="rounded border-none accent-indigo-600 focus:ring-0 cursor-pointer text-indigo-600 bg-white"
                      />
                      Skip Duplicates ({parsedEmails.filter(p => p.isDuplicate).length})
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3.5 py-2">
                  <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider font-mono">
                    Daily Sender Log
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white font-mono bg-white/10 px-2.5 py-0.5 rounded-md">
                      {sentToday} {sentToday === 1 ? 'email' : 'emails'} sent today
                    </span>
                  </div>
                </div>

                {sentToday >= 20 && (
                  <div className="bg-amber-500/10 border border-amber-500/35 text-amber-200 text-[11px] rounded-xl p-3 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Daily Limit Alert (20+ Sends Crossed)</p>
                      <p className="text-[10px] text-amber-200 mt-0.5 leading-relaxed">
                        You have dispatched {sentToday} resume emails today! You are completely free to continue sending beyond this notify cap, but keep in mind that spreading cold emails in larger numbers is best paced naturally.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="block text-[10px] font-semibold text-emerald-300 uppercase tracking-wider font-mono">App Password Dispatch</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200 bg-emerald-500/25 rounded-md">
                      ✓ SECURE OFFLINE ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <p className="text-xs font-semibold text-white">Using private credentials: {settings.senderEmail}</p>
                  </div>
                  <p className="text-[9.5px] text-slate-300 leading-normal">
                    Bypasses temporal Google OAuth screens entirely. Leverages your 16-character secure Google App Password persistent SMTP pipeline to ensure your recruiter mails transmit smoothly and never expire!
                  </p>
                </div>

                {batchError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-rose-200 text-xs rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Execution Issue</p>
                      <p className="text-[10px] text-rose-200 mt-0.5">{batchError}</p>
                    </div>
                  </div>
                )}

                {batchProgress && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-indigo-200">
                      <span>Dispatch Progress</span>
                      <span className="font-mono font-bold text-white">
                        {batchProgress.current} / {batchProgress.total} emails
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {batchLogs.length > 0 && (
                  <div className="bg-black/40 border border-slate-800/80 rounded-xl p-3 max-h-[160px] overflow-y-auto font-mono text-[10px] text-indigo-350 space-y-1 scrollbar-thin">
                    {batchLogs.map((log, lIdx) => (
                      <div key={lIdx} className={log.includes('❌') ? 'text-rose-400' : log.includes('✓') ? 'text-emerald-400' : 'text-slate-300'}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isBatchSending}
                    onClick={handleBackgroundBatchSend}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                      isBatchSending
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'
                    }`}
                  >
                    <Send className="w-4 h-4 animate-pulse" />
                    {isBatchSending ? 'Sequential Dispatching Live...' : `Launch Background Send (${parsedEmails.filter(p => p.isValid && (!skipDuplicates || !p.isDuplicate)).length} Emails)`}
                  </button>
                </div>
              </div>

              {/* ACTIVE CARDS VIEW */}
              {currentItem && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative animate-fade-in space-y-4">
                  {currentItem.isDuplicate ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px]">
                        <p className="font-semibold text-amber-800">
                          Spam Guard Alert: Sent applicant found!
                        </p>
                        <p className="mt-0.5">
                          You already sent your CV resume to <strong className="font-semibold">{currentItem.email}</strong> on <span className="font-mono">{currentItem.duplicateDate}</span>. We highly discourage resending duplicates to avoid spam.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 font-mono">
                        Target Recruiter Email
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 font-mono truncate">{currentItem.email}</span>
                        {!currentItem.isValid && (
                          <span className="px-1.5 py-0.5 text-[8px] bg-red-100 text-red-700 rounded font-bold uppercase">
                            Invalid
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 font-mono">
                        Guessed Company Name
                      </span>
                      <input
                        type="text"
                        value={currentItem.companyName}
                        onChange={(e) => handleUpdateCompany(currentIndex, e.target.value)}
                        className="w-full px-2 py-1 text-base md:text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 font-semibold transition-all"
                        placeholder="Company Name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={currentItem.customSubject || ''}
                      onChange={(e) => handleUpdateSubject(currentIndex, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-base md:text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono flex items-center justify-between">
                      <span>Cover Letter Body</span>
                      <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Auto-personalized template
                      </span>
                    </label>
                    <textarea
                      value={currentItem.customBody || ''}
                      onChange={(e) => handleUpdateBody(currentIndex, e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-base md:text-xs text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-300 focus:outline-none leading-relaxed font-sans"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(currentIndex)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Discard Card
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyClipboard(currentItem, currentIndex)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all cursor-pointer"
                        title="Copy both Subject and Body for easy manual pasting"
                      >
                        {copiedIndex === currentIndex ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied Cover Letter
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Template
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isSingleSending !== null || isBatchSending}
                        onClick={() => handleSingleBackgroundSend(currentItem, currentIndex)}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all cursor-pointer ${
                          isSingleSending === currentIndex ? 'opacity-60 bg-indigo-500 cursor-wait' : ''
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSingleSending === currentIndex ? 'Sending...' : 'Send in Background'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkSent(currentItem, currentIndex)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all cursor-pointer"
                      >
                        Mark as Sent
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

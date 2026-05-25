import { useState, useEffect, useRef } from 'react';
import { logger, LogEntry } from '../lib/logger';
import { 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Trash2, 
  Search, 
  Check, 
  FileCode, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XOctagon,
  RefreshCcw,
  Smartphone
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function DebugLogConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to logger changes
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  // Soft Auto scroll to end on new log entry if open
  useEffect(() => {
    if (isOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const handleCopyLogs = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${l.meta ? ' | Meta: ' + JSON.stringify(l.meta) : ''}`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    logger.info('User copied debug logs from console interface.');
  };

  const filteredLogs = logs.filter(l => 
    l.message.toLowerCase().includes(search.toLowerCase()) || 
    l.level.toLowerCase().includes(search.toLowerCase())
  );

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono uppercase">
            <CheckCircle className="w-2.5 h-2.5" /> OK
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono uppercase">
            <AlertTriangle className="w-2.5 h-2.5" /> WARN
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono uppercase">
            <XOctagon className="w-2.5 h-2.5" /> ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono uppercase">
            <Info className="w-2.5 h-2.5" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="mt-8 border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden font-sans">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-indigo-650" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              System & Native iOS Debug Logs
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                <Smartphone className="w-3 h-3" />
                {Capacitor.isNativePlatform() ? 'Native Device' : 'Web Sandbox'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live developer diagnostic events & session auth trackers. Logs also append to <code className="text-indigo-600 bg-indigo-50 px-1 rounded font-semibold font-mono">debug-app.log</code> in your project folder!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Logs Area collapsible panel */}
      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-950 text-slate-100 p-5 space-y-4 animate-in slide-in-from-top-1 duration-155">
          {/* Internal Instructions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 font-mono">
              <FileCode className="w-4 h-4" /> LOCAL LOG COLLECTION NOTICE
            </h4>
            <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
              To capture real-time connection events directly on your local Mac computer during Xcode <code className="text-yellow-400 font-mono font-semibold">"X+R"</code> runs, ensure your iPhone or iOS simulator is running on the same Wi-Fi network as your host Mac, pointing your fetch requests to your local IP.
              Logs are written to <code className="text-indigo-300 font-mono font-semibold">debug-app.log</code> in the workspace project root.
            </p>
          </div>

          {/* Action buttons bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search levels, messages..."
                className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  logger.info('Log refresh requested.');
                  setLogs(logger.getLogs());
                }}
                title="Refresh log container"
                className="p-2 text-slate-400 bg-slate-900 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  copied 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-40'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy All Logs'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear current logs from local storage?')) {
                    logger.clearLogs();
                  }
                }}
                disabled={logs.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-rose-950 text-rose-300 border border-rose-900 rounded-lg hover:bg-rose-900 hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Logs scroll console */}
          <div className="bg-black/40 border border-slate-900 rounded-xl overflow-y-auto max-h-[280px] p-4 space-y-2 font-mono scrollbar-thin scrollbar-thumb-slate-800">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                {search ? 'No logs matching query found.' : 'Log files are currently empty. Trigger some actions above!'}
              </div>
            ) : (
              filteredLogs.slice().reverse().map((log, index) => (
                <div key={index} className="text-[11px] leading-relaxed border-b border-white/5 pb-1.5 last:border-0 last:pb-0 font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {getLevelBadge(log.level)}
                    <span className="font-semibold text-slate-100 break-words max-w-full">
                      {log.message}
                    </span>
                  </div>
                  {log.meta && (
                    <pre className="mt-1 pl-4 text-[10px] text-slate-400 bg-slate-900/50 p-1.5 rounded overflow-x-auto max-w-full">
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

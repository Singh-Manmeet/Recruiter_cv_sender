import { Capacitor } from '@capacitor/core';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  meta?: any;
}

const LOCAL_STORAGE_KEY = 'app_debug_logs';
const MAX_LOGS = 250;

const getAbsoluteUrl = (path: string): string => {
  if (typeof window !== 'undefined' && (
    window.location.origin.includes('capacitor://') || 
    window.location.origin.includes('app://') || 
    !window.location.origin.includes('localhost')
  )) {
    // Falls back to the hosted workspace server
    return `https://ais-dev-6xmvfw4eu3sxvbwrb7fool-815669580742.asia-southeast1.run.app${path}`;
  }
  return path;
};

// Memory cache of logs for active components to subscribe to
type LogSubscriber = (logs: LogEntry[]) => void;
const subscribers = new Set<LogSubscriber>();

let activeLogs: LogEntry[] = [];

// Load initial logs from local storage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      activeLogs = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load logs from localStorage', e);
  }
}

const persistLogs = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeLogs));
    } catch (e) {
      // ignore quota issues
    }
  }
  subscribers.forEach(sub => sub([...activeLogs]));
};

// Queue to send logs asynchronously without blocking UI interactions
let isFlushing = false;
const logPayloadQueue: LogEntry[] = [];

const flushLogQueue = async () => {
  if (isFlushing || logPayloadQueue.length === 0) return;
  isFlushing = true;
  
  const nextLog = logPayloadQueue.shift();
  if (nextLog) {
    try {
      await fetch(getAbsoluteUrl('/api/write-log'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nextLog)
      });
    } catch (err) {
      // silently ignore network errors when client is offline or server unreachable
    }
  }
  
  isFlushing = false;
  // process the next item
  setTimeout(flushLogQueue, 50);
};

export const logger = {
  log: (level: LogEntry['level'], message: string, meta?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined
    };

    console.log(`[${level.toUpperCase()}] ${message}`, meta || '');

    // Append to memory + cap size
    activeLogs.unshift(entry);
    if (activeLogs.length > MAX_LOGS) {
      activeLogs = activeLogs.slice(0, MAX_LOGS);
    }
    persistLogs();

    // Add to remote sync queue
    logPayloadQueue.push(entry);
    flushLogQueue();
  },

  info: (message: string, meta?: any) => logger.log('info', message, meta),
  success: (message: string, meta?: any) => logger.log('success', message, meta),
  warn: (message: string, meta?: any) => logger.log('warn', message, meta),
  error: (message: string, meta?: any) => logger.log('error', message, meta),

  getLogs: () => [...activeLogs],

  clearLogs: () => {
    activeLogs = [];
    persistLogs();
    logger.info('Logs cleared by user.');
  },

  subscribe: (sub: LogSubscriber) => {
    subscribers.add(sub);
    sub(activeLogs);
    return () => {
      subscribers.delete(sub);
    };
  }
};

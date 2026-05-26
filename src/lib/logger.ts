import { Capacitor } from '@capacitor/core';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  meta?: any;
}

const LOCAL_STORAGE_KEY = 'app_debug_logs';
const MAX_LOGS = 250;

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

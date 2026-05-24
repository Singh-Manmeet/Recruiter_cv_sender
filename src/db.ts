/**
 * Client-side IndexedDB helper to store and retrieve the PDF resume.
 * This avoids any size limits of localStorage.
 */

const DB_NAME = 'ResumeSenderDB';
const STORE_NAME = 'ResumeStore';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event);
      reject(new Error('Failed to open resume database.'));
    };
  });
}

export interface StoredResume {
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  updatedAt: string;
}

export async function saveResume(file: File): Promise<StoredResume> {
  const db = await getDB();
  const arrayBuffer = await file.arrayBuffer();
  
  const resumeData: StoredResume = {
    name: file.name,
    type: file.type,
    size: file.size,
    data: arrayBuffer,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(resumeData, 'current_resume');

    request.onsuccess = () => {
      resolve(resumeData);
    };

    request.onerror = (event) => {
      console.error('Save resume error:', event);
      reject(new Error('Failed to save resume locally.'));
    };
  });
}

export async function getResume(): Promise<StoredResume | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current_resume');

    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest).result;
      resolve(result || null);
    };

    request.onerror = (event) => {
      console.error('Get resume error:', event);
      reject(new Error('Failed to retrieve resume.'));
    };
  });
}

export async function deleteResume(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('current_resume');

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error('Delete resume error:', event);
      reject(new Error('Failed to delete resume.'));
    };
  });
}

/**
 * Extracts company name from an email address.
 * E.g., recruiter@stripe.com -> "Stripe"
 * E.g., boss@google.co.uk -> "Google"
 * Excludes webmails like gmail, yahoo, hotmail, outlook, protonmail, icloud, mail, etc.
 */
export function extractCompanyName(email: string): string {
  if (!email || !email.includes('@')) return '';
  const domain = email.split('@')[1].toLowerCase().trim();
  
  // List of common webmail / personal email domains
  const webmailDomains = new Set([
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'yahoo.ca',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
    'outlook.com', 'live.com', 'msn.com',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me',
    'aol.com', 'zoho.com', 'mail.com', 'gmx.com', 'yandex.com'
  ]);

  if (webmailDomains.has(domain)) {
    // For personal email (like gmail), extract the prefix if we want, or just return "Personal"
    // Let's return "Personal (Gmail)" or capitalize the webmail or use email prefix.
    const prefix = email.split('@')[0];
    // Clean up dots, numbers from prefix
    const cleanedPrefix = prefix
      .split(/[.+_\-\d]/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return cleanedPrefix ? `${cleanedPrefix} (Personal)` : 'Personal';
  }

  // Extract first part of the domain, e.g. stripe from stripe.com or google from google.co.uk
  const domainParts = domain.split('.');
  
  // Usually, the first part is the company name unless it's something like co.uk or com.br
  // In most cases, taking the first part works beautifully, e.g. "stripe" from stripe.com
  let candidate = domainParts[0];
  
  // Capitalize name
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

/**
 * Validates whether a string is a correctly formatted email address.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase().trim());
}

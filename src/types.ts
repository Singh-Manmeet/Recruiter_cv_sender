/**
 * Types and interfaces for the Resume Sender app.
 */

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface AppSettings {
  senderEmail: string;
  defaultTemplate: EmailTemplate;
  dispatchMethod: 'gmail_web' | 'native_mailto' | 'background_smtp' | 'google_oauth';
  smtpPass?: string;
  apiUrlOverride?: string;
}

export interface RecruiterRecord {
  id: string; // unique ID
  email: string;
  companyName: string;
  sentAt: string; // ISO timestamp
  senderEmail: string;
  subject: string;
  body: string;
}

export interface ParsedEmailState {
  email: string;
  companyName: string;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateDate?: string;
  customSubject?: string;
  customBody?: string;
}

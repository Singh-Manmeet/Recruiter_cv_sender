import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { logger } from './logger';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase with the workspace-level credentials
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace Gmail Send scope
provider.addScope('https://www.googleapis.com/auth/gmail.send');
// Also request basic profile and email scopes
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Force account selection for standard web popup to avoid automatic sign-in issues
provider.setCustomParameters({
  prompt: 'select_account'
});

// Configure native Google Auth if it's running in native environment
if (Capacitor.isNativePlatform()) {
  logger.info('Capacitor native platform detected. Initializing native Google Auth SDK...');
  GoogleAuth.initialize({
    clientId: (firebaseConfig as any).clientId || '815669580742-yourclientid.apps.googleusercontent.com',
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    grantOfflineAccess: true,
  });
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedEmail: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string, email: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      logger.info(`onAuthStateChanged triggered. User active: yes, cachedTokenState: ${!!cachedAccessToken}`);
      if (cachedAccessToken && cachedEmail) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken, cachedEmail);
      } else if (!isSigningIn) {
        // If logged in via standard firebase session persistence but cache is empty,
        // we reset or keep it active (web flow popup needs token reissue if session is restored).
        cachedAccessToken = null;
        cachedEmail = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      logger.info('onAuthStateChanged triggered. No user session active.');
      cachedAccessToken = null;
      cachedEmail = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Initiate standard Google Sign-In (Native or Web Popup)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string; email: string } | null> => {
  try {
    isSigningIn = true;
    const isNative = Capacitor.isNativePlatform();
    logger.info(`googleSignIn() initiated. Native: ${isNative}`);
    
    if (isNative) {
      logger.info('Calling native GoogleAuth.signIn()... Waiting for device Safari/authenticator callback...');
      // 1. Authenticate natively via Capacitor GoogleAuth Plugin
      const result = await GoogleAuth.signIn();
      logger.success('Native GoogleAuth.signIn() completed successfully.');
      
      const accessToken = result.authentication.accessToken;
      const idToken = result.authentication.idToken;
      const email = result.email || '';
      logger.info(`Received OAuth tokens. AccessToken length: ${accessToken?.length || 0}. Domain: ${email.split('@')[1] || 'none'}`);

      if (!accessToken) {
        throw new Error('Failed to retrieve OAuth access token from native Google sign-in.');
      }

      cachedAccessToken = accessToken;
      cachedEmail = email;

      logger.info('Transmitting native credentials to Firebase Auth...');
      // 2. Transmit credentials to Firebase to unify sessions
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const fbResult = await signInWithCredential(auth, credential);
      logger.success('Firebase unified local session synchronized.');

      return {
        user: fbResult.user,
        accessToken: cachedAccessToken,
        email: cachedEmail
      };
    } else {
      logger.info('Opening standard web auth popup for Google Sign-In...');
      // Browser-based popup authentication
      const result = await signInWithPopup(auth, provider);
      logger.success('Google web auth popup finished.');
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential?.accessToken) {
        throw new Error('Failed to retrieve OAuth access token from Google.');
      }

      cachedAccessToken = credential.accessToken;
      cachedEmail = result.user.email || null;
      logger.info(`Stored session. Email: ${cachedEmail}`);

      return { 
        user: result.user, 
        accessToken: cachedAccessToken, 
        email: cachedEmail || '' 
      };
    }
  } catch (error: any) {
    logger.error(`Sign-In failed: ${error?.message || error || 'Unknown context'}`);
    console.error('Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getAuthenticatedEmail = (): string | null => {
  return cachedEmail;
};

export const logout = async () => {
  logger.info('Initiating authentication logout...');
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
      logger.success('Native GoogleAuth.signOut() completed.');
    } catch (e: any) {
      logger.warn(`Native GoogleAuth signOut warn: ${e?.message || e}`);
      console.warn('Native GoogleAuth signOut warn:', e);
    }
  }
  await auth.signOut();
  cachedAccessToken = null;
  cachedEmail = null;
  logger.info('Firebase auth session cleared completely.');
};

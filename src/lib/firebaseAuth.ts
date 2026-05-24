import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
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
    
    if (Capacitor.isNativePlatform()) {
      // 1. Authenticate natively via Capacitor GoogleAuth Plugin
      const result = await GoogleAuth.signIn();
      const accessToken = result.authentication.accessToken;
      const idToken = result.authentication.idToken;
      const email = result.email || '';

      if (!accessToken) {
        throw new Error('Failed to retrieve OAuth access token from native Google sign-in.');
      }

      cachedAccessToken = accessToken;
      cachedEmail = email;

      // 2. Transmit credentials to Firebase to unify sessions
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const fbResult = await signInWithCredential(auth, credential);

      return {
        user: fbResult.user,
        accessToken: cachedAccessToken,
        email: cachedEmail
      };
    } else {
      // Browser-based popup authentication
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential?.accessToken) {
        throw new Error('Failed to retrieve OAuth access token from Google.');
      }

      cachedAccessToken = credential.accessToken;
      cachedEmail = result.user.email || null;

      return { 
        user: result.user, 
        accessToken: cachedAccessToken, 
        email: cachedEmail || '' 
      };
    }
  } catch (error: any) {
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
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch (e) {
      console.warn('Native GoogleAuth signOut warn:', e);
    }
  }
  await auth.signOut();
  cachedAccessToken = null;
  cachedEmail = null;
};

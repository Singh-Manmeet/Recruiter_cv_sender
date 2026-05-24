import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
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

// Force account selection to avoid automatic sign-in issues
provider.setCustomParameters({
  prompt: 'select_account'
});

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

// Initiate standard Google Sign-In with popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string; email: string } | null> => {
  try {
    isSigningIn = true;
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
  await auth.signOut();
  cachedAccessToken = null;
  cachedEmail = null;
};

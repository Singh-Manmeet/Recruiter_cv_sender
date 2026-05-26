import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Preferences } from '@capacitor/preferences';
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
    clientId: '1070969801706-di65q47mjpk5hoi2185oajcmo0obuqp9.apps.googleusercontent.com',
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    grantOfflineAccess: true,
  });
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedEmail: string | null = null;

// Helpers to handle preferences persistence
const saveCredentials = async (token: string, email: string) => {
  try {
    await Preferences.set({ key: 'oauth_access_token', value: token });
    await Preferences.set({ key: 'oauth_email', value: email });
    logger.info('Stored sign-in tokens persistently in Preferences.');
  } catch (e: any) {
    logger.error(`Error saving credentials to Preferences: ${e?.message || e}`);
  }
};

const clearCredentials = async () => {
  try {
    await Preferences.remove({ key: 'oauth_access_token' });
    await Preferences.remove({ key: 'oauth_email' });
    logger.info('Cleared sign-in tokens from Preferences.');
  } catch (e: any) {
    logger.error(`Error clearing credentials from Preferences: ${e?.message || e}`);
  }
};

// Initialize auth state listener and load cached credentials
export const initAuth = (
  onAuthSuccess?: (user: User, token: string, email: string) => void,
  onAuthFailure?: () => void
) => {
  let isSubscribed = true;

  // Check storage first for native silent recovery
  const loadSavedSession = async () => {
    try {
      const { value: storedToken } = await Preferences.get({ key: 'oauth_access_token' });
      const { value: storedEmail } = await Preferences.get({ key: 'oauth_email' });

      if (storedToken && storedEmail) {
        logger.success(`Recovered silent session from Preferences: ${storedEmail}`);
        cachedAccessToken = storedToken;
        cachedEmail = storedEmail;

        if (isSubscribed && onAuthSuccess) {
          const mockUser = {
            uid: `native-user-${storedEmail}`,
            email: storedEmail,
            displayName: storedEmail.split('@')[0],
          } as any as User;
          onAuthSuccess(mockUser, storedToken, storedEmail);
        }
      } else {
        logger.info('No saved token found in Preferences.');
        if (isSubscribed && onAuthFailure && Capacitor.isNativePlatform()) {
          onAuthFailure();
        }
      }
    } catch (e: any) {
      logger.error(`Failed to load saved session: ${e?.message || e}`);
    }
  };

  const savedSessionPromise = loadSavedSession();

  const unsubFirebase = onAuthStateChanged(auth, async (user: User | null) => {
    // Wait for stored session tokens to be retrieved from local preferences before executing Firebase auth checks
    await savedSessionPromise;

    // Only apply standard Firebase flow on web to prevent native hanging issues
    if (!Capacitor.isNativePlatform()) {
      if (user) {
        logger.info(`onAuthStateChanged triggered. User active: yes, cachedTokenState: ${!!cachedAccessToken}`);
        if (cachedAccessToken && cachedEmail) {
          if (isSubscribed && onAuthSuccess) onAuthSuccess(user, cachedAccessToken, cachedEmail);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          cachedEmail = null;
          if (isSubscribed && onAuthFailure) onAuthFailure();
        }
      } else {
        logger.info('onAuthStateChanged triggered. No user session active.');
        cachedAccessToken = null;
        cachedEmail = null;
        if (isSubscribed && onAuthFailure) onAuthFailure();
      }
    }
  });

  return () => {
    isSubscribed = false;
    unsubFirebase();
  };
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
      try {
        const result = await GoogleAuth.signIn();
        logger.success('Native GoogleAuth.signIn() completed successfully.');
        
        const accessToken = result.authentication.accessToken;
        const email = result.email || '';
        logger.info(`Received OAuth tokens. AccessToken length: ${accessToken?.length || 0}. Domain: ${email.split('@')[1] || 'none'}`);

        if (!accessToken) {
          throw new Error('Failed to retrieve OAuth access token from native Google sign-in.');
        }

        cachedAccessToken = accessToken;
        cachedEmail = email;

        // Persist local credentials
        await saveCredentials(accessToken, email);

        // Bypassing native Firebase Sync to prevent indefinitely hanging app sessions
        const mockUser = {
          uid: `native-user-${email}`,
          email: email,
          displayName: email.split('@')[0],
        } as any as User;

        return {
          user: mockUser,
          accessToken: cachedAccessToken,
          email: cachedEmail
        };
      } catch (nativeError: any) {
        const isNotImplemented = nativeError?.message?.includes('not implemented') || 
                               nativeError?.code === 'UNIMPLEMENTED' || 
                               String(nativeError).includes('not implemented') ||
                               String(nativeError).includes('UNIMPLEMENTED');
        
        if (isNotImplemented) {
          logger.warn('Native GoogleAuth plugin is UNIMPLEMENTED. Falling back to Safari web/popup authentication session...');
          try {
            // Attempt standard browser fallback inside native frame
            const result = await signInWithPopup(auth, provider);
            logger.success('Google web auth fallback popup completed successfully.');
            const credential = GoogleAuthProvider.credentialFromResult(result);
            
            if (!credential?.accessToken) {
              throw new Error('Fallback failed to retrieve OAuth access token.');
            }

            cachedAccessToken = credential.accessToken;
            cachedEmail = result.user.email || null;

            await saveCredentials(cachedAccessToken, cachedEmail || '');
            
            return { 
              user: result.user, 
              accessToken: cachedAccessToken, 
              email: cachedEmail || '' 
            };
          } catch (webError: any) {
            logger.error(`Unified native & web auth failure. Native: ${nativeError?.message || nativeError}. Web: ${webError?.message || webError}`);
            
            // Construct a super direct instruction to resolve CocoaPods link in Xcode
            throw new Error(
              `GoogleAuth plugin is not compiled into your Xcode iOS app target.\n\n` +
              `👉 HOW TO FIX IN YOUR TERMINAL (10 seconds):\n` +
              `1. Open your terminal at your project root.\n` +
              `2. Run: npx cap sync ios\n` +
              `3. Run: cd ios/App && pod install\n` +
              `4. In Xcode: Clean build (Cmd+Shift+K) and run on your iPhone again!`
            );
          }
        } else {
          throw nativeError;
        }
      }
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

      await saveCredentials(cachedAccessToken, cachedEmail || '');

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

// Silent Re-authentication when expiration/401 is encountered by Gmail API calls
export const silentReauth = async (): Promise<string | null> => {
  const isNative = Capacitor.isNativePlatform();
  logger.info(`silentReauth() triggered. Native: ${isNative}`);
  try {
    if (isNative) {
      logger.info('Attempting silent native re-registration via GoogleAuth.signIn()...');
      // Calling GoogleAuth.signIn() without web view popup if already approved
      const result = await GoogleAuth.signIn();
      const accessToken = result.authentication.accessToken;
      const email = result.email || '';
      
      if (accessToken) {
        cachedAccessToken = accessToken;
        cachedEmail = email;
        await saveCredentials(accessToken, email);
        logger.success('Silent native token refresh succeeded.');
        return accessToken;
      }
    } else {
      logger.warn('Silent refresh is restricted in browsers due to cross-origin policies.');
    }
  } catch (e: any) {
    logger.error(`Silent re-auth failed: ${e?.message || e}`);
  }

  // If silent reauth failed entirely, discard stale session
  logger.info('Silent re-auth failed. Discarding cached secure sessions.');
  await logout();
  return null;
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
  await clearCredentials();
  await auth.signOut();
  cachedAccessToken = null;
  cachedEmail = null;
  logger.info('Firebase auth session cleared completely.');
};

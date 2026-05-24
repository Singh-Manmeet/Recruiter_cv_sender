import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.resumesender.app',
  appName: 'Resume Sender',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      // This matches standard client-side configuration. The user can override these on local pull.
      serverClientId: '815669580742-yourclientid.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;

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
      clientId: '1070969801706-di65q47mjpk5hoi2185oajcmo0obuqp9.apps.googleusercontent.com',
      serverClientId: '1070969801706-di65q47mjpk5hoi2185oajcmo0obuqp9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;

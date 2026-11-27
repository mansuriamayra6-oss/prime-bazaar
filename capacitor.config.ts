import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'in.primebazaarfashion.app',
  appName: 'Prime Bazaar',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    ...(devServerUrl
      ? {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
        }
      : {}),
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#047857',
    },
  },
};

export default config;

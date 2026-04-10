import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindsetcoach.app',
  appName: 'Mindset Coach',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.lightec.securechat.mobile',
  appName: 'SecureChat',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    url: process.env.SECURECHAT_MOBILE_URL || 'http://localhost:3080',
    cleartext: true,
  },
  ios: {
    // Universal app target (iPhone + iPad) is managed in Xcode project settings.
    contentInset: 'automatic',
  },
};

export default config;

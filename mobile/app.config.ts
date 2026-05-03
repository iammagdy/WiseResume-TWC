import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo dynamic config. Reads sensitive runtime values from environment
 * variables so the same source tree can target dev / preview / production
 * with `EAS Build`'s per-profile env injection (see eas.json).
 *
 * Required env vars:
 *  - EXPO_PUBLIC_SUPABASE_URL
 *  - EXPO_PUBLIC_SUPABASE_ANON_KEY
 *  - EXPO_PUBLIC_KINDE_DOMAIN
 *  - EXPO_PUBLIC_KINDE_CLIENT_ID
 *
 * Optional:
 *  - EXPO_PUBLIC_SENTRY_DSN
 *  - EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
 *  - EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
 *  - EXPO_PUBLIC_WEB_URL  (the wiseresume.cloud-equivalent host for universal links)
 */

const BUNDLE_ID = process.env.EXPO_PUBLIC_BUNDLE_ID ?? 'com.wiseresume.app';
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'WiseResume';
const SCHEME = process.env.EXPO_PUBLIC_SCHEME ?? 'wiseresume';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://resume.thewise.cloud';
const VERSION = '1.0.0';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'wiseresume',
  scheme: SCHEME,
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A14',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    buildNumber: '1',
    associatedDomains: [`applinks:${new URL(WEB_URL).host}`],
    infoPlist: {
      NSCameraUsageDescription:
        'WiseResume uses your camera to scan QR codes for shared resumes and portfolios.',
      NSMicrophoneUsageDescription:
        'WiseResume records your interview practice answers so the AI coach can give you feedback.',
      NSPhotoLibraryUsageDescription:
        'WiseResume needs access to your photo library so you can attach a profile photo to your resume.',
      NSFaceIDUsageDescription:
        'WiseResume uses Face ID to keep your private resume data locked when you step away from the app.',
      NSUserTrackingUsageDescription:
        'Allowing tracking lets WiseResume measure feature usage so we can improve the product. Your resumes are never shared with advertisers.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: BUNDLE_ID,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0A14',
    },
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'READ_MEDIA_IMAGES',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: new URL(WEB_URL).host,
            pathPrefix: '/',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission: 'WiseResume needs access to your photos to attach a profile picture to your resume.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'WiseResume uses the camera to scan QR codes for shared resumes.',
      },
    ],
    [
      'expo-av',
      {
        microphonePermission: 'WiseResume records your interview practice answers so the AI coach can give you feedback.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  updates: {
    url: process.env.EXPO_PUBLIC_EAS_UPDATE_URL,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    kindeDomain: process.env.EXPO_PUBLIC_KINDE_DOMAIN,
    kindeClientId: process.env.EXPO_PUBLIC_KINDE_CLIENT_ID,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    webUrl: WEB_URL,
  },
});

import type { CapacitorConfig } from '@capacitor/cli';

/*
 * Capacitor configuration.
 *
 * `webDir: 'dist'` — production builds bundle the Vite output natively.
 * Always run `npm run build:mobile` (NOT `npm run build`) before `cap sync`
 * so the admin DevKit chunk is dead-code-eliminated from the binary.
 *
 * To switch to live-reload during native development, uncomment the dev
 * override block in `server` below and replace the IP with your machine's
 * LAN address (the simulator/emulator must be able to reach it). Re-run
 * `npx cap sync` after toggling. Never ship a build with the override on.
 *
 * See `docs/mobile.md` for the full workflow.
 */
const config: CapacitorConfig = {
  appId: 'cloud.thewise.resume',
  appName: 'Wise Resume',
  webDir: 'dist',
  version: '2.5.4',
  server: {
    androidScheme: 'https',
    // --- DEV LIVE-RELOAD OVERRIDE (DO NOT COMMIT UNCOMMENTED) ---
    // url: 'http://192.168.1.100:5000',
    // cleartext: true,
  },
  android: {
     backgroundColor: '#0a0a14',
     allowMixedContent: false,
     captureInput: true,
     webContentsDebuggingEnabled: false
   },
   ios: {
     backgroundColor: '#0a0a14',
     contentInset: 'automatic',
     allowsLinkPreview: true,
     scrollEnabled: true
   },
  /* Keyboard: let CSS 100dvh + useKeyboardAwareScroll handle resizing */
  plugins: {
      SplashScreen: {
        launchShowDuration: 3000,
        launchAutoHide: false,
       backgroundColor: '#0a0a14',
       androidSplashResourceName: 'splash',
       androidScaleType: 'CENTER_CROP',
       showSpinner: false,
        splashFullScreen: false,
        splashImmersive: false
     },
     PushNotifications: {
       presentationOptions: ['badge', 'sound', 'alert'],
     },
      Keyboard: {
        resize: 'none',
        resizeOnFullScreen: false
      }
   }
 };

export default config;

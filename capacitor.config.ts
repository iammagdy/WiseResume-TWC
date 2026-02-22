import type { CapacitorConfig } from '@capacitor/cli';

 const config: CapacitorConfig = {
   appId: 'com.wiseresume.app',
   appName: 'Wise Resume',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
     backgroundColor: '#0a0a14',
     allowMixedContent: true,
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

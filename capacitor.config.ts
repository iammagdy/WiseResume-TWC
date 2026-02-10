import type { CapacitorConfig } from '@capacitor/cli';

 const config: CapacitorConfig = {
   appId: 'com.wiseresume.app',
   appName: 'WiseResume',
   webDir: 'dist',
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
   plugins: {
     SplashScreen: {
       launchShowDuration: 2000,
       launchAutoHide: true,
       backgroundColor: '#0a0a14',
       androidSplashResourceName: 'splash',
       androidScaleType: 'CENTER_CROP',
       showSpinner: false,
       splashFullScreen: true,
       splashImmersive: true
     },
     Keyboard: {
       resize: 'body',
       resizeOnFullScreen: true
     }
   }
 };

export default config;

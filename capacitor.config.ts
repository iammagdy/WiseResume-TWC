import type { CapacitorConfig } from '@capacitor/cli';

 const config: CapacitorConfig = {
   appId: 'com.wiseresume.app',
   appName: 'Wise Resume',
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
        launchShowDuration: 3000,
        launchAutoHide: false,
       backgroundColor: '#0a0a14',
       androidSplashResourceName: 'splash',
       androidScaleType: 'CENTER_CROP',
       showSpinner: false,
       splashFullScreen: true,
       splashImmersive: true
     },
     PushNotifications: {
       presentationOptions: ['badge', 'sound', 'alert'],
     },
     Keyboard: {
       resize: 'body',
       resizeOnFullScreen: true
     }
   }
 };

export default config;

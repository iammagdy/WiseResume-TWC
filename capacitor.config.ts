import type { CapacitorConfig } from '@capacitor/cli';

 const config: CapacitorConfig = {
   appId: 'app.lovable.c36950b6370c414abd480b62b16c61e5',
   appName: 'WiseResume',
   webDir: 'dist',
   server: {
     url: 'https://c36950b6-370c-414a-bd48-0b62b16c61e5.lovableproject.com?forceHideBadge=true',
     cleartext: true
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

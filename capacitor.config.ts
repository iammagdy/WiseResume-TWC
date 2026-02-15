import type { CapacitorConfig } from '@capacitor/cli';

 const config: CapacitorConfig = {
   appId: 'app.lovable.1d3d9943c1ba4253b6336b1457b9b330',
   appName: 'wiseresume',
   webDir: 'dist',
   server: {
     url: 'https://1d3d9943-c1ba-4253-b633-6b1457b9b330.lovableproject.com?forceHideBadge=true',
     cleartext: true,
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
        launchShowDuration: 3000,
        launchAutoHide: false,
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

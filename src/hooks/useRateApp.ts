 import { useCallback, useEffect } from 'react';
 import { Capacitor } from '@capacitor/core';
 
 const RATE_APP_KEY = 'wiseresume_rate_app_prompted';
 const POSITIVE_ACTIONS_KEY = 'wiseresume_positive_actions';
 const ACTIONS_THRESHOLD = 5;
 
 /**
  * Hook to prompt users to rate the app after positive interactions
  * Only prompts once and tracks positive actions (resume saves, exports, tailor completions)
  */
 export function useRateApp() {
   const hasBeenPrompted = () => {
     return localStorage.getItem(RATE_APP_KEY) === 'true';
   };
 
   const getPositiveActions = () => {
     const count = localStorage.getItem(POSITIVE_ACTIONS_KEY);
     return count ? parseInt(count, 10) : 0;
   };
 
   const incrementPositiveActions = useCallback(() => {
     if (hasBeenPrompted()) return;
     
     const current = getPositiveActions();
     const newCount = current + 1;
     localStorage.setItem(POSITIVE_ACTIONS_KEY, newCount.toString());
     
     return newCount;
   }, []);
 
   const shouldPromptForRating = useCallback(() => {
     if (hasBeenPrompted()) return false;
     return getPositiveActions() >= ACTIONS_THRESHOLD;
   }, []);
 
   const markAsPrompted = useCallback(() => {
     localStorage.setItem(RATE_APP_KEY, 'true');
   }, []);
 
   const openAppStore = useCallback(() => {
     markAsPrompted();
     
     // For Android, open Play Store
     if (Capacitor.getPlatform() === 'android') {
       window.open('https://play.google.com/store/apps/details?id=app.lovable.c36950b6370c414abd480b62b16c61e5', '_blank');
     }
     // For iOS, would open App Store
     else if (Capacitor.getPlatform() === 'ios') {
       // window.open('https://apps.apple.com/app/idXXXXXXXXXX', '_blank');
     }
   }, [markAsPrompted]);
 
   const dismissRating = useCallback(() => {
     markAsPrompted();
   }, [markAsPrompted]);
 
   return {
     incrementPositiveActions,
     shouldPromptForRating,
     openAppStore,
     dismissRating,
     markAsPrompted,
   };
 }
 
 /**
  * Simple component to show a rating prompt
  * Can be used with toast or dialog
  */
 export function useRateAppCheck(onShouldPrompt: () => void) {
   const { shouldPromptForRating } = useRateApp();
 
   useEffect(() => {
     // Check after a short delay to not interrupt flow
     const timer = setTimeout(() => {
       if (shouldPromptForRating()) {
         onShouldPrompt();
       }
     }, 2000);
 
     return () => clearTimeout(timer);
   }, [shouldPromptForRating, onShouldPrompt]);
 }
 import { useCallback, useEffect } from 'react';
 import { openExternal } from '@/lib/openExternal';
 
 const RATE_APP_KEY = 'wiseresume_feedback_prompted';
 const POSITIVE_ACTIONS_KEY = 'wiseresume_positive_actions';
 const ACTIONS_THRESHOLD = 5;
 
 /**
  * Hook to prompt users for feedback after positive interactions
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
 
   const openFeedback = useCallback(() => {
     markAsPrompted();
     openExternal('mailto:contact@thewise.cloud?subject=WiseResume%20feedback');
   }, [markAsPrompted]);
 
   const dismissRating = useCallback(() => {
     markAsPrompted();
   }, [markAsPrompted]);
 
   return {
     incrementPositiveActions,
     shouldPromptForRating,
     openFeedback,
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

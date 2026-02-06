 import { useEffect } from 'react';
 import { useNavigate, useLocation } from 'react-router-dom';
 import { App } from '@capacitor/app';
 import { Capacitor } from '@capacitor/core';
 import haptics from '@/lib/haptics';
 
 /**
  * Hook to handle Android hardware/gesture back button
  * Provides proper navigation instead of exiting the app unexpectedly
  */
 export function useBackButton() {
   const navigate = useNavigate();
   const location = useLocation();
 
   useEffect(() => {
     // Only add listener on native platforms
     if (!Capacitor.isNativePlatform()) return;
 
     const handleBackButton = async () => {
       haptics.light();
       
       // Define screens where back should exit the app
       const exitScreens = ['/', '/dashboard'];
       
       if (exitScreens.includes(location.pathname)) {
         // On main screens, exit the app
         await App.exitApp();
       } else {
         // On other screens, navigate back
         window.history.length > 1 ? navigate(-1) : navigate('/dashboard');
       }
     };
 
     // Add back button listener
     const listener = App.addListener('backButton', handleBackButton);
 
     return () => {
       listener.then(l => l.remove());
     };
   }, [navigate, location.pathname]);
 }
 import { useEffect } from 'react';
 import { Capacitor } from '@capacitor/core';
 
 /**
  * Hook to dynamically control status bar color based on current theme
  * Updates the meta theme-color tag for browser and provides native control
  */
 export function useStatusBar(color?: string) {
   useEffect(() => {
     // Get the appropriate color
     const statusBarColor = color || getThemeColor();
     
     // Update meta theme-color tag
     const metaThemeColor = document.querySelector('meta[name="theme-color"]');
     if (metaThemeColor) {
       metaThemeColor.setAttribute('content', statusBarColor);
     }
     
     // For native apps, we'd use @capacitor/status-bar here
     // But keeping it simple with meta tag for web/PWA
   }, [color]);
 }
 
 function getThemeColor(): string {
   // Check if dark mode is active
   const isDark = document.documentElement.classList.contains('dark') ||
     (!document.documentElement.classList.contains('light') && 
      window.matchMedia('(prefers-color-scheme: dark)').matches);
   
   return isDark ? '#0a0a14' : '#ffffff';
 }
 
 /**
  * Hook to sync status bar with system theme changes
  */
 export function useStatusBarThemeSync() {
   useEffect(() => {
     const updateStatusBar = () => {
       const color = getThemeColor();
       const metaThemeColor = document.querySelector('meta[name="theme-color"]');
       if (metaThemeColor) {
         metaThemeColor.setAttribute('content', color);
       }
     };
 
     // Watch for theme changes
     const observer = new MutationObserver(updateStatusBar);
     observer.observe(document.documentElement, {
       attributes: true,
       attributeFilter: ['class'],
     });
 
     // Watch for system preference changes
     const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
     mediaQuery.addEventListener('change', updateStatusBar);
 
     // Initial update
     updateStatusBar();
 
     return () => {
       observer.disconnect();
       mediaQuery.removeEventListener('change', updateStatusBar);
     };
   }, []);
 }
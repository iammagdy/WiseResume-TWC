import { useEffect } from 'react';

/**
 * Hook to handle keyboard-aware scrolling inside bottom sheets.
 * When the keyboard opens and focuses an input/textarea inside a sheet,
 * this ensures the focused element scrolls into view.
 * 
 * Usage: Call this hook at the top of any sheet component with inputs.
 */
export function useSheetKeyboard() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      // Only handle inputs and textareas
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        return;
      }
      
      // Check if inside a sheet (vaul drawer)
      const isInSheet = target.closest('[data-vaul-drawer]') || 
                        target.closest('[role="dialog"]');
      
      if (isInSheet) {
        // Delay to allow keyboard to fully open
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);
}

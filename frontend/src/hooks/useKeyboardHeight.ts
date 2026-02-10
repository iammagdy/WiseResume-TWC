import { useState, useEffect, useCallback } from 'react';

interface UseKeyboardHeightReturn {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
}

/**
 * Hook to detect virtual keyboard height on mobile devices
 * Uses Visual Viewport API for accurate detection
 */
export function useKeyboardHeight(): UseKeyboardHeightReturn {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Check if Visual Viewport API is available
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    let initialHeight = viewport.height;

    const handleResize = () => {
      const currentHeight = viewport.height;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - currentHeight;

      // Keyboard is considered open if there's significant height difference
      if (heightDiff > 100) {
        setKeyboardHeight(heightDiff);
        setIsKeyboardOpen(true);
        // Set CSS variable for use in styles
        document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      }
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}

/**
 * Hook for smooth scrolling input into view when keyboard opens
 */
export function useKeyboardScroll() {
  const { isKeyboardOpen, keyboardHeight } = useKeyboardHeight();
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

  const scrollToInput = useCallback((element: HTMLElement) => {
    if (!isKeyboardOpen) return;

    // Small delay to let keyboard fully open
    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const offset = 20; // Extra padding above input

      // If input is below the visible area, scroll it into view
      if (rect.bottom > viewportHeight - offset) {
        const scrollAmount = rect.bottom - viewportHeight + offset + 100;
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
    }, 100);
  }, [isKeyboardOpen]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'
      ) {
        setActiveElement(target);
        scrollToInput(target);
      }
    };

    const handleBlur = () => {
      setActiveElement(null);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [scrollToInput]);

  return { isKeyboardOpen, keyboardHeight, activeElement };
}

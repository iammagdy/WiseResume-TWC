import { useEffect, useRef } from 'react';

export function useKeyboardAwareScroll() {
  const prevOpen = useRef(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const keyboardHeight = window.innerHeight - vv.height;
      const isOpen = keyboardHeight > 100;

      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${keyboardHeight}px`
      );
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${vv.height}px`
      );

      // Toggle class on document for CSS-driven hiding
      document.documentElement.classList.toggle('keyboard-open', isOpen);

      // Detect keyboard close for draft save
      if (!isOpen && prevOpen.current) {
        window.dispatchEvent(new CustomEvent('keyboard-close'));
      }
      prevOpen.current = isOpen;

      const active = document.activeElement as HTMLElement;
      if (active && isOpen && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);

    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
      document.documentElement.style.removeProperty('--keyboard-height');
      document.documentElement.style.removeProperty('--viewport-height');
      document.documentElement.classList.remove('keyboard-open');
    };
  }, []);
}

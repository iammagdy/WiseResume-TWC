import { useEffect } from 'react';

export function useKeyboardAwareScroll() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const keyboardHeight = window.innerHeight - vv.height;
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${keyboardHeight}px`
      );
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${vv.height}px`
      );

      const active = document.activeElement as HTMLElement;
      if (active && keyboardHeight > 100 && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          active.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    };
  }, []);
}

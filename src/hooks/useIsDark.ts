import { useState, useEffect } from 'react';

function getIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

const listeners = new Set<() => void>();
let sharedObserver: MutationObserver | null = null;

function ensureObserver(): void {
  if (sharedObserver || typeof document === 'undefined') return;
  sharedObserver = new MutationObserver(() => {
    listeners.forEach((cb) => cb());
  });
  sharedObserver.observe(document.documentElement, { attributeFilter: ['class'] });
}

export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(getIsDark);

  useEffect(() => {
    ensureObserver();
    const update = () => setIsDark(getIsDark());
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  return isDark;
}

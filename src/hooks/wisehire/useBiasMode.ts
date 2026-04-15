import { useState, useCallback } from 'react';

const STORAGE_KEY = 'wisehire_bias_mode';

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useBiasMode() {
  const [biasMode, setBiasMode] = useState<boolean>(readStored);

  const toggleBiasMode = useCallback(() => {
    setBiasMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { biasMode, toggleBiasMode };
}

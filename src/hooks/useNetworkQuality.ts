import { useState, useEffect } from 'react';

type EffectiveType = '4g' | '3g' | '2g' | 'slow-2g' | undefined;

interface NetworkQuality {
  effectiveType: EffectiveType;
  isSlow: boolean;
}

/**
 * Reads navigator.connection.effectiveType to detect slow mobile connections.
 * Returns isSlow=true for 2g / slow-2g.
 */
export function useNetworkQuality(): NetworkQuality {
  const [effectiveType, setEffectiveType] = useState<EffectiveType>(() => {
    const conn = (navigator as any).connection;
    return conn?.effectiveType;
  });

  useEffect(() => {
    const conn = (navigator as any).connection;
    if (!conn) return;

    const update = () => setEffectiveType(conn.effectiveType);
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g';

  return { effectiveType, isSlow };
}

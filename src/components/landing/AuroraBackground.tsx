import { useMemo, useState, useEffect } from 'react';
import Aurora from './Aurora';
import { useSettingsStore } from '@/store/settingsStore';
import { getSafeMatchMedia } from '@/lib/envUtils';

export function AuroraBackground() {
  const theme = useSettingsStore((s) => s.theme);
  const [product, setProduct] = useState<'wisehire' | 'wiseresueme'>('wiseresueme');

  useEffect(() => {
    const readProduct = () => {
      const el = document.querySelector('[data-lp-product]');
      setProduct(el?.getAttribute('data-lp-product') === 'wisehire' ? 'wisehire' : 'wiseresueme');
    };
    readProduct();
    const obs = new MutationObserver(readProduct);
    obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-lp-product'] });
    return () => obs.disconnect();
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return getSafeMatchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  const isWH = product === 'wisehire';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <Aurora
        colorStops={
          isWH
            ? (isDark ? ['#0D2E6E', '#1D4ED8', '#38BDF8'] : ['#1D4ED8', '#3B82F6', '#93C5FD'])
            : (isDark ? ['#7c0404', '#706666', '#8e0101'] : ['#d94040', '#b03535', '#e04545'])
        }
        blend={isDark ? 0.47 : 0.55}
        amplitude={isDark ? 1.0 : 1.3}
        speed={1.3}
      />
    </div>
  );
}

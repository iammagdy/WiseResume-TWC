import { useMemo } from 'react';
import Aurora from './Aurora';
import { useSettingsStore } from '@/store/settingsStore';
import { getSafeMatchMedia } from '@/lib/envUtils';

interface AuroraBackgroundProps {
  product?: 'jobseeker' | 'wisehire';
  forceCssFallback?: boolean;
}

export function AuroraBackground({ product, forceCssFallback = false }: AuroraBackgroundProps = {}) {
  const theme = useSettingsStore((s) => s.theme);
  const storeLpProduct = useSettingsStore((s) => s.lpProduct);
  const lpProduct = product ?? storeLpProduct;

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return getSafeMatchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  const isWiseHire = lpProduct === 'wisehire';

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
          isWiseHire
            ? ['#0D2E6E', '#1D4ED8', '#38BDF8']
            : (isDark ? ['#7c0404', '#706666', '#8e0101'] : ['#d94040', '#b03535', '#e04545'])
        }
        blend={isDark ? 0.47 : 0.55}
        amplitude={isDark ? 1.0 : 1.3}
        speed={1.3}
        forceCssFallback={forceCssFallback}
      />
    </div>
  );
}

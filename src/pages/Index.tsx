import { lazy, Suspense, useState, useEffect } from 'react';
import { SolarLoadingScreen } from '@/components/solar/SolarLoadingScreen';

const DesktopSolarSystem = lazy(() => import('@/components/solar/DesktopSolarSystem'));
const MobileSolarSystem = lazy(() => import('@/components/solar/MobileSolarSystem'));

export default function Index() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <Suspense fallback={<SolarLoadingScreen />}>
      {isMobile ? <MobileSolarSystem /> : <DesktopSolarSystem />}
    </Suspense>
  );
}

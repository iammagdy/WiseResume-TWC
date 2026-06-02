import WiseLogoLoader from '@/components/loader/WiseLogoLoader';

function getWHBrand() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/enterprises' ||
    window.location.pathname.startsWith('/wisehire') ||
    new URLSearchParams(window.location.search).get('for') === 'companies';
}

/**
 * Full-screen route loading state (Suspense fallback / full-page data loads).
 * Renders the single brand-aware logo loader over a translucent backdrop.
 * WiseHire areas get the blue variant; everything else is WiseResume red.
 * The loader respects `prefers-reduced-motion` internally.
 */
export function PageLoadingSpinner() {
  const variant = getWHBrand() ? 'wisehire' : 'wiseresume';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
      <WiseLogoLoader size="lg" variant={variant} />
    </div>
  );
}

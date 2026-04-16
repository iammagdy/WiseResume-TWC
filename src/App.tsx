import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSettingsStore } from "@/store/settingsStore";
import { useShallow } from "zustand/react/shallow";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { isAppHostname } from "@/hooks/usePublicPortfolio";

// Both the splash and the rest of the app are lazy-loaded. The HTML
// pre-paint splash in index.html covers the first frame, so neither
// chunk is needed in the entry bundle. framer-motion (used by
// AnimatedSplash) and the entire provider stack (Kinde, Auth,
// AIPrivacy, BottomSheet) + side-effect hooks (useDeepLinking,
// useAIKeyHydration, useSuspensionCheck, useAppSettings,
// useBiometricLock, useShakeDetect, useAppLifecycle) now parse only
// after the splash gate resolves.
const AnimatedSplash = lazyWithRetry(() =>
  import("@/components/AnimatedSplash").then((m) => ({ default: m.AnimatedSplash }))
);
const AppInterior = lazyWithRetry(() => import("./AppInterior"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function isPublicStandalonePath(pathname: string) {
  return (
    pathname.startsWith("/p/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/l/") ||
    pathname.startsWith("/auth/callback")
  );
}

/**
 * SplashGate decides whether to render the React splash or go straight
 * to AppInterior. It lives OUTSIDE the heavy provider stack so the
 * provider modules (Kinde, Auth, etc.) only parse after the gate
 * resolves. Uses the same rules as the <head> inline script that
 * paints the HTML pre-paint splash, so the two stay in sync.
 */
function SplashGate() {
  const { hasSeenSplash, setHasSeenSplash } = useSettingsStore(
    useShallow((s) => ({
      hasSeenSplash: s.hasSeenSplash,
      setHasSeenSplash: s.setHasSeenSplash,
    }))
  );
  const location = useLocation();
  const isPublic = isPublicStandalonePath(location.pathname);
  const isAdminRoute = location.pathname.startsWith("/devkit");
  const customDomainHostname =
    typeof window !== "undefined" && !isAppHostname(window.location.hostname)
      ? window.location.hostname
      : null;

  const shouldShowSplash =
    !hasSeenSplash && !isPublic && !isAdminRoute && !customDomainHostname;

  const [settingsHydrated, setSettingsHydrated] = useState(() =>
    useSettingsStore.persist.hasHydrated()
  );
  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated()) {
      setSettingsHydrated(true);
      return;
    }
    return useSettingsStore.persist.onFinishHydration(() =>
      setSettingsHydrated(true)
    );
  }, []);

  // If we're NOT rendering the React splash (because splash already seen,
  // or this is a public/admin/custom-domain route), remove the HTML
  // pre-paint splash synchronously so it never shadows the real UI.
  // useLayoutEffect ensures removal happens before the browser paints
  // the next frame — no flash of pre-paint splash over the real page.
  useLayoutEffect(() => {
    if (!shouldShowSplash) {
      const el = document.getElementById("pre-react-splash");
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }, [shouldShowSplash]);

  if (shouldShowSplash) {
    // Suspense fallback is null — the HTML pre-paint splash is still
    // visible (AnimatedSplash removes it only after it mounts) so the
    // user never sees a blank frame even if the splash chunk is slow.
    return (
      <Suspense fallback={null}>
        <AnimatedSplash
          onComplete={() => setHasSeenSplash(true)}
          ready={settingsHydrated}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <AppInterior />
    </Suspense>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <SplashGate />
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

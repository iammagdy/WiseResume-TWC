import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSettingsStore } from "@/store/settingsStore";
import { useShallow } from "zustand/react/shallow";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { isAppHostname } from "@/hooks/usePublicPortfolio";

const AnimatedSplash = lazyWithRetry(() =>
  import("@/components/AnimatedSplash").then((m) => ({ default: m.AnimatedSplash }))
);
const AppInterior = lazyWithRetry(() => import("./AppInterior"));

// Kick off the Index (home/landing) chunk import as soon as App's module
// evaluates — in parallel with AppInterior — so by the time the splash is
// ready to dismiss, the home page chunk is already in memory and there's
// no black gap between splash exit and first content paint.
const indexChunkPromise: Promise<unknown> =
  typeof window !== "undefined"
    ? import("./pages/Index").catch(() => undefined)
    : Promise.resolve();

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

// Tiny wrapper that signals when AppInterior has actually mounted (i.e.
// the lazy chunk has loaded AND the React tree has committed). Used to
// gate HTML-splash removal so we never expose a blank frame.
function InteriorMount({ onReady }: { onReady: () => void }) {
  useLayoutEffect(() => {
    onReady();
  }, [onReady]);
  return <AppInterior />;
}

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

  // AppInterior loads in parallel with (or instead of) the splash, so by
  // the time the splash exits, the real UI is already painted underneath.
  // For the no-splash path, we hold the HTML pre-paint splash until the
  // interior has actually mounted to avoid any blank gap.
  const [interiorReady, setInteriorReady] = useState(false);
  const handleInteriorReady = useState(() => () => setInteriorReady(true))[0];

  // The "/" route renders <Index /> which is lazy-loaded with a null
  // Suspense fallback. If the splash dismisses before that chunk has
  // finished downloading, the user sees a black flash until Index paints.
  // We track Index chunk readiness and only treat the app as "ready to
  // reveal" once it's loaded on the home route.
  const isHomeRoute =
    location.pathname === "/" || location.pathname === "/enterprises";
  const [indexChunkReady, setIndexChunkReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    indexChunkPromise.finally(() => {
      if (!cancelled) setIndexChunkReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const contentReady = interiorReady && (!isHomeRoute || indexChunkReady);

  useLayoutEffect(() => {
    if (!shouldShowSplash && contentReady) {
      const el = document.getElementById("pre-react-splash");
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }, [shouldShowSplash, contentReady]);

  return (
    <>
      <Suspense fallback={null}>
        <InteriorMount onReady={handleInteriorReady} />
      </Suspense>
      {shouldShowSplash && (
        <Suspense fallback={null}>
          <AnimatedSplash
            onComplete={() => setHasSeenSplash(true)}
            ready={settingsHydrated && contentReady}
          />
        </Suspense>
      )}
    </>
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

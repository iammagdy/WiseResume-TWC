import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { useSettingsStore } from "@/store/settingsStore";
import { useShallow } from "zustand/react/shallow";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { isAppHostname } from "@/hooks/usePublicPortfolio";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LocaleAccountSync } from "@/i18n/LocaleAccountSync";

const WallpaperPage = lazyWithRetry(() => import("./pages/WallpaperPage"));
const ActAs = lazyWithRetry(() => import("./pages/ActAs"));

const AnimatedSplash = lazyWithRetry(() =>
  import("@/components/AnimatedSplash").then((m) => ({ default: m.AnimatedSplash }))
);
// AppLanding is a tiny bundle for the public landing routes ("/" and
// "/enterprises"). It avoids pulling in AppShell, route guards, the
// PageSkeletons module, app lifecycle hooks, and every page's lazy
// declaration — keeping the landing first-paint critical path small.
const AppLanding = lazyWithRetry(() => import("./AppLanding"));
// Full app shell with auth providers, route guards, and every route. Only
// loaded when the user actually navigates into the app (or hits a
// non-landing URL directly).
const AppInterior = lazyWithRetry(() => import("./AppInterior"));
const PublicPortfolioPage = lazyWithRetry(() => import("./pages/PublicPortfolioPage"));

const LANDING_PATHS = new Set(["/", "/enterprises", "/ar", "/ar/enterprises"]);
function isLandingPath(pathname: string) {
  return LANDING_PATHS.has(pathname);
}

function PublicPortfolioRouteSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#0a0a0f] px-6 pb-12 pt-16"
      aria-label="Loading portfolio"
      aria-busy="true"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 animate-pulse">
        <div className="h-36 w-36 rounded-full bg-white/10" />
        <div className="h-10 w-64 max-w-full rounded bg-white/10" />
        <div className="h-6 w-44 rounded bg-white/10" />
        <div className="h-12 w-72 max-w-full rounded bg-white/10" />
      </div>
    </div>
  );
}

// On initial pageview to the landing route, kick off the Index chunk
// import in parallel with AppLanding so the home page chunk is already
// downloading by the time AppLanding mounts. For non-landing URLs we
// skip this and let AppInterior's prefetch handle warming.
if (typeof window !== "undefined" && isLandingPath(window.location.pathname)) {
  void import("./pages/Index").catch(() => undefined);
}

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
    pathname.startsWith("/ar/p/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/ar/share/") ||
    pathname.startsWith("/l/") ||
    pathname.startsWith("/ar/l/") ||
    pathname.startsWith("/auth/callback")
  );
}

// Tiny wrapper that signals when the active app shell has actually
// mounted (i.e. the lazy chunk has loaded AND the React tree has
// committed). Used to gate HTML-splash removal so we never expose a
// blank frame. Routes-level dispatch picks the lightweight AppLanding
// chunk for public landing URLs and the full AppInterior for everything
// else, so visitors hitting `/` never download AppInterior on first
// paint.
function InteriorMount({ onReady }: { onReady: () => void }) {
  useLayoutEffect(() => {
    onReady();
  }, [onReady]);
  return (
    <Routes>
      <Route path="/" element={<AppLanding />} />
      <Route path="/enterprises" element={<AppLanding />} />
      <Route path="/ar" element={<AppLanding />} />
      <Route path="/ar/enterprises" element={<AppLanding />} />
      <Route
        path="/p/:username"
        element={
          <Suspense fallback={<PublicPortfolioRouteSkeleton />}>
            <PublicPortfolioPage />
          </Suspense>
        }
      />
      <Route
        path="/ar/p/:username"
        element={
          <Suspense fallback={<PublicPortfolioRouteSkeleton />}>
            <PublicPortfolioPage />
          </Suspense>
        }
      />
      <Route
        path="/wallpaper"
        element={
          <Suspense fallback={null}>
            <WallpaperPage />
          </Suspense>
        }
      />
      <Route
        path="/act-as"
        element={
          <Suspense fallback={null}>
            <ActAs />
          </Suspense>
        }
      />
      <Route path="*" element={<AppInterior />} />
    </Routes>
  );
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

  // Splash is a mobile-app pattern, not a web pattern. We only show it when
  // the app is launched as an installed PWA (standalone / fullscreen display
  // mode, or iOS Safari's `navigator.standalone`). In a regular browser tab
  // the LandingSkeleton (and other route skeletons) handle the load gap, so
  // visitors get content immediately with no extra brand splash in the way.
  const isStandalonePWA =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: fullscreen)").matches ||
      window.matchMedia?.("(display-mode: minimal-ui)").matches ||
      // iOS Safari
      (window.navigator as { standalone?: boolean }).standalone === true);

  const shouldShowSplash =
    isStandalonePWA &&
    !hasSeenSplash &&
    !isPublic &&
    !isAdminRoute &&
    !customDomainHostname;

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

  useLayoutEffect(() => {
    if (!shouldShowSplash && interiorReady) {
      const el = document.getElementById("pre-react-splash");
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }, [shouldShowSplash, interiorReady]);

  return (
    <>
      <Suspense fallback={null}>
        <InteriorMount onReady={handleInteriorReady} />
      </Suspense>
      {shouldShowSplash && (
        <Suspense fallback={null}>
          <AnimatedSplash
            onComplete={() => setHasSeenSplash(true)}
            ready={settingsHydrated && interiorReady}
          />
        </Suspense>
      )}
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <LocaleAccountSync />
          <TooltipProvider>
            <div style={{ display: 'none' }}>force_rebuild_1782971552</div>
            <ErrorBoundary>
              <BrowserRouter
                future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
              >
                <SplashGate />
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
};

export default App;

import { Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, DegradedAuthProvider } from "@/contexts/AuthContext";
import { KindeProvider, KindeContext } from "@kinde-oss/kinde-auth-react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { useResumeStore } from "@/store/resumeStore";
/* AuroraLayer is lazy-loaded so the ogl WebGL library (a large dep) is
   excluded from the AppLanding critical modulepreload graph. This reduces
   the bytes the browser must download before first paint on the landing
   page, improving LCP/FCP. The aurora loads a split-second after the
   hero text — visually imperceptible to users. */
const AuroraLayerLazy = lazyWithRetry(() =>
  import("@/components/landing/AuroraLayer").then((m) => ({ default: m.AuroraLayer }))
);

const Index = lazyWithRetry(() => import("./pages/Index"));

const KINDE_CLIENT_ID = import.meta.env.VITE_KINDE_CLIENT_ID as string | undefined;
const KINDE_DOMAIN = import.meta.env.VITE_KINDE_DOMAIN as string | undefined;
const PLACEHOLDER_PATTERNS = /^(your[-_]|placeholder|xxx|changeme|todo|<|undefined$)/i;
function isPlaceholder(value: string | undefined): boolean {
  if (!value || value.trim() === "") return true;
  return PLACEHOLDER_PATTERNS.test(value.trim());
}
const kindeValid = !isPlaceholder(KINDE_CLIENT_ID) && !isPlaceholder(KINDE_DOMAIN);

const noopAsync = async () => {};
const noopAsyncUndefined = async () => undefined;
const SAFE_KINDE_CONTEXT_VALUE = {
  user: undefined,
  isLoading: false,
  isAuthenticated: false,
  error: undefined,
  login: noopAsync,
  register: noopAsync,
  logout: noopAsync,
  getClaims: noopAsyncUndefined,
  getIdToken: noopAsyncUndefined,
  getToken: noopAsyncUndefined,
  getAccessToken: noopAsyncUndefined,
  getClaim: noopAsyncUndefined,
  getOrganization: noopAsyncUndefined,
  getCurrentOrganization: noopAsyncUndefined,
  getFlag: noopAsyncUndefined,
  getUserProfile: noopAsyncUndefined,
  getPermission: noopAsyncUndefined,
  getPermissions: noopAsyncUndefined,
  getUserOrganizations: noopAsyncUndefined,
  getRoles: noopAsyncUndefined,
  refreshToken: noopAsyncUndefined,
  generatePortalUrl: async () => ({ url: new URL(window.location.href) }),
} as Parameters<typeof KindeContext.Provider>[0]["value"];

function KindeSafeProvider({ children }: { children: React.ReactNode }) {
  return (
    <KindeContext.Provider value={SAFE_KINDE_CONTEXT_VALUE}>
      {children}
    </KindeContext.Provider>
  );
}

function LandingFallback() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="h-7 w-32 bg-muted rounded" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-muted rounded-md" />
            <div className="h-8 w-20 bg-muted rounded-md" />
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center space-y-5">
        <div className="h-3 w-24 bg-muted rounded mx-auto" />
        <div className="space-y-3">
          <div className="h-10 sm:h-14 w-3/4 bg-muted rounded-lg mx-auto" />
          <div className="h-10 sm:h-14 w-2/3 bg-muted rounded-lg mx-auto" />
        </div>
        <div className="h-4 w-1/2 bg-muted rounded mx-auto mt-6" />
        <div className="flex items-center justify-center gap-3 pt-4">
          <div className="h-12 w-44 bg-muted rounded-xl" />
          <div className="h-12 w-32 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function RouteEB({ children }: { children: ReactNode }) {
  function handleReset() {
    useResumeStore.persist.rehydrate();
  }
  return (
    <ErrorBoundary routeScoped onReset={handleReset}>
      {children}
    </ErrorBoundary>
  );
}

function LandingRoutes() {
  useEffect(() => {
    document.body.style.overflow = "";
  }, []);

  // Dispatch between `/` and `/enterprises` happens in the outer
  // <Routes> in App.tsx — both paths render this component, and the
  // Index page itself reads the URL to pick the active product mode.
  // AuroraLayer is a sibling so the fixed-position aurora canvas
  // paints behind whatever Index renders, including the suspense
  // skeleton during initial chunk load.
  return (
    <>
      <Suspense fallback={null}>
        <AuroraLayerLazy />
      </Suspense>
      <RouteEB>
        <Suspense fallback={<LandingFallback />}>
          <Index />
        </Suspense>
      </RouteEB>
    </>
  );
}

const AppLanding = () => {
  if (!kindeValid) {
    return (
      <>
        <Toaster />
        <KindeSafeProvider>
          <DegradedAuthProvider>
            <LandingRoutes />
          </DegradedAuthProvider>
        </KindeSafeProvider>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <KindeProvider
        clientId={KINDE_CLIENT_ID ?? ""}
        domain={KINDE_DOMAIN ?? ""}
        redirectUri={window.location.origin + "/auth/callback"}
        logoutUri={window.location.origin}
      >
        <AuthProvider>
          <LandingRoutes />
        </AuthProvider>
      </KindeProvider>
    </>
  );
};

export default AppLanding;

import { Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { useResumeStore } from "@/store/resumeStore";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { ConsentBanner } from "@/components/layout/ConsentBanner";

const AuroraLayerLazy = lazyWithRetry(() =>
  import("@/components/landing/AuroraLayer").then((m) => ({ default: m.AuroraLayer }))
);

const Index = lazyWithRetry(() => import("./pages/Index"));

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

  useVisitorTracking({ userId: null });

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
      <ConsentBanner />
    </>
  );
}

const AppLanding = () => {
  return (
    <>
      <Toaster />
      <LandingRoutes />
    </>
  );
};

export default AppLanding;

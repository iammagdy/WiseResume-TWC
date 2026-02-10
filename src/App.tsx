import { lazy, Suspense, useEffect, ComponentType } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useBackButton } from "@/hooks/useBackButton";
import { useStatusBarThemeSync } from "@/hooks/useStatusBar";
import { BiometricLockScreen } from "@/components/BiometricLockScreen";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { useSettingsStore } from "@/store/settingsStore";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import {
  DashboardSkeleton,
  EditorSkeleton,
  SettingsSkeleton,
  PreviewSkeleton,
  UploadSkeleton,
  InterviewSkeleton,
  AuthSkeleton,
} from "@/components/layout/PageSkeletons";
import { PageLoadingSpinner } from "@/components/ui/PageLoadingSpinner";

// Retry-capable lazy loader to prevent infinite skeleton on chunk failures
function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch(() => {
      // Retry once after 1s
      return new Promise<{ default: T }>((resolve, reject) =>
        setTimeout(() => factory().then(resolve).catch(reject), 1000)
      ).catch(() => {
        // Final fallback: reload to bust stale SW cache
        window.location.reload();
        return { default: (() => null) as unknown as T };
      });
    })
  );
}

// Eagerly load Index for LCP
import Index from "./pages/Index";

// Lazy load other pages with retry
const UploadPage = lazyWithRetry(() => import("./pages/UploadPage"));
const EditorPage = lazyWithRetry(() => import("./pages/EditorPage"));
const PreviewPage = lazyWithRetry(() => import("./pages/PreviewPage"));
const AuthPage = lazyWithRetry(() => import("./pages/AuthPage"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const InterviewPage = lazyWithRetry(() => import("./pages/InterviewPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000,        // 10 minutes - cache retention
      refetchOnWindowFocus: false,   // Reduce background refetches
      retry: 1,                      // Faster failure
    },
  },
});

 // Inner component to use hooks that require Router context
 function AppRoutes() {
   useBackButton();
   useStatusBarThemeSync();
   
   const { biometricLockEnabled, biometricLockTimeout } = useSettingsStore();
   const { isLocked, isAvailable, biometryType, isAuthenticating, authenticate } = useBiometricLock(biometricLockEnabled, biometricLockTimeout);

   // Global unhandled rejection handler to prevent black screens from async errors
   useEffect(() => {
     const handleRejection = (event: PromiseRejectionEvent) => {
       console.error("Unhandled rejection:", event.reason);
       toast.error("Something went wrong. Please try again.");
       event.preventDefault();
     };

     window.addEventListener("unhandledrejection", handleRejection);
     return () => window.removeEventListener("unhandledrejection", handleRejection);
   }, []);
   
   // Show lock screen if biometric lock is enabled and app is locked
   if (biometricLockEnabled && isLocked && isAvailable) {
     return (
       <BiometricLockScreen
         biometryType={biometryType}
         isAuthenticating={isAuthenticating}
         onAuthenticate={authenticate}
       />
     );
   }
   
    return (
      <Routes>
        {/* Landing and auth - no shell */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>} />
        
        {/* All tabbed pages share the persistent shell */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={
            <Suspense fallback={<DashboardSkeleton />}>
              <DashboardPage />
            </Suspense>
          } />
          <Route path="/editor" element={
            <Suspense fallback={<EditorSkeleton />}>
              <EditorPage />
            </Suspense>
          } />
          <Route path="/preview" element={
            <Suspense fallback={<PreviewSkeleton />}>
              <PreviewPage />
            </Suspense>
          } />
          <Route path="/upload" element={
            <Suspense fallback={<UploadSkeleton />}>
              <UploadPage />
            </Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<SettingsSkeleton />}>
              <SettingsPage />
            </Suspense>
          } />
          <Route path="/interview" element={
            <Suspense fallback={<InterviewSkeleton />}>
              <InterviewPage />
            </Suspense>
          } />
        </Route>
        
        <Route path="*" element={<Suspense fallback={<PageLoadingSpinner />}><NotFound /></Suspense>} />
      </Routes>
   );
 }
 
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
       <ErrorBoundary>
         <Toaster />
         <BrowserRouter>
           <AuthProvider>
             <AppRoutes />
             <InstallPrompt />
           </AuthProvider>
         </BrowserRouter>
       </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

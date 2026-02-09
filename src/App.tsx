import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import {
  DashboardSkeleton,
  EditorSkeleton,
  SettingsSkeleton,
  PreviewSkeleton,
  UploadSkeleton,
  InterviewSkeleton,
  AISkeleton,
} from "@/components/layout/PageSkeletons";

// Eagerly load Index for LCP
import Index from "./pages/Index";

// Lazy load other pages to reduce initial bundle size
const UploadPage = lazy(() => import("./pages/UploadPage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const InterviewPage = lazy(() => import("./pages/InterviewPage"));
const AIPage = lazy(() => import("./pages/AIPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
        <Route path="/auth" element={<Suspense fallback={null}><AuthPage /></Suspense>} />
        
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
          <Route path="/ai" element={
            <Suspense fallback={<AISkeleton />}>
              <AIPage />
            </Suspense>
          } />
        </Route>
        
        <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
      </Routes>
   );
 }
 
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
       <ErrorBoundary>
         <Toaster />
         <Sonner />
         <BrowserRouter>
           <AppRoutes />
           <InstallPrompt />
         </BrowserRouter>
       </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

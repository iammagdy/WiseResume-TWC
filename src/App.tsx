import { Suspense, useEffect } from "react";
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
import { lazyWithRetry } from "@/lib/lazyWithRetry";

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
const ApplicationsPage = lazyWithRetry(() => import("./pages/ApplicationsPage"));
const OnboardingPage = lazyWithRetry(() => import("./pages/OnboardingPage"));
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"));
const TemplatesPage = lazyWithRetry(() => import("./pages/TemplatesPage"));
const ResumeDetailPage = lazyWithRetry(() => import("./pages/ResumeDetailPage"));
const JobDetailPage = lazyWithRetry(() => import("./pages/JobDetailPage"));
const ApplicationTrackerPage = lazyWithRetry(() => import("./pages/ApplicationTrackerPage"));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const CoverLetterPage = lazyWithRetry(() => import("./pages/CoverLetterPage"));
const CoverLettersPage = lazyWithRetry(() => import("./pages/CoverLettersPage"));
const CoverLetterNewPage = lazyWithRetry(() => import("./pages/CoverLetterNewPage"));
const CoverLetterEditPage = lazyWithRetry(() => import("./pages/CoverLetterEditPage"));
const SharePage = lazyWithRetry(() => import("./pages/SharePage"));
const ExamplesPage = lazyWithRetry(() => import("./pages/ExamplesPage"));
const CareerPage = lazyWithRetry(() => import("./pages/CareerPage"));
const ResignationLettersPage = lazyWithRetry(() => import("./pages/ResignationLettersPage"));
const ResignationLetterNewPage = lazyWithRetry(() => import("./pages/ResignationLetterNewPage"));
const ResignationLetterEditPage = lazyWithRetry(() => import("./pages/ResignationLetterEditPage"));
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
        {/* All tabbed pages share the persistent shell */}
        <Route element={<AppShell />}>
          <Route path="/auth" element={<Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>} />
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
           <Route path="/applications" element={
            <Suspense fallback={<DashboardSkeleton />}>
              <ApplicationsPage />
            </Suspense>
           } />
           <Route path="/onboarding" element={
            <Suspense fallback={<PageLoadingSpinner />}>
              <OnboardingPage />
            </Suspense>
           } />
           <Route path="/profile" element={
            <Suspense fallback={<PageLoadingSpinner />}>
              <ProfilePage />
            </Suspense>
           } />
           <Route path="/templates" element={
            <Suspense fallback={<PageLoadingSpinner />}>
              <TemplatesPage />
            </Suspense>
           } />
           <Route path="/resume/:id" element={
            <Suspense fallback={<PageLoadingSpinner />}>
              <ResumeDetailPage />
            </Suspense>
           } />
           <Route path="/job/:id" element={
            <Suspense fallback={<PageLoadingSpinner />}>
              <JobDetailPage />
            </Suspense>
           } />
           <Route path="/application/:id" element={
            <Suspense fallback={<PageLoadingSpinner />}>
              <ApplicationTrackerPage />
            </Suspense>
           } />
           <Route path="/notifications" element={
            <Suspense fallback={<PageLoadingSpinner />}>
              <NotificationsPage />
            </Suspense>
           } />
           <Route path="/cover-letter" element={
             <Suspense fallback={<PageLoadingSpinner />}>
               <CoverLetterPage />
             </Suspense>
           } />
           <Route path="/cover-letters" element={
             <Suspense fallback={<PageLoadingSpinner />}>
               <CoverLettersPage />
             </Suspense>
           } />
           <Route path="/cover-letter/new" element={
             <Suspense fallback={<PageLoadingSpinner />}>
               <CoverLetterNewPage />
             </Suspense>
           } />
           <Route path="/cover-letter/edit/:id" element={
              <Suspense fallback={<PageLoadingSpinner />}>
                <CoverLetterEditPage />
              </Suspense>
            } />
           <Route path="/examples" element={
               <Suspense fallback={<PageLoadingSpinner />}>
                 <ExamplesPage />
               </Suspense>
             } />
              <Route path="/career" element={
                <Suspense fallback={<PageLoadingSpinner />}>
                  <CareerPage />
                </Suspense>
              } />
              <Route path="/resignation-letters" element={
                <Suspense fallback={<PageLoadingSpinner />}>
                  <ResignationLettersPage />
                </Suspense>
              } />
              <Route path="/resignation-letter/new" element={
                <Suspense fallback={<PageLoadingSpinner />}>
                  <ResignationLetterNewPage />
                </Suspense>
              } />
              <Route path="/resignation-letter/edit/:id" element={
                <Suspense fallback={<PageLoadingSpinner />}>
                  <ResignationLetterEditPage />
                </Suspense>
              } />
          </Route>

        {/* Public share page - outside AppShell */}
        <Route path="/share/:token" element={<Suspense fallback={<PageLoadingSpinner />}><SharePage /></Suspense>} />
        
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

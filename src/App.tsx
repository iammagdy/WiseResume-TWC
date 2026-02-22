import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeepLinking } from "./hooks/useDeepLinking";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useBackButton } from "@/hooks/useBackButton";
import { useStatusBarThemeSync } from "@/hooks/useStatusBar";
import { useShakeDetect } from "@/hooks/useShakeDetect";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { BiometricLockScreen } from "@/components/BiometricLockScreen";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { useSettingsStore } from "@/store/settingsStore";
import { toast } from "sonner";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const CommandPalette = lazyWithRetry(() => import("@/components/layout/CommandPalette"));
const WhatsNewDialog = lazyWithRetry(() => import("@/components/WhatsNewDialog"));
const BugReportDialog = lazyWithRetry(() => import("@/components/BugReportDialog"));
import {
  DashboardSkeleton,
  EditorSkeleton,
  SettingsSkeleton,
  PreviewSkeleton,
  UploadSkeleton,
  InterviewSkeleton,
  AuthSkeleton,
  DetailSkeleton,
  ShareSkeleton,
  ApplicationsSkeleton,
  AIStudioSkeleton,
  ProfilePageSkeleton,
  TemplatesPageSkeleton,
  CoverLettersSkeleton,
  ResignationLettersSkeleton,
  NotificationsSkeleton,
  PortfolioEditorSkeleton,
  OnboardingSkeleton,
  GuidesExamplesSkeleton,
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
const PublicPortfolioPage = lazyWithRetry(() => import("./pages/PublicPortfolioPage"));
const TemplatesPage = lazyWithRetry(() => import("./pages/TemplatesPage"));
const ResumeDetailPage = lazyWithRetry(() => import("./pages/ResumeDetailPage"));
const JobDetailPage = lazyWithRetry(() => import("./pages/JobDetailPage"));
const ApplicationTrackerPage = lazyWithRetry(() => import("./pages/ApplicationTrackerPage"));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const PortfolioEditorPage = lazyWithRetry(() => import("./pages/PortfolioEditorPage"));

const CoverLettersPage = lazyWithRetry(() => import("./pages/CoverLettersPage"));
const CoverLetterNewPage = lazyWithRetry(() => import("./pages/CoverLetterNewPage"));
const CoverLetterEditPage = lazyWithRetry(() => import("./pages/CoverLetterEditPage"));
const SharePage = lazyWithRetry(() => import("./pages/SharePage"));
const ExamplesPage = lazyWithRetry(() => import("./pages/ExamplesPage"));
const CareerPage = lazyWithRetry(() => import("./pages/CareerPage"));
const ResignationLettersPage = lazyWithRetry(() => import("./pages/ResignationLettersPage"));
const ResignationLetterNewPage = lazyWithRetry(() => import("./pages/ResignationLetterNewPage"));
const ResignationLetterEditPage = lazyWithRetry(() => import("./pages/ResignationLetterEditPage"));
const GuidesPage = lazyWithRetry(() => import("./pages/GuidesPage"));
const GuidePage = lazyWithRetry(() => import("./pages/GuidePage"));
const AIStudioPage = lazyWithRetry(() => import("./pages/AIStudioPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const ShortLinkPage = lazyWithRetry(() => import("./pages/ShortLinkPage"));
const AuthCallbackPage = lazyWithRetry(() => import("./pages/AuthCallbackPage"));
const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPage"));
const TermsPage = lazyWithRetry(() => import("./pages/TermsPage"));

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
  useDeepLinking();

  const { shakeToReportEnabled } = useSettingsStore();
  useShakeDetect(shakeToReportEnabled);

  // Global app lifecycle — flushes pending saves when app goes to background
  // on both PWA (visibilitychange) and Capacitor native (appStateChange)
  useAppLifecycle({
    onBackground: () => {
      window.dispatchEvent(new CustomEvent('app:save-draft'));
    },
  });

   // Restore saved theme on mount (safety net for the inline script in index.html)
   useEffect(() => {
     const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
     const theme = saved || 'dark';
     const resolved = theme === 'system'
       ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
       : theme;
     const root = document.documentElement;
     root.classList.remove('light', 'dark');
     root.classList.add(resolved);
   }, []);
   
   const { biometricLockEnabled, biometricLockTimeout, hasSeenSplash, setHasSeenSplash } = useSettingsStore();
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
   
    // Show animated splash on first launch
    if (!hasSeenSplash) {
      return <AnimatedSplash onComplete={() => setHasSeenSplash(true)} />;
    }

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
        <>
        <Routes>
          {/* Public routes - no auth required */}
          <Route path="/" element={<Index />} />
           <Route element={<AppShell />}>
             <Route path="/auth" element={<Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>} />
              <Route path="/auth/callback" element={<Suspense fallback={<PageLoadingSpinner />}><AuthCallbackPage /></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageLoadingSpinner />}><PrivacyPage /></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<PageLoadingSpinner />}><TermsPage /></Suspense>} />
           </Route>

          {/* All protected routes - require authentication */}
           <Route element={<ProtectedRoute />}>
             <Route element={<AppShell />}>
               <Route path="/dashboard" element={<Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense>} />
               <Route path="/editor" element={<Suspense fallback={<EditorSkeleton />}><EditorPage /></Suspense>} />
               <Route path="/preview" element={<Suspense fallback={<PreviewSkeleton />}><PreviewPage /></Suspense>} />
               <Route path="/upload" element={<Suspense fallback={<UploadSkeleton />}><UploadPage /></Suspense>} />
               <Route path="/settings" element={<Suspense fallback={<SettingsSkeleton />}><SettingsPage /></Suspense>} />
               <Route path="/interview" element={<Suspense fallback={<InterviewSkeleton />}><InterviewPage /></Suspense>} />
                <Route path="/applications" element={<Suspense fallback={<ApplicationsSkeleton />}><ApplicationsPage /></Suspense>} />
                <Route path="/onboarding" element={<Suspense fallback={<OnboardingSkeleton />}><OnboardingPage /></Suspense>} />
                <Route path="/profile" element={<Suspense fallback={<ProfilePageSkeleton />}><ProfilePage /></Suspense>} />
                <Route path="/templates" element={<Suspense fallback={<TemplatesPageSkeleton />}><TemplatesPage /></Suspense>} />
                <Route path="/resume/:id" element={<Suspense fallback={<DetailSkeleton />}><ResumeDetailPage /></Suspense>} />
                <Route path="/job/:id" element={<Suspense fallback={<DetailSkeleton />}><JobDetailPage /></Suspense>} />
                <Route path="/application/:id" element={<Suspense fallback={<DetailSkeleton />}><ApplicationTrackerPage /></Suspense>} />
                 <Route path="/notifications" element={<Suspense fallback={<NotificationsSkeleton />}><NotificationsPage /></Suspense>} />
                 <Route path="/portfolio" element={<Suspense fallback={<PortfolioEditorSkeleton />}><PortfolioEditorPage /></Suspense>} />
                 
                 <Route path="/cover-letters" element={<Suspense fallback={<CoverLettersSkeleton />}><CoverLettersPage /></Suspense>} />
                <Route path="/cover-letter/new" element={<Suspense fallback={<DetailSkeleton />}><CoverLetterNewPage /></Suspense>} />
                <Route path="/cover-letter/edit/:id" element={<Suspense fallback={<DetailSkeleton />}><CoverLetterEditPage /></Suspense>} />
                <Route path="/examples" element={<Suspense fallback={<GuidesExamplesSkeleton />}><ExamplesPage /></Suspense>} />
                <Route path="/career" element={<Suspense fallback={<DetailSkeleton />}><CareerPage /></Suspense>} />
                <Route path="/resignation-letters" element={<Suspense fallback={<ResignationLettersSkeleton />}><ResignationLettersPage /></Suspense>} />
                <Route path="/resignation-letter/new" element={<Suspense fallback={<DetailSkeleton />}><ResignationLetterNewPage /></Suspense>} />
                <Route path="/resignation-letter/edit/:id" element={<Suspense fallback={<DetailSkeleton />}><ResignationLetterEditPage /></Suspense>} />
                <Route path="/guides" element={<Suspense fallback={<GuidesExamplesSkeleton />}><GuidesPage /></Suspense>} />
                <Route path="/guides/:slug" element={<Suspense fallback={<DetailSkeleton />}><GuidePage /></Suspense>} />
                 <Route path="/ai-studio" element={<Suspense fallback={<AIStudioSkeleton />}><AIStudioPage /></Suspense>} />
                 <Route path="/activity" element={<Navigate to="/applications" replace />} />
              </Route>
           </Route>

        {/* Public share page - outside AppShell */}
        <Route path="/share/:token" element={<Suspense fallback={<ShareSkeleton />}><SharePage /></Suspense>} />
        <Route path="/p/:username" element={<Suspense fallback={<DetailSkeleton />}><PublicPortfolioPage /></Suspense>} />
        <Route path="/l/:linkId" element={<Suspense fallback={<DetailSkeleton />}><ShortLinkPage /></Suspense>} />
        
        <Route path="*" element={<Suspense fallback={<DetailSkeleton />}><NotFound /></Suspense>} />
      </Routes>
      <Suspense fallback={null}><WhatsNewDialog /></Suspense>
      </>
    );
 }
 
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
        <Suspense fallback={null}><BugReportDialog /></Suspense>
        <ErrorBoundary>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
              <Suspense fallback={null}><CommandPalette /></Suspense>
              <InstallPrompt />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

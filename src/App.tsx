import { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeepLinking } from "./hooks/useDeepLinking";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import { RedirectJobRoute } from "@/components/layout/RedirectJobRoute";
import { useAIKeyHydration } from "@/hooks/useAIKeyHydration";
import { SkyWallpaper } from "@/components/ui/SkyWallpaper";

const CommandPalette = lazyWithRetry(() => import("@/components/layout/CommandPalette"));

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
  AnalyticsSkeleton,
  AchievementsSkeleton,
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
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage"));
const ShortLinkPage = lazyWithRetry(() => import("./pages/ShortLinkPage"));
const AuthCallbackPage = lazyWithRetry(() => import("./pages/AuthCallbackPage"));
const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPage"));
const TermsPage = lazyWithRetry(() => import("./pages/TermsPage"));
const HelpPage = lazyWithRetry(() => import("./pages/HelpPage"));
const AnalyticsPage = lazyWithRetry(() => import("./pages/AnalyticsPage"));
const SubscriptionPage = lazyWithRetry(() => import("./pages/SubscriptionPage"));
const ReferralPage = lazyWithRetry(() => import("./pages/ReferralPage"));
const AchievementsPage = lazyWithRetry(() => import("./pages/AchievementsPage"));
const StoreScreenshotsPage = lazyWithRetry(() => import("./pages/StoreScreenshotsPage"));
const ScreenshotsGalleryPage = lazyWithRetry(() => import("./pages/ScreenshotsGalleryPage"));
const QrCodePage = lazyWithRetry(() => import("./pages/QrCodePage"));
const QrBatchPage = lazyWithRetry(() => import("./pages/QrBatchPage"));
const QrScanPage = lazyWithRetry(() => import("./pages/QrScanPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

 function AppRoutes() {
  useBackButton();
  useStatusBarThemeSync();
  useDeepLinking();
  useAIKeyHydration();

  useEffect(() => {
    document.body.style.overflow = '';
  }, []);

  const { shakeToReportEnabled } = useSettingsStore();
  useShakeDetect(shakeToReportEnabled);

  useAppLifecycle({
    onBackground: () => {
      window.dispatchEvent(new CustomEvent('app:save-draft'));
    },
  });

   const theme = useSettingsStore((s) => s.theme);
   useEffect(() => {
     const root = document.documentElement;
     const apply = (resolved: 'light' | 'dark') => {
       root.classList.remove('light', 'dark');
       root.classList.add(resolved);
     };
     if (theme === 'system') {
       const mq = window.matchMedia('(prefers-color-scheme: dark)');
       apply(mq.matches ? 'dark' : 'light');
       const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
       mq.addEventListener('change', handler);
       return () => mq.removeEventListener('change', handler);
     }
     apply(theme);
   }, [theme]);
   
   const { biometricLockEnabled, biometricLockTimeout, hasSeenSplash, setHasSeenSplash } = useSettingsStore();
    const { isLocked, isAvailable, biometryType, isAuthenticating, authenticate } = useBiometricLock(biometricLockEnabled, biometricLockTimeout);
    const location = useLocation();

    const isPublicStandalone = location.pathname.startsWith('/p/')
      || location.pathname.startsWith('/share/')
      || location.pathname.startsWith('/l/');

    useEffect(() => {
      const handleRejection = (event: PromiseRejectionEvent) => {
        console.error("Unhandled rejection:", event.reason);
        toast.error("Something went wrong. Please try again.");
        event.preventDefault();
      };

      window.addEventListener("unhandledrejection", handleRejection);
      return () => window.removeEventListener("unhandledrejection", handleRejection);
    }, []);
    
     if (!hasSeenSplash && !isPublicStandalone) {
       return <AnimatedSplash onComplete={() => setHasSeenSplash(true)} />;
     }

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
        <SkyWallpaper />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
           <Route element={<AppShell />}>
              <Route path="/auth" element={<Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>} />
              <Route path="/sign-in" element={<Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>} />
              <Route path="/auth/callback" element={<Suspense fallback={<PageLoadingSpinner />}><AuthCallbackPage /></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageLoadingSpinner />}><PrivacyPage /></Suspense>} />
               <Route path="/terms" element={<Suspense fallback={<PageLoadingSpinner />}><TermsPage /></Suspense>} />
               <Route path="/reset-password" element={<Suspense fallback={<PageLoadingSpinner />}><ResetPasswordPage /></Suspense>} />
           </Route>

          {/* Protected routes */}
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
                 <Route path="/help" element={<Suspense fallback={<DetailSkeleton />}><HelpPage /></Suspense>} />
                 <Route path="/analytics" element={<Suspense fallback={<AnalyticsSkeleton />}><AnalyticsPage /></Suspense>} />
                 <Route path="/subscription" element={<Suspense fallback={<DetailSkeleton />}><SubscriptionPage /></Suspense>} />
                 <Route path="/referral" element={<Suspense fallback={<DetailSkeleton />}><ReferralPage /></Suspense>} />
                 <Route path="/achievements" element={<Suspense fallback={<AchievementsSkeleton />}><AchievementsPage /></Suspense>} />
                 <Route path="/qr-code" element={<Suspense fallback={<DetailSkeleton />}><QrCodePage /></Suspense>} />
                 <Route path="/qr-batch" element={<Suspense fallback={<DetailSkeleton />}><QrBatchPage /></Suspense>} />
                 <Route path="/qr-scan" element={<Suspense fallback={<DetailSkeleton />}><QrScanPage /></Suspense>} />
                 <Route path="/activity" element={<Navigate to="/applications" replace />} />
                 <Route path="/jobs/:id" element={<RedirectJobRoute />} />
                 <Route path="/jobs" element={<Navigate to="/applications" replace />} />
              </Route>
           </Route>

        {/* Public share page - outside AppShell */}
        <Route path="/share/:token" element={<Suspense fallback={<ShareSkeleton />}><SharePage /></Suspense>} />
        <Route path="/p/:username" element={<Suspense fallback={<DetailSkeleton />}><PublicPortfolioPage /></Suspense>} />
        <Route path="/l/:linkId" element={<Suspense fallback={<DetailSkeleton />}><ShortLinkPage /></Suspense>} />

        {/* Internal tooling */}
        <Route element={<ProtectedRoute />}>
          <Route path="/store-screenshots" element={<Suspense fallback={<PageLoadingSpinner />}><StoreScreenshotsPage /></Suspense>} />
          <Route path="/screenshots-gallery" element={<Suspense fallback={<PageLoadingSpinner />}><ScreenshotsGalleryPage /></Suspense>} />
        </Route>
        
        <Route path="*" element={<Suspense fallback={<DetailSkeleton />}><NotFound /></Suspense>} />
      </Routes>
      
      </>
    );
 }

function DeferredProviders() {
  const [ready, setReady] = useState(false);
  const location = useLocation();
  const isPublicStandalone = location.pathname.startsWith('/p/')
    || location.pathname.startsWith('/share/')
    || location.pathname.startsWith('/l/');
  useEffect(() => { const t = setTimeout(() => setReady(true), 2000); return () => clearTimeout(t); }, []);
  if (!ready || isPublicStandalone) return null;
  return (
    <>
      <Suspense fallback={null}><CommandPalette /></Suspense>
      <Suspense fallback={null}><BugReportDialog /></Suspense>
    </>
  );
}

function AppInstallPrompt() {
  const location = useLocation();
  const isPublicStandalone = location.pathname.startsWith('/p/')
    || location.pathname.startsWith('/share/')
    || location.pathname.startsWith('/l/');
  if (isPublicStandalone) return null;
  return <InstallPrompt />;
}
 
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
                <DeferredProviders />
                <AppInstallPrompt />
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

import { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeepLinking } from "./hooks/useDeepLinking";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useBackButton } from "@/hooks/useBackButton";
import { useStatusBarThemeSync } from "@/hooks/useStatusBar";
import { useShakeDetect } from "@/hooks/useShakeDetect";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { BiometricLockScreen } from "@/components/BiometricLockScreen";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { useSettingsStore } from "@/store/settingsStore";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { JobSeekerRoute } from "@/components/layout/JobSeekerRoute";
import { WiseHireGuard } from "@/components/wisehire/WiseHireGuard";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { useAIKeyHydration } from "@/hooks/useAIKeyHydration";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { SuspendedScreen } from "@/components/layout/SuspendedScreen";
import { MaintenanceScreen } from "@/components/layout/MaintenanceScreen";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/hooks/useAuth";
import { AIPrivacyDisclosureProvider } from "@/components/ai/AIPrivacyDisclosureProvider";
import { BottomSheetProvider } from "@/context/BottomSheetContext";

import { KindeProvider } from "@kinde-oss/kinde-auth-react";
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
  AchievementsSkeleton } from
"@/components/layout/PageSkeletons";
import { PageLoadingSpinner } from "@/components/ui/PageLoadingSpinner";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

import { AnimatedSplash } from "@/components/AnimatedSplash";
const DevToolsPage = lazyWithRetry(() => import("./pages/DevToolsPage"));

const CommandPalette = lazyWithRetry(() => import("@/components/layout/CommandPalette"));

const BugReportDialog = lazyWithRetry(() => import("@/components/BugReportDialog"));
import { getSafeMatchMedia, isBrowser } from "@/lib/envUtils";

// Eagerly load Index for LCP
import Index from "./pages/Index";

// Kinde SPA configuration.
// These MUST be set as shared Replit env vars (VITE_KINDE_CLIENT_ID and
// VITE_KINDE_DOMAIN). They are public SPA credentials — not secrets — and
// are visible in the JS bundle by design. In development, a missing var
// triggers a console warning so auth still degrades gracefully rather than
// throwing at module initialization.
const KINDE_CLIENT_ID = import.meta.env.VITE_KINDE_CLIENT_ID as string | undefined;
const KINDE_DOMAIN = import.meta.env.VITE_KINDE_DOMAIN as string | undefined;

if (!KINDE_CLIENT_ID || !KINDE_DOMAIN) {
  console.warn(
    '[WiseResume] VITE_KINDE_CLIENT_ID or VITE_KINDE_DOMAIN is not set. ' +
    'Auth buttons will not work. Set these as shared env vars in Replit.'
  );
}

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
const AuthVerifyEmailPage = lazyWithRetry(() => import("./pages/AuthVerifyEmailPage"));
const AuthResetPasswordPage = lazyWithRetry(() => import("./pages/AuthResetPasswordPage"));

const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPage"));
const TermsPage = lazyWithRetry(() => import("./pages/TermsPage"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage"));
const WhatsNewPage = lazyWithRetry(() => import("./pages/WhatsNewPage"));
const HelpPage = lazyWithRetry(() => import("./pages/HelpPage"));
const WaitlistPage = lazyWithRetry(() => import("./pages/WaitlistPage"));
const InterviewReportPage = lazyWithRetry(() => import("./pages/InterviewReportPage"));
const AnalyticsPage = lazyWithRetry(() => import("./pages/AnalyticsPage"));
const SubscriptionPage = lazyWithRetry(() => import("./pages/SubscriptionPage"));
const ReferralPage = lazyWithRetry(() => import("./pages/ReferralPage"));
const AchievementsPage = lazyWithRetry(() => import("./pages/AchievementsPage"));
const StoreScreenshotsPage = lazyWithRetry(() => import("./pages/StoreScreenshotsPage"));
const ScreenshotsGalleryPage = lazyWithRetry(() => import("./pages/ScreenshotsGalleryPage"));
const QrCodePage = lazyWithRetry(() => import("./pages/QrCodePage"));
const QrBatchPage = lazyWithRetry(() => import("./pages/QrBatchPage"));
const QrScanPage = lazyWithRetry(() => import("./pages/QrScanPage"));
const KindeAuthTestPage = lazyWithRetry(() => import("./pages/KindeAuthTestPage"));
const InviteRedirectPage = lazyWithRetry(() => import("./pages/InviteRedirectPage"));
const SearchPage = lazyWithRetry(() => import("./pages/SearchPage"));
const TailorPage = lazyWithRetry(() => import("./pages/TailorPage"));

// WiseHire pages
const WiseHireSignupPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireSignupPage"));
const WiseHireDashboardPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireDashboardPage"));
const WiseHireOnboardingPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireOnboardingPage"));
const WiseHireSubscriptionPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireSubscriptionPage"));
const WiseHireSettingsPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireSettingsPage"));
const JDWriterPage = lazyWithRetry(() => import("./pages/wisehire/JDWriterPage"));
const BriefGeneratorPage = lazyWithRetry(() => import("./pages/wisehire/BriefGeneratorPage"));
const BriefViewPage = lazyWithRetry(() => import("./pages/wisehire/BriefViewPage"));
const PipelinePage = lazyWithRetry(() => import("./pages/wisehire/PipelinePage"));
const PublicBriefPage = lazyWithRetry(() => import("./pages/share/PublicBriefPage"));
const BulkScreenPage = lazyWithRetry(() => import("./pages/wisehire/BulkScreenPage"));
const ScorecardPage = lazyWithRetry(() => import("./pages/wisehire/ScorecardPage"));
const PublicScorecardPage = lazyWithRetry(() => import("./pages/wisehire/PublicScorecardPage"));
const TalentPoolPage = lazyWithRetry(() => import("./pages/wisehire/TalentPoolPage"));
const WiseHireAnalyticsPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireAnalyticsPage"));
const CandidateMaskingPage = lazyWithRetry(() => import("./pages/wisehire/CandidateMaskingPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function useIsPublicRoute() {
  const location = useLocation();
  return (
    location.pathname.startsWith('/p/') ||
    location.pathname.startsWith('/share/') ||
    location.pathname.startsWith('/l/') ||
    location.pathname.startsWith('/auth/callback')
  );
}

function FeatureGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) {
      toast.info("This feature isn't available right now.");
      navigate('/dashboard', { replace: true });
    }
  }, [enabled, navigate]);
  if (!enabled) return null;
  return <>{children}</>;
}

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
    }
  });

  // Theme persistence: settingsStore persists `theme` to localStorage via Zustand persist
  // (key: 'wiseresume-settings'). On startup, Zustand hydrates from localStorage first.
  // When theme === 'system', the resolved value falls back to matchMedia system preference.
  // No additional localStorage read is needed — the store already handles localStorage-first behavior.
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    if (!isBrowser) return;
    const root = document.documentElement;
    const apply = (resolved: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    };
    if (theme === 'system') {
      const mq = getSafeMatchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    apply(theme);
  }, [theme]);

  const { biometricLockEnabled, biometricLockTimeout, hasSeenSplash, setHasSeenSplash } = useSettingsStore();
  const { isLocked, isAvailable, biometryType, isAuthenticating, authenticate } = useBiometricLock(biometricLockEnabled, biometricLockTimeout);
  const { signOut } = useAuth();
  const location = useLocation();

  const [settingsHydrated, setSettingsHydrated] = useState(() => useSettingsStore.persist.hasHydrated());
  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated()) {
      setSettingsHydrated(true);
      return;
    }
    return useSettingsStore.persist.onFinishHydration(() => setSettingsHydrated(true));
  }, []);

  const isPublicStandalone = useIsPublicRoute();

  const { isSuspended, suspensionReason } = useSuspensionCheck();
  const appSettings = useAppSettings();

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("Something went wrong. Please try again.");
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  const isAdminRoute = location.pathname.startsWith('/devkit');

  if (!settingsHydrated && !isPublicStandalone && !isAdminRoute) {
    return null;
  }
  if (!hasSeenSplash && !isPublicStandalone && !isAdminRoute) {
    return <AnimatedSplash onComplete={() => setHasSeenSplash(true)} />;
  }

  if (isSuspended && !isPublicStandalone) {
    return <SuspendedScreen reason={suspensionReason} onSignOut={signOut} />;
  }

  if (appSettings.maintenance_mode && !isPublicStandalone && !isAdminRoute) {
    return <MaintenanceScreen />;
  }

  if (biometricLockEnabled && isLocked && isAvailable) {
    return (
      <BiometricLockScreen
        biometryType={biometryType}
        isAuthenticating={isAuthenticating}
        onAuthenticate={authenticate} />);


  }

  return (
    <>
        <AuroraLayer />
        {appSettings.announcement_enabled && appSettings.announcement_banner && (
          <AnnouncementBanner message={appSettings.announcement_banner} />
        )}
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
           <Route element={<AppShell />}>
               <Route path="/auth" element={<Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>} />
               <Route path="/sign-in" element={<Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense>} />
               
              <Route path="/auth/callback" element={<Suspense fallback={<PageLoadingSpinner />}><AuthCallbackPage /></Suspense>} />
              <Route path="/auth/verify-email" element={<Suspense fallback={<PageLoadingSpinner />}><AuthVerifyEmailPage /></Suspense>} />
              <Route path="/auth/reset-password" element={<Suspense fallback={<PageLoadingSpinner />}><AuthResetPasswordPage /></Suspense>} />
              <Route path="/privacy-policy" element={<Suspense fallback={<PageLoadingSpinner />}><PrivacyPage /></Suspense>} />
               <Route path="/terms-of-service" element={<Suspense fallback={<PageLoadingSpinner />}><TermsPage /></Suspense>} />
               
           </Route>

          {/* Public marketing routes — no AppShell, no auth required */}
          <Route path="/pricing" element={<Suspense fallback={<PageLoadingSpinner />}><PricingPage /></Suspense>} />
          <Route path="/whats-new" element={<Suspense fallback={<PageLoadingSpinner />}><WhatsNewPage /></Suspense>} />
          <Route path="/waitlist" element={<Suspense fallback={<PageLoadingSpinner />}><WaitlistPage /></Suspense>} />

          {/* WiseHire public routes */}
          <Route path="/wisehire/signup" element={<Suspense fallback={<PageLoadingSpinner />}><WiseHireSignupPage /></Suspense>} />

          {/* WiseHire protected routes — HR accounts only */}
          <Route element={<WiseHireGuard />}>
            <Route path="/wisehire/dashboard" element={<Suspense fallback={<PageLoadingSpinner />}><WiseHireDashboardPage /></Suspense>} />
            <Route path="/wisehire/onboarding" element={<Suspense fallback={<PageLoadingSpinner />}><WiseHireOnboardingPage /></Suspense>} />
            <Route path="/wisehire/subscription" element={<Suspense fallback={<PageLoadingSpinner />}><WiseHireSubscriptionPage /></Suspense>} />
            <Route path="/wisehire/settings" element={<Suspense fallback={<PageLoadingSpinner />}><WiseHireSettingsPage /></Suspense>} />
            <Route path="/wisehire/jd-writer" element={<Suspense fallback={<PageLoadingSpinner />}><JDWriterPage /></Suspense>} />
            <Route path="/wisehire/briefs" element={<Suspense fallback={<PageLoadingSpinner />}><BriefGeneratorPage /></Suspense>} />
            <Route path="/wisehire/briefs/:briefId" element={<Suspense fallback={<PageLoadingSpinner />}><BriefViewPage /></Suspense>} />
            <Route path="/wisehire/pipeline" element={<Suspense fallback={<PageLoadingSpinner />}><PipelinePage /></Suspense>} />
            <Route path="/wisehire/bulk-screen" element={<Suspense fallback={<PageLoadingSpinner />}><BulkScreenPage /></Suspense>} />
            <Route path="/wisehire/scorecards/:candidateId" element={<Suspense fallback={<PageLoadingSpinner />}><ScorecardPage /></Suspense>} />
            <Route path="/wisehire/talent-pool" element={<Suspense fallback={<PageLoadingSpinner />}><TalentPoolPage /></Suspense>} />
            <Route path="/wisehire/analytics" element={<Suspense fallback={<PageLoadingSpinner />}><WiseHireAnalyticsPage /></Suspense>} />
            <Route path="/wisehire/mask-cvs" element={<Suspense fallback={<PageLoadingSpinner />}><CandidateMaskingPage /></Suspense>} />
          </Route>

          {/* Protected routes */}
           <Route element={<ProtectedRoute />}>
             <Route element={<JobSeekerRoute />}>
             <Route element={<AppShell />}>
               <Route path="/dashboard" element={<Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense>} />
               <Route path="/editor" element={<Suspense fallback={<EditorSkeleton />}><EditorPage /></Suspense>} />
               <Route path="/preview" element={<Suspense fallback={<PreviewSkeleton />}><PreviewPage /></Suspense>} />
               <Route path="/upload" element={<Suspense fallback={<UploadSkeleton />}><UploadPage /></Suspense>} />
               <Route path="/settings" element={<Suspense fallback={<SettingsSkeleton />}><SettingsPage /></Suspense>} />
               <Route path="/interview" element={<FeatureGate enabled={appSettings.feature_interview_coach}><Suspense fallback={<InterviewSkeleton />}><InterviewPage /></Suspense></FeatureGate>} />
                <Route path="/applications" element={<FeatureGate enabled={appSettings.feature_applications}><Suspense fallback={<ApplicationsSkeleton />}><ApplicationsPage /></Suspense></FeatureGate>} />
                <Route path="/onboarding" element={<Suspense fallback={<OnboardingSkeleton />}><OnboardingPage /></Suspense>} />
                <Route path="/profile" element={<Suspense fallback={<ProfilePageSkeleton />}><ProfilePage /></Suspense>} />
                <Route path="/templates" element={<Suspense fallback={<TemplatesPageSkeleton />}><TemplatesPage /></Suspense>} />
                <Route path="/resume/:id" element={<Suspense fallback={<DetailSkeleton />}><ResumeDetailPage /></Suspense>} />
                <Route path="/job/:id" element={<Suspense fallback={<DetailSkeleton />}><JobDetailPage /></Suspense>} />
                <Route path="/application/:id" element={<FeatureGate enabled={appSettings.feature_applications}><Suspense fallback={<DetailSkeleton />}><ApplicationTrackerPage /></Suspense></FeatureGate>} />
                 <Route path="/notifications" element={<Suspense fallback={<NotificationsSkeleton />}><NotificationsPage /></Suspense>} />
                 <Route path="/portfolio" element={<FeatureGate enabled={appSettings.feature_portfolio}><Suspense fallback={<PortfolioEditorSkeleton />}><PortfolioEditorPage /></Suspense></FeatureGate>} />
                 
                 <Route path="/cover-letters" element={<FeatureGate enabled={appSettings.feature_cover_letters}><Suspense fallback={<CoverLettersSkeleton />}><CoverLettersPage /></Suspense></FeatureGate>} />
                <Route path="/cover-letter/new" element={<FeatureGate enabled={appSettings.feature_cover_letters}><Suspense fallback={<DetailSkeleton />}><CoverLetterNewPage /></Suspense></FeatureGate>} />
                <Route path="/cover-letter/edit/:id" element={<FeatureGate enabled={appSettings.feature_cover_letters}><Suspense fallback={<DetailSkeleton />}><CoverLetterEditPage /></Suspense></FeatureGate>} />
                <Route path="/examples" element={<Suspense fallback={<GuidesExamplesSkeleton />}><ExamplesPage /></Suspense>} />
                <Route path="/career" element={<FeatureGate enabled={appSettings.feature_career_advisor}><Suspense fallback={<DetailSkeleton />}><CareerPage /></Suspense></FeatureGate>} />
                <Route path="/resignation-letters" element={<Suspense fallback={<ResignationLettersSkeleton />}><ResignationLettersPage /></Suspense>} />
                <Route path="/resignation-letter/new" element={<Suspense fallback={<DetailSkeleton />}><ResignationLetterNewPage /></Suspense>} />
                <Route path="/resignation-letter/edit/:id" element={<Suspense fallback={<DetailSkeleton />}><ResignationLetterEditPage /></Suspense>} />
                <Route path="/guides" element={<Suspense fallback={<GuidesExamplesSkeleton />}><GuidesPage /></Suspense>} />
                <Route path="/guides/:slug" element={<Suspense fallback={<DetailSkeleton />}><GuidePage /></Suspense>} />
                 <Route path="/ai-studio" element={<FeatureGate enabled={appSettings.feature_ai_studio}><Suspense fallback={<AIStudioSkeleton />}><AIStudioPage /></Suspense></FeatureGate>} />
                 <Route path="/ai-studio/:tool" element={<FeatureGate enabled={appSettings.feature_ai_studio}><Suspense fallback={<AIStudioSkeleton />}><AIStudioPage /></Suspense></FeatureGate>} />
                 <Route path="/help" element={<Suspense fallback={<DetailSkeleton />}><HelpPage /></Suspense>} />
                 <Route path="/analytics" element={<Suspense fallback={<AnalyticsSkeleton />}><AnalyticsPage /></Suspense>} />
                 <Route path="/subscription" element={<Suspense fallback={<DetailSkeleton />}><SubscriptionPage /></Suspense>} />
                 <Route path="/referral" element={<Suspense fallback={<DetailSkeleton />}><ReferralPage /></Suspense>} />
                 <Route path="/achievements" element={<Suspense fallback={<AchievementsSkeleton />}><AchievementsPage /></Suspense>} />
                 <Route path="/qr-code" element={<Suspense fallback={<DetailSkeleton />}><QrCodePage /></Suspense>} />
                 <Route path="/qr-batch" element={<Suspense fallback={<DetailSkeleton />}><QrBatchPage /></Suspense>} />
                 <Route path="/qr-scan" element={<Suspense fallback={<DetailSkeleton />}><QrScanPage /></Suspense>} />
                 <Route path="/activity" element={<Navigate to="/applications" replace />} />
                 <Route path="/resume" element={<Navigate to="/editor" replace />} />
                 <Route path="/search" element={<Suspense fallback={<PageLoadingSpinner />}><SearchPage /></Suspense>} />
                 <Route path="/tailor" element={<Suspense fallback={<PageLoadingSpinner />}><TailorPage /></Suspense>} />
                 <Route path="/tailor/:resumeId" element={<Suspense fallback={<PageLoadingSpinner />}><TailorPage /></Suspense>} />
              </Route>
             </Route>
           </Route>

        {/* Invite referral redirect — public so unauthenticated users can follow the link */}
        <Route path="/invite/:code" element={<Suspense fallback={<PageLoadingSpinner />}><InviteRedirectPage /></Suspense>} />

        {/* Public share page - outside AppShell */}
        <Route path="/share/:token" element={<Suspense fallback={<ShareSkeleton />}><SharePage /></Suspense>} />
        <Route path="/share/brief/:shareToken" element={<Suspense fallback={<PageLoadingSpinner />}><PublicBriefPage /></Suspense>} />
        <Route path="/share/scorecard/:shareToken" element={<Suspense fallback={<PageLoadingSpinner />}><PublicScorecardPage /></Suspense>} />
        <Route path="/interview/report/:token" element={<Suspense fallback={<PageLoadingSpinner />}><InterviewReportPage /></Suspense>} />
        <Route path="/p/:username" element={<Suspense fallback={<DetailSkeleton />}><PublicPortfolioPage /></Suspense>} />
        <Route path="/l/:linkId" element={<Suspense fallback={<DetailSkeleton />}><ShortLinkPage /></Suspense>} />

        {/* Kinde auth test — isolated, no Supabase interaction */}
        <Route path="/kinde-auth-test" element={<Suspense fallback={<PageLoadingSpinner />}><KindeAuthTestPage /></Suspense>} />

        {/* Internal tooling */}
        <Route element={<ProtectedRoute />}>
          <Route path="/store-screenshots" element={<Suspense fallback={<PageLoadingSpinner />}><StoreScreenshotsPage /></Suspense>} />
          <Route path="/screenshots-gallery" element={<Suspense fallback={<PageLoadingSpinner />}><ScreenshotsGalleryPage /></Suspense>} />
        </Route>

        {/* DevKit — self-contained email+password auth, no Kinde/Supabase session required */}
        <Route path="/devkit" element={<Suspense fallback={<PageLoadingSpinner />}><DevToolsPage /></Suspense>} />
        
        <Route path="*" element={<Suspense fallback={<DetailSkeleton />}><NotFound /></Suspense>} />
      </Routes>
      
      <PrefetchOnIdle />
      </>);

}

const AURORA_PUBLIC_PATHS = ['/', '/pricing', '/whats-new', '/sign-in'];

function AuroraLayer() {
  const location = useLocation();
  const path = location.pathname;
  const isPublicPage =
    AURORA_PUBLIC_PATHS.includes(path) ||
    path.startsWith('/auth') ||
    path.startsWith('/p/');

  const theme = useSettingsStore((s) => s.theme);
  const lpProduct = useSettingsStore((s) => s.lpProduct);
  const isLandingPage = path === '/';
  const effectiveLpProduct = isLandingPage ? lpProduct : 'jobseeker';

  useEffect(() => {
    if (!isPublicPage) return;
    const body = document.body;
    const prevBodyBg = body.style.backgroundColor;

    const isDark =
      theme === 'dark'
        ? true
        : theme === 'light'
        ? false
        : getSafeMatchMedia('(prefers-color-scheme: dark)').matches;

    const isWiseHire = effectiveLpProduct === 'wisehire';
    body.style.backgroundColor = isWiseHire
      ? (isDark ? '#00061a' : '#f0f5ff')
      : (isDark ? '#0a0000' : '#fff5f5');
    document.documentElement.classList.add('aurora-active');
    return () => {
      body.style.backgroundColor = prevBodyBg;
      document.documentElement.classList.remove('aurora-active');
    };
  }, [isPublicPage, theme, effectiveLpProduct]);

  if (!isPublicPage) return null;
  return <AuroraBackground product={effectiveLpProduct} />;
}

function PrefetchOnIdle() {
  useEffect(() => {
    const prefetch = () => {
      void import("./pages/DashboardPage");
      void import("./pages/UploadPage");
      void import("./pages/EditorPage");
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(prefetch, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(prefetch, 3000);
    return () => clearTimeout(t);
  }, []);
  return null;
}

function DeferredProviders() {
  const [ready, setReady] = useState(false);
  const isPublicStandalone = useIsPublicRoute();
  useEffect(() => {const t = setTimeout(() => setReady(true), 2000);return () => clearTimeout(t);}, []);
  if (!ready || isPublicStandalone) return null;
  return (
    <>
      <Suspense fallback={null}><CommandPalette /></Suspense>
      <Suspense fallback={null}><BugReportDialog /></Suspense>
    </>);

}

function AppInstallPrompt() {
  const isPublicStandalone = useIsPublicRoute();
  if (isPublicStandalone) return null;
  return <InstallPrompt />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
             <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
               <KindeProvider
              clientId={KINDE_CLIENT_ID ?? ''}
              domain={KINDE_DOMAIN ?? ''}
              redirectUri={window.location.origin + '/auth/callback'}
              logoutUri={window.location.origin}>
              
               <AuthProvider>
                <BottomSheetProvider>
                <AIPrivacyDisclosureProvider>
                <AppRoutes />
                <DeferredProviders />
                <AppInstallPrompt />
                </AIPrivacyDisclosureProvider>
                </BottomSheetProvider>
               </AuthProvider>
               </KindeProvider>
             </BrowserRouter>
          </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>);

};

export default App;

import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from 'sonner';
import { MotionConfig, useReducedMotion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDeepLinking } from "./hooks/useDeepLinking";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useBackButton } from "@/hooks/useBackButton";
import { useStatusBarThemeSync } from "@/hooks/useStatusBar";
import { useShakeDetect } from "@/hooks/useShakeDetect";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { BiometricLockScreen } from "@/components/BiometricLockScreen";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { useSettingsStore } from "@/store/settingsStore";
import { useResumeStore } from "@/store/resumeStore";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { JobSeekerRoute } from "@/components/layout/JobSeekerRoute";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { WiseHireGuard } from "@/components/wisehire/WiseHireGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { SuspendedScreen } from "@/components/layout/SuspendedScreen";
import { MaintenanceScreen } from "@/components/layout/MaintenanceScreen";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { BroadcastBanner, MaintenanceCountdown } from "@/components/layout/BroadcastBanner";
import { ActingAsBanner } from "@/components/layout/ActingAsBanner";
import { isImpersonating, subscribe as subscribeImpersonation } from "@/lib/impersonationStore";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/hooks/useAuth";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { ConsentBanner } from "@/components/layout/ConsentBanner";
import { isAppHostname, usePublicPortfolioByDomain } from "@/hooks/usePublicPortfolio";
import { AIPrivacyDisclosureProvider } from "@/components/ai/AIPrivacyDisclosureProvider";
import { BottomSheetProvider } from "@/context/BottomSheetContext";

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
  LandingSkeleton } from
"@/components/layout/PageSkeletons";
import { PageLoadingSpinner } from "@/components/ui/PageLoadingSpinner";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const DevToolsPage = lazyWithRetry(() => import("./pages/DevToolsPage"));
const CommandPalette = lazyWithRetry(() => import("@/components/layout/CommandPalette"));
const BugReportDialog = lazyWithRetry(() => import("@/components/BugReportDialog"));
import { AuroraLayer } from "@/components/landing/AuroraLayer";
import { getSafeMatchMedia, isBrowser } from "@/lib/envUtils";

const Index = lazyWithRetry(() => import("./pages/Index"));

// Lazy load other pages
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
const WiseHireTermsPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireTermsPage"));
const WiseHirePrivacyPage = lazyWithRetry(() => import("./pages/wisehire/WiseHirePrivacyPage"));
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
const InviteRedirectPage = lazyWithRetry(() => import("./pages/InviteRedirectPage"));
const SearchPage = lazyWithRetry(() => import("./pages/SearchPage"));
const TailorPage = lazyWithRetry(() => import("./pages/TailorPage"));
const TailoringHubPage = lazyWithRetry(() => import("./pages/TailoringHubPage"));
const TailoringHubResultPage = lazyWithRetry(() => import("./pages/TailoringHubResultPage"));
const EnterprisePage = lazyWithRetry(() => import("./pages/wisehire/EnterprisePage"));
const WiseHireSignupPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireSignupPage"));
const WiseHireEarlyAccessPage = lazyWithRetry(() => import("./pages/wisehire/WiseHireEarlyAccessPage"));
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
const ClientsPage = lazyWithRetry(() => import("./pages/wisehire/ClientsPage"));
const ScorecardTemplatesPage = lazyWithRetry(() => import("./pages/wisehire/ScorecardTemplatesPage"));
const RolesPage = lazyWithRetry(() => import("./pages/wisehire/RolesPage"));

function CustomDomainPortfolioWrapper({ hostname }: { hostname: string }) {
  const { data, isLoading } = usePublicPortfolioByDomain(hostname);
  if (isLoading) return <DetailSkeleton />;
  if (!data?.profile?.username) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm p-8 text-center">
        Portfolio not found for this domain.
      </div>
    );
  }
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PublicPortfolioPage usernameOverride={data.profile.username} />
    </Suspense>
  );
}

function useIsPublicRoute() {
  const location = useLocation();
  return (
    location.pathname.startsWith('/p/') ||
    location.pathname.startsWith('/share/') ||
    location.pathname.startsWith('/l/') ||
    location.pathname.startsWith('/auth/callback')
  );
}

function FeatureGate({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
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

function LegacyCoverLetterRedirect() {
  const { search, state } = useLocation();
  return <Navigate to={`/cover-letter/new${search}`} replace state={state} />;
}

function RouteEB({ children }: { children: ReactNode }) {
  function handleReset() {
    useResumeStore.persist.rehydrate();
  }
  return <ErrorBoundary routeScoped onReset={handleReset}>{children}</ErrorBoundary>;
}

function AppRoutes() {
  useBackButton();
  useStatusBarThemeSync();
  useDeepLinking();

  useEffect(() => {
    document.body.style.overflow = '';
  }, []);

  const shakeToReportEnabled = useSettingsStore((s) => s.shakeToReportEnabled);
  const biometricLockEnabled = useSettingsStore((s) => s.biometricLockEnabled);
  const biometricLockTimeout = useSettingsStore((s) => s.biometricLockTimeout);
  useShakeDetect(shakeToReportEnabled);

  useAppLifecycle({
    onBackground: () => {
      window.dispatchEvent(new CustomEvent('app:save-draft'));
    }
  });

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

  const { isLocked, isAvailable, biometryType, isAuthenticating, authenticate } = useBiometricLock(biometricLockEnabled, biometricLockTimeout);
  const { signOut, user } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicStandalone = useIsPublicRoute();
  const { isSuspended, suspensionReason } = useSuspensionCheck();
  const appSettings = useAppSettings();
  const customDomainHostname = !isAppHostname(window.location.hostname) ? window.location.hostname : null;

  useVisitorTracking({
    userId: user?.id ?? null,
    enabled: !isPublicStandalone,
  });

  // Cmd+Shift+A — admin quick-access shortcut (only fires when admin is signed in)
  useEffect(() => {
    if (!isAdmin) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        navigate('/devkit');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAdmin, navigate]);

  if (customDomainHostname) {
    return <CustomDomainPortfolioWrapper hostname={customDomainHostname} />;
  }

  if (isSuspended && !isPublicStandalone) {
    return <SuspendedScreen reason={suspensionReason} onSignOut={signOut} />;
  }

  const isAdminRoute = location.pathname.startsWith('/devkit');
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

  const isAuthRoute = location.pathname.startsWith('/auth');

  return (
    <>
        {!isAuthRoute && !isPublicStandalone && <ConsentBanner />}
        <AuroraLayer />
        {appSettings.announcement_enabled && appSettings.announcement_banner && (
          <AnnouncementBanner message={appSettings.announcement_banner} />
        )}
        <BroadcastBanner />
        <MaintenanceCountdown
          windowStart={appSettings.maintenance_window_start}
          windowEnd={appSettings.maintenance_window_end}
        />
        <Routes>
          <Route path="/" element={<RouteEB><Suspense fallback={<LandingSkeleton />}><Index /></Suspense></RouteEB>} />
          <Route path="/enterprises" element={<RouteEB><Suspense fallback={<LandingSkeleton />}><Index /></Suspense></RouteEB>} />
           <Route element={<AppShell />}>
               <Route path="/auth" element={<RouteEB><Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense></RouteEB>} />
               <Route path="/sign-in" element={<RouteEB><Suspense fallback={<AuthSkeleton />}><AuthPage /></Suspense></RouteEB>} />
              <Route path="/auth/callback" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><AuthCallbackPage /></Suspense></RouteEB>} />
              <Route path="/auth/verify-email" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><AuthVerifyEmailPage /></Suspense></RouteEB>} />
              <Route path="/auth/reset-password" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><AuthResetPasswordPage /></Suspense></RouteEB>} />
              <Route path="/privacy-policy" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><PrivacyPage /></Suspense></RouteEB>} />
               <Route path="/terms-of-service" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><TermsPage /></Suspense></RouteEB>} />
           </Route>

          <Route path="/pricing" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><PricingPage /></Suspense></RouteEB>} />
          <Route path="/whats-new" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WhatsNewPage /></Suspense></RouteEB>} />
          <Route path="/waitlist" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WaitlistPage /></Suspense></RouteEB>} />
          <Route path="/enterprise" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><EnterprisePage /></Suspense></RouteEB>} />

          <Route path="/wisehire/signup" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireSignupPage /></Suspense></RouteEB>} />
          <Route path="/wisehire/signup-early-access/:code" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireEarlyAccessPage /></Suspense></RouteEB>} />
          <Route path="/wisehire/terms-of-service" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireTermsPage /></Suspense></RouteEB>} />
          <Route path="/wisehire/privacy-policy" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHirePrivacyPage /></Suspense></RouteEB>} />

          <Route element={<WiseHireGuard />}>
            <Route path="/wisehire/dashboard" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireDashboardPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/onboarding" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireOnboardingPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/subscription" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireSubscriptionPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/settings" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireSettingsPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/jd-writer" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><JDWriterPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/briefs" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><BriefGeneratorPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/briefs/:briefId" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><BriefViewPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/pipeline" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><PipelinePage /></Suspense></RouteEB>} />
            <Route path="/wisehire/bulk-screen" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><BulkScreenPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/scorecards/:candidateId" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><ScorecardPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/talent-pool" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><TalentPoolPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/analytics" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><WiseHireAnalyticsPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/mask-cvs" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><CandidateMaskingPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/clients" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><ClientsPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/scorecard-templates" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><ScorecardTemplatesPage /></Suspense></RouteEB>} />
            <Route path="/wisehire/roles" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><RolesPage /></Suspense></RouteEB>} />
          </Route>

           <Route element={<ProtectedRoute />}>
             <Route element={<JobSeekerRoute />}>
             <Route element={<AppShell />}>
               <Route path="/dashboard" element={<RouteEB><Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense></RouteEB>} />
               <Route path="/editor" element={<RouteEB><Suspense fallback={<EditorSkeleton />}><EditorPage /></Suspense></RouteEB>} />
               <Route path="/preview" element={<RouteEB><Suspense fallback={<PreviewSkeleton />}><PreviewPage /></Suspense></RouteEB>} />
               <Route path="/upload" element={<RouteEB><Suspense fallback={<UploadSkeleton />}><UploadPage /></Suspense></RouteEB>} />
               <Route path="/settings" element={<RouteEB><Suspense fallback={<SettingsSkeleton />}><SettingsPage /></Suspense></RouteEB>} />
               <Route path="/interview" element={<RouteEB><FeatureGate enabled={appSettings.feature_interview_coach}><Suspense fallback={<InterviewSkeleton />}><InterviewPage /></Suspense></FeatureGate></RouteEB>} />
                <Route path="/applications" element={<RouteEB><FeatureGate enabled={appSettings.feature_applications}><Suspense fallback={<ApplicationsSkeleton />}><ApplicationsPage /></Suspense></FeatureGate></RouteEB>} />
                <Route path="/onboarding" element={<RouteEB><Suspense fallback={<OnboardingSkeleton />}><OnboardingPage /></Suspense></RouteEB>} />
                <Route path="/profile" element={<RouteEB><Suspense fallback={<ProfilePageSkeleton />}><ProfilePage /></Suspense></RouteEB>} />
                <Route path="/templates" element={<RouteEB><Suspense fallback={<TemplatesPageSkeleton />}><TemplatesPage /></Suspense></RouteEB>} />
                <Route path="/resume/:id" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><ResumeDetailPage /></Suspense></RouteEB>} />
                <Route path="/job/:id" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><JobDetailPage /></Suspense></RouteEB>} />
                <Route path="/application/:id" element={<RouteEB><FeatureGate enabled={appSettings.feature_applications}><Suspense fallback={<DetailSkeleton />}><ApplicationTrackerPage /></Suspense></FeatureGate></RouteEB>} />
                 <Route path="/notifications" element={<RouteEB><Suspense fallback={<NotificationsSkeleton />}><NotificationsPage /></Suspense></RouteEB>} />
                 <Route path="/portfolio" element={<RouteEB><FeatureGate enabled={appSettings.feature_portfolio}><Suspense fallback={<PortfolioEditorSkeleton />}><PortfolioEditorPage /></Suspense></FeatureGate></RouteEB>} />
                 <Route path="/cover-letters" element={<RouteEB><FeatureGate enabled={appSettings.feature_cover_letters}><Suspense fallback={<CoverLettersSkeleton />}><CoverLettersPage /></Suspense></FeatureGate></RouteEB>} />
                <Route path="/cover-letter/new" element={<RouteEB><FeatureGate enabled={appSettings.feature_cover_letters}><Suspense fallback={<DetailSkeleton />}><CoverLetterNewPage /></Suspense></FeatureGate></RouteEB>} />
                <Route path="/cover-letter/edit/:id" element={<RouteEB><FeatureGate enabled={appSettings.feature_cover_letters}><Suspense fallback={<DetailSkeleton />}><CoverLetterEditPage /></Suspense></FeatureGate></RouteEB>} />
                <Route path="/cover-letter" element={<RouteEB><LegacyCoverLetterRedirect /></RouteEB>} />
                <Route path="/examples" element={<RouteEB><Suspense fallback={<GuidesExamplesSkeleton />}><ExamplesPage /></Suspense></RouteEB>} />
                <Route path="/career" element={<RouteEB><FeatureGate enabled={appSettings.feature_career_advisor}><Suspense fallback={<DetailSkeleton />}><CareerPage /></Suspense></FeatureGate></RouteEB>} />
                <Route path="/resignation-letters" element={<RouteEB><Suspense fallback={<ResignationLettersSkeleton />}><ResignationLettersPage /></Suspense></RouteEB>} />
                <Route path="/resignation-letter/new" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><ResignationLetterNewPage /></Suspense></RouteEB>} />
                <Route path="/resignation-letter/edit/:id" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><ResignationLetterEditPage /></Suspense></RouteEB>} />
                <Route path="/guides" element={<RouteEB><Suspense fallback={<GuidesExamplesSkeleton />}><GuidesPage /></Suspense></RouteEB>} />
                <Route path="/guides/:slug" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><GuidePage /></Suspense></RouteEB>} />
                 <Route path="/ai-studio" element={<RouteEB><FeatureGate enabled={appSettings.feature_ai_studio}><Suspense fallback={<AIStudioSkeleton />}><AIStudioPage /></Suspense></FeatureGate></RouteEB>} />
                 <Route path="/ai-studio/:tool" element={<RouteEB><FeatureGate enabled={appSettings.feature_ai_studio}><Suspense fallback={<AIStudioSkeleton />}><AIStudioPage /></Suspense></FeatureGate></RouteEB>} />
                 <Route path="/help" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><HelpPage /></Suspense></RouteEB>} />
                 <Route path="/analytics" element={<RouteEB><Suspense fallback={<AnalyticsSkeleton />}><AnalyticsPage /></Suspense></RouteEB>} />
                 <Route path="/subscription" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><SubscriptionPage /></Suspense></RouteEB>} />
                 <Route path="/referral" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><ReferralPage /></Suspense></RouteEB>} />
                 <Route path="/achievements" element={<RouteEB><Suspense fallback={<AchievementsSkeleton />}><AchievementsPage /></Suspense></RouteEB>} />
                 <Route path="/qr-code" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><QrCodePage /></Suspense></RouteEB>} />
                 <Route path="/qr-batch" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><QrBatchPage /></Suspense></RouteEB>} />
                 <Route path="/qr-scan" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><QrScanPage /></Suspense></RouteEB>} />
                 <Route path="/search" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><SearchPage /></Suspense></RouteEB>} />
                 <Route path="/tailor" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><TailorPage /></Suspense></RouteEB>} />
                 <Route path="/tailor/:resumeId" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><TailorPage /></Suspense></RouteEB>} />
                 <Route path="/tailoring-hub" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><TailoringHubPage /></Suspense></RouteEB>} />
                 <Route path="/tailoring-hub/result/:resumeId" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><TailoringHubResultPage /></Suspense></RouteEB>} />
              </Route>
             </Route>
           </Route>

        <Route path="/invite/:code" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><InviteRedirectPage /></Suspense></RouteEB>} />
        <Route path="/share/:token" element={<RouteEB><Suspense fallback={<ShareSkeleton />}><SharePage /></Suspense></RouteEB>} />
        <Route path="/share/brief/:shareToken" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><PublicBriefPage /></Suspense></RouteEB>} />
        <Route path="/share/scorecard/:shareToken" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><PublicScorecardPage /></Suspense></RouteEB>} />
        <Route path="/interview/report/:token" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><InterviewReportPage /></Suspense></RouteEB>} />
        <Route path="/p/:username" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><PublicPortfolioPage /></Suspense></RouteEB>} />
        <Route path="/l/:linkId" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><ShortLinkPage /></Suspense></RouteEB>} />

        <Route element={<ProtectedRoute />}>
          <Route path="/store-screenshots" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><StoreScreenshotsPage /></Suspense></RouteEB>} />
          <Route path="/screenshots-gallery" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><ScreenshotsGalleryPage /></Suspense></RouteEB>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminRoute />}>
            <Route path="/devkit" element={<RouteEB><Suspense fallback={<PageLoadingSpinner />}><DevToolsPage /></Suspense></RouteEB>} />
          </Route>
        </Route>
        <Route path="*" element={<RouteEB><Suspense fallback={<DetailSkeleton />}><NotFound /></Suspense></RouteEB>} />
      </Routes>
      <PrefetchOnIdle />
      </>);
}

function PrefetchOnIdle() {
  const location = useLocation();
  useEffect(() => {
    if (!['/dashboard', '/upload', '/editor'].some(path => location.pathname.startsWith(path))) {
      return;
    }
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
  }, [location.pathname]);
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

function MotionConfigProvider({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
}

// Reads impersonation state outside AuthProvider so we can offset the layout
// by the banner height (≈40px) without prop-drilling through the auth tree.
function useImpersonatingBanner(): boolean {
  return useSyncExternalStore(
    subscribeImpersonation,
    () => isImpersonating(),
    () => false,
  );
}

const AppInterior = () => {
  const showingImpersonationBanner = useImpersonatingBanner();

  return (
    <MotionConfigProvider>
      <Toaster />
      <ActingAsBanner />
      {/* Push all app content below the fixed impersonation banner so it is
          never obscured. The banner is ~40px tall (py-2 + one text line). */}
      <div className={showingImpersonationBanner ? 'pt-10' : undefined}>
        <AuthProvider>
          <BottomSheetProvider>
            <AIPrivacyDisclosureProvider>
              <AppRoutes />
              <DeferredProviders />
            </AIPrivacyDisclosureProvider>
          </BottomSheetProvider>
        </AuthProvider>
      </div>
    </MotionConfigProvider>
  );
};

export default AppInterior;

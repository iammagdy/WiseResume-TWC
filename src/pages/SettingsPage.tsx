import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { getAppUrl } from '@/lib/portfolioUrl';

import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ScrollText, X, Check } from
'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { openExternal } from '@/lib/openExternal';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { PlanAvatar } from '@/components/ui/PlanAvatar';
import { useSettingsStore } from '@/store/settingsStore';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { toast } from 'sonner';
import { AppIcon } from '@/components/brand/AppIcon';
import { BackButton } from '@/components/ui/BackButton';
import { SettingsSkeleton } from '@/components/layout/PageSkeletons';
import { getChangelog } from '@/hooks/useChangelogBadge';
import developerPhoto from '@/assets/developer-photo.png';

// Lazy-loaded sheets
const EditProfileSheet = lazy(() => import('@/components/settings/EditProfileSheet').then((m) => ({ default: m.EditProfileSheet })));
const DataExportSheet = lazy(() => import('@/components/settings/DataExportSheet').then((m) => ({ default: m.DataExportSheet })));
const DeleteDataDialog = lazy(() => import('@/components/settings/DeleteDataDialog').then((m) => ({ default: m.DeleteDataDialog })));
const BiometricSetupSheet = lazy(() => import('@/components/settings/BiometricSetupSheet').then((m) => ({ default: m.BiometricSetupSheet })));
const BiometricTimeoutSheet = lazy(() => import('@/components/settings/BiometricTimeoutSheet').then((m) => ({ default: m.BiometricTimeoutSheet })));
const ElevenLabsKeySheet = lazy(() => import('@/components/settings/ElevenLabsKeySheet').then((m) => ({ default: m.ElevenLabsKeySheet })));
const AISettingsSheet = lazy(() => import('@/components/settings/AISettingsSheet').then((m) => ({ default: m.AISettingsSheet })));
const HelpSheet = lazy(() => import('@/components/settings/HelpSheet').then((m) => ({ default: m.HelpSheet })));
const DeveloperCreditCard = lazy(() => import('@/components/settings/DeveloperCreditCard').then((m) => ({ default: m.DeveloperCreditCard })));

// Extracted section components
import { AccountSection } from '@/components/settings/sections/AccountSection';
import { AppearanceSection } from '@/components/settings/sections/AppearanceSection';
import { AIVoiceSection } from '@/components/settings/sections/AIVoiceSection';
import { EditorExportSection } from '@/components/settings/sections/EditorExportSection';
import { NotificationsSection } from '@/components/settings/sections/NotificationsSection';
import { PrivacySection } from '@/components/settings/sections/PrivacySection';
import { AboutSection } from '@/components/settings/sections/AboutSection';
import { DangerZoneSection } from '@/components/settings/sections/DangerZoneSection';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-4 mb-1.5">
      {children}
    </h2>
  );
}

function UserIdCard({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(userId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border hover:bg-muted/60 transition-colors text-left"
      title="Tap to copy your User ID"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">Your User ID</p>
        <p className="font-mono text-xs text-foreground truncate">{userId}</p>
        <p className="text-xs text-muted-foreground mt-1">Share this ID with support if you need help with your account.</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{copied ? '✓ Copied' : 'Copy'}</span>
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, supabaseSettled, signOut } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { plan } = usePlan();
  const { data: resumes = [] } = useResumes();
  const { currentResumeId } = useResumeStore();

  const {
    biometricLockEnabled,
    setBiometricLockEnabled,
    elevenlabsApiKey,
    setElevenlabsApiKey,
    setHasSeenSplash
  } = useSettingsStore();

  const { isAvailable: biometricAvailable, biometryType, authenticate } = useBiometricLock(biometricLockEnabled);

  // Sheet states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [dataExportSheetOpen, setDataExportSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [biometricSetupOpen, setBiometricSetupOpen] = useState(false);
  const [biometricTimeoutOpen, setBiometricTimeoutOpen] = useState(false);
  const [elevenLabsKeyOpen, setElevenLabsKeyOpen] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  // Dynamic changelog
  const [changelogData, setChangelogData] = useState<Array<{version: string;date: string;latest?: boolean;summary?: string;items: Array<{title: string;description: string;}>;}>>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState(false);
  const changelogFetchedAt = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('changelog') === 'true') {
      setChangelogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    getChangelog().then((data) => {
      setChangelogData(data as typeof changelogData);
      changelogFetchedAt.current = Date.now();
    });
  }, []);

  useEffect(() => {
    if (!changelogOpen) return;
    const age = Date.now() - changelogFetchedAt.current;
    if (changelogData.length > 0 && age < 5 * 60 * 1000) return;
    setChangelogLoading(true);
    setChangelogError(false);
    fetch('/changelog.json').
    then((r) => {if (!r.ok) throw new Error();return r.json();}).
    then((data) => {setChangelogData(data);changelogFetchedAt.current = Date.now();}).
    catch(() => {
      setChangelogError(true);
      toast.error('Failed to load changelog. Please check your connection.');
    }).
    finally(() => setChangelogLoading(false));
  }, [changelogOpen, changelogData.length]);

  const appVersion = changelogData[0]?.version || 'v2.0.0';

  const authProvider = 'kinde';

  // --- Handlers ---
  const handleBiometricToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      setBiometricSetupOpen(true);
    } else {
      setBiometricLockEnabled(false);
    }
  }, [setBiometricLockEnabled]);

  const handleBiometricSetupConfirm = useCallback(async () => {
    const ok = await authenticate();
    if (ok) setBiometricLockEnabled(true);
    return ok;
  }, [authenticate, setBiometricLockEnabled]);

  const handleSignOut = useCallback(() => {
    signOut();
    navigate('/');
    toast.success('Signed out successfully');
  }, [signOut, navigate]);

  const handleChangePassword = useCallback(async () => {
    // Password reset via Supabase Auth email flow
    toast.info('Password changes are managed through your account settings.');
  }, []);

  const handleDataDeleted = useCallback(async () => {
    try {
      await signOut();
    } catch {
      /* Ignorable error during biometric or data deletion flow */
    }
    toast.success('All data deleted');
    window.location.replace('/');
  }, [signOut]);

  const handleShareApp = useCallback(async () => {
    const shareData = {
      title: 'WiseResume',
      text: 'Build a professional resume in minutes with AI-powered writing assistance.',
      url: getAppUrl()
    };
    haptics.light();
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* User cancelled or sharing failed */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard');
      } catch { /* Clipboard access denied or failed */ }
    }
  }, []);

  const handleRateApp = useCallback(() => {
    haptics.light();
    openExternal(getAppUrl());
  }, []);

  const handleLanguage = useCallback(() => {
    haptics.light();
    toast('More languages coming soon!', { icon: '🌍' });
  }, []);

  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName.
      split(' ').
      map((w: string) => w[0]).
      filter(Boolean).
      slice(0, 2).
      join('').
      toUpperCase().
      slice(0, 2);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const displayName = profile?.fullName || user?.email || 'User';

  // Use standard skeleton for loading (D-2)
  if (loading || !supabaseSettled) return <SettingsSkeleton />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="pt-safe sticky top-0 z-10 pb-2 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-page-title">Settings</h1>
          </div>
        </header>

        {/* Content */}
        <div className="py-6 space-y-7 overflow-y-auto pb-24 lg:max-w-none mx-auto w-full">
          {/* Guest CTA */}
          {!user && <div className="px-4"><GuestCtaCard navigate={navigate} /></div>}

          {/* Profile Card */}
          <div className="px-4">
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-soft text-left active:scale-[0.98] transition-all touch-manipulation"
            >
              <PlanAvatar
                plan={plan}
                avatarUrl={profile?.avatarUrl}
                initials={getInitials()}
                size="h-14 w-14"
                showLabel
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{displayName}</p>
                {user?.email && (
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/subscription'); }}
                  className="text-xs text-primary/80 mt-0.5 hover:text-primary transition-colors"
                >
                  {plan === 'free' ? 'Free plan · Redeem a coupon to upgrade' : `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan · Manage subscription`}
                </button>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </button>
          </div>

          {/* Account */}
          {user && (
            <div>
              <SectionLabel>Account</SectionLabel>
              <div className="mx-4 space-y-3">
                <AccountSection
                  user={user}
                  authProvider={authProvider}
                  onChangePassword={handleChangePassword}
                  onSignOut={() => setSignOutConfirmOpen(true)}
                  onDeleteData={() => setDeleteDialogOpen(true)}
                />
                <UserIdCard userId={user.id} />
              </div>
            </div>
          )}

          {/* Appearance */}
          <div>
            <SectionLabel>Appearance</SectionLabel>
            <div className="mx-4">
              <AppearanceSection onLanguage={handleLanguage} />
            </div>
          </div>

          {/* AI & Voice */}
          <div>
            <SectionLabel>AI & Voice</SectionLabel>
            <div className="mx-4">
              <AIVoiceSection
                onOpenAISettings={() => setAISettingsOpen(true)}
                onOpenElevenLabsKey={() => setElevenLabsKeyOpen(true)}
              />
            </div>
          </div>

          {/* Editor & Export */}
          <div>
            <SectionLabel>Editor & Export</SectionLabel>
            <div className="mx-4">
              <EditorExportSection
                isSignedIn={!!user}
                onManageExports={() => setDataExportSheetOpen(true)}
                onNavigateAuth={() => navigate('/auth?mode=login')}
              />
            </div>
          </div>

          {/* Notifications */}
          <div>
            <SectionLabel>Notifications</SectionLabel>
            <div className="mx-4">
              <NotificationsSection />
            </div>
          </div>

          {/* Privacy & Security */}
          <div>
            <SectionLabel>Privacy & Security</SectionLabel>
            <div className="mx-4">
              <PrivacySection
                onOpenBiometricTimeout={() => setBiometricTimeoutOpen(true)}
                onBiometricToggle={handleBiometricToggle}
              />
            </div>
          </div>

          {/* About & Help */}
          <div>
            <SectionLabel>About & Help</SectionLabel>
            <div className="mx-4">
              <AboutSection
                isSignedIn={!!user}
                onTakeTour={async () => {
                  haptics.light();
                  if (user) {
                    await (await import('@/integrations/supabase/client')).supabase.from('profiles').update({ onboarding_completed: false }).eq('user_id', user.id);
                  } else {
                    localStorage.removeItem('wr-onboarding-seen');
                  }
                  toast.success('Onboarding reset — redirecting…');
                  navigate('/onboarding');
                }}
                onReplaySplash={() => {
                  haptics.light();
                  setHasSeenSplash(false);
                  toast.success('Replaying splash…');
                  navigate('/');
                }}
                onRateApp={handleRateApp}
                onShareApp={handleShareApp}
                onOpenHelp={() => setHelpSheetOpen(true)}
              />
            </div>
          </div>

          {/* Danger Zone */}
          {user && (
            <div>
              <SectionLabel>Danger Zone</SectionLabel>
              <div className="mx-4">
                <DangerZoneSection onDeleteData={() => setDeleteDialogOpen(true)} />
              </div>
            </div>
          )}

          {/* Developer Credit */}
          <div className="px-4">
            <Suspense fallback={null}>
              <DeveloperCreditCard
                name="Magdy Saber"
                title="Creator & Developer"
                avatarUrl={developerPhoto}
                websiteUrl="https://magdysaber.com"
                githubUrl="https://github.com/iammagdy"
                onContactClick={() => openExternal('mailto:contact@magdysaber.com')}
              />
            </Suspense>
          </div>

          {/* App Footer */}
          <div className="pt-2 pb-10">
            <div className="flex flex-col items-center gap-3 px-6 py-6">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-soft">
                <AppIcon size={48} showSparkle={false} className="w-full h-full" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-sm font-semibold text-foreground">WiseResume</h2>
                <span className="text-xs text-muted-foreground font-mono">
                  {appVersion}
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Made with <span className="text-red-500">❤️</span> in Egypt
              </p>
              <button
                type="button"
                onClick={() => setChangelogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/50 hover:bg-muted active:scale-95 transition text-sm text-muted-foreground font-medium touch-manipulation min-h-[44px]"
                >
                
                <ScrollText className="w-4 h-4 text-purple-400" />
                <span>Changelog</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/60 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sheets and Dialogs */}
      <Suspense fallback={null}>
        {editProfileOpen && user &&
        <EditProfileSheet
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          profile={profile}
          userId={user?.id}
          userEmail={user?.email}
          onSave={updateProfile} />

        }
        {dataExportSheetOpen &&
        <DataExportSheet
          open={dataExportSheetOpen}
          onOpenChange={setDataExportSheetOpen}
          resumes={resumes}
          userEmail={user?.email ?? null}
          userName={profile?.fullName ?? null}
          currentResumeId={currentResumeId} />

        }
        {deleteDialogOpen && user &&
        <DeleteDataDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userId={user.id}
          resumeCount={resumes.length}
          onDeleted={handleDataDeleted} />

        }
        {biometricSetupOpen &&
        <BiometricSetupSheet
          open={biometricSetupOpen}
          onOpenChange={setBiometricSetupOpen}
          biometryType={biometryType}
          onEnable={handleBiometricSetupConfirm} />

        }
        {biometricTimeoutOpen &&
        <BiometricTimeoutSheet
          open={biometricTimeoutOpen}
          onOpenChange={setBiometricTimeoutOpen}
          selectedTimeout={useSettingsStore.getState().biometricLockTimeout}
          onSelect={useSettingsStore.getState().setBiometricLockTimeout} />

        }
        {elevenLabsKeyOpen &&
        <ElevenLabsKeySheet
          open={elevenLabsKeyOpen}
          onOpenChange={setElevenLabsKeyOpen}
          currentKey={elevenlabsApiKey}
          onSave={setElevenlabsApiKey} />

        }
        {aiSettingsOpen &&
        <AISettingsSheet
          open={aiSettingsOpen}
          onOpenChange={setAISettingsOpen} />

        }
        {helpSheetOpen &&
        <HelpSheet
          open={helpSheetOpen}
          onOpenChange={setHelpSheetOpen} />

        }
      </Suspense>

      {/* Sign Out Confirmation */}
      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your resumes, cover letters, and application data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Changelog Dialog */}
      <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
        <DialogContent className="max-w-sm" hideCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>What's New</span>
            </DialogTitle>
            <DialogDescription>WiseResume release history</DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,calc(100dvh-10rem))] overflow-y-auto -mx-1 px-1">
            {changelogLoading ?
            <div className="space-y-6 pt-2">
                {[1, 2, 3].map((i) =>
              <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
              )}
              </div> :
            changelogError ?
            <p className="text-sm text-muted-foreground text-center py-8">Could not load changelog.</p> :

            <div className="relative pt-2">
                <div className="absolute left-[7px] top-4 bottom-4 w-px bg-border" />
                <div className="space-y-6">
                  {changelogData.map((release, idx) =>
                <div key={release.version} className="relative pl-6">
                      <div className={cn(
                    "absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center",
                    idx === 0 ?
                    "border-primary bg-primary" :
                    "border-muted-foreground/40 bg-background"
                  )}>
                        {idx === 0 &&
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    }
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                      "text-sm font-bold tracking-tight",
                      idx === 0 ? "text-primary" : "text-foreground"
                    )}>
                          {release.version}
                        </span>
                        {release.latest &&
                    <span className="text-[10px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Latest
                          </span>
                    }
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {release.date}
                        </span>
                      </div>
                      {release.summary &&
                  <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
                          {release.summary}
                        </p>
                  }
                      <ul className="space-y-1.5">
                        {release.items.map((item, i) =>
                    <li key={i} className="flex gap-2 text-xs">
                            <span className="text-muted-foreground/50 mt-0.5 shrink-0">·</span>
                            <span>
                              <span className="font-medium text-foreground">{item.title}</span>
                              <span className="text-muted-foreground"> — {item.description}</span>
                            </span>
                          </li>
                    )}
                      </ul>
                    </div>
                )}
                </div>
              </div>
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}

// --- Guest CTA Card ---
const GUEST_CTA_DISMISS_KEY = 'wr-settings-guest-cta-dismissed';

function GuestCtaCard({ navigate }: {navigate: (path: string) => void;}) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(GUEST_CTA_DISMISS_KEY) === '1');

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(GUEST_CTA_DISMISS_KEY, '1');
  };

  return (
    <AnimatePresence mode="wait">
      {!dismissed ?
      <motion.div
        key="full-cta"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden relative">
        
          <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center z-10"
          aria-label="Dismiss">
          
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <AppIcon size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Welcome, Guest</p>
                <p className="text-sm text-muted-foreground">Create a free account to unlock:</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 ml-1">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                Sync across devices
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                Export & backup resumes
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                AI-powered enhancements
              </li>
            </ul>
            <Button size="sm" onClick={() => navigate('/auth?mode=signup')} className="w-full mt-4">
              Get Started Free
            </Button>
          </div>
        </motion.div> :

      <motion.div
        key="compact-cta"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
        
          <SettingsRow
          type="navigation"
          label="Sign in to unlock all features"
          icon={<AppIcon size={20} showSparkle={false} />}
          onClick={() => navigate('/auth?mode=login')} />
        
        </motion.div>
      }
    </AnimatePresence>);

}
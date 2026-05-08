import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { getAppUrl } from '@/lib/portfolioUrl';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { openExternal } from '@/lib/openExternal';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { usePlan } from '@/hooks/usePlan';
import { PlanAvatar } from '@/components/ui/PlanAvatar';
import { useSettingsStore } from '@/store/settingsStore';
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
const HelpSheet = lazy(() => import('@/components/settings/HelpSheet').then((m) => ({ default: m.HelpSheet })));
const ProfileCard = lazy(() => import('@/components/settings/ProfileCard'));
const AISettingsSheet = lazy(() => import('@/components/ai/AISettingsSheet').then((m) => ({ default: m.AISettingsSheet })));

// Extracted section components
import { TalentPoolDiscoverableCard } from '@/components/settings/TalentPoolDiscoverableCard';
import { AccountSection } from '@/components/settings/sections/AccountSection';
import { AppearanceSection } from '@/components/settings/sections/AppearanceSection';
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
  const { user, loading, signOut } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { plan } = usePlan();
  const { data: resumes = [] } = useResumes();
  const { currentResumeId } = useResumeStore();

  const {
    biometricLockEnabled,
    setBiometricLockEnabled,
    setHasSeenSplash,
  } = useSettingsStore();

  const { isAvailable: biometricAvailable, biometryType, authenticate } = useBiometricLock(biometricLockEnabled);

  // Sheet states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [dataExportSheetOpen, setDataExportSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [biometricSetupOpen, setBiometricSetupOpen] = useState(false);
  const [biometricTimeoutOpen, setBiometricTimeoutOpen] = useState(false);
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  // Dynamic changelog
  const [changelogData, setChangelogData] = useState<any[]>([]);
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

  const appVersion = changelogData[0]?.version || 'v4.0.0-Native';

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

  const handleDataDeleted = useCallback(async () => {
    try {
      await signOut();
    } catch {}
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
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard');
      } catch {}
    }
  }, []);

  const handleRateApp = useCallback(() => {
    haptics.light();
    openExternal(getAppUrl());
  }, []);

  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const displayName = profile?.fullName || user?.email || 'User';

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="pt-safe sticky top-0 z-10 pb-2 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-page-title">Settings</h1>
          </div>
        </header>

        <div className="py-6 space-y-7 overflow-y-auto pb-24 lg:max-w-none mx-auto w-full">
          {!user && <div className="px-4"><GuestCtaCard navigate={navigate} /></div>}

          <div className="px-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-soft text-left active:scale-[0.98] transition-all touch-manipulation cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            </div>
          </div>

          {user && (
            <div>
              <SectionLabel>Account</SectionLabel>
              <div className="mx-4 space-y-3">
                <AccountSection authProvider="Appwrite" />
                <UserIdCard userId={user.id} />
              </div>
            </div>
          )}

          {user && (
            <div>
              <SectionLabel>AI Engine</SectionLabel>
              <div className="mx-4">
                <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
                  <SettingsRow
                    type="navigation"
                    label="AI Engine"
                    description="WiseResume AI Pool"
                    onClick={() => setAISettingsOpen(true)}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <SectionLabel>Preferences</SectionLabel>
            <div className="mx-4 space-y-3">
              <AppearanceSection />
              <EditorExportSection
                isSignedIn={!!user}
                onManageExports={() => setDataExportSheetOpen(true)}
                onNavigateAuth={() => navigate('/auth?mode=login')}
              />
            </div>
          </div>

          <div>
            <SectionLabel>Notifications</SectionLabel>
            <div className="mx-4">
              <NotificationsSection />
            </div>
          </div>

          <div>
            <SectionLabel>Privacy & Security</SectionLabel>
            <div className="mx-4 space-y-3">
              <PrivacySection
                onOpenBiometricTimeout={() => setBiometricTimeoutOpen(true)}
                onBiometricToggle={handleBiometricToggle}
              />
              {user && <TalentPoolDiscoverableCard />}
            </div>
          </div>

          <div>
            <SectionLabel>Support</SectionLabel>
            <div className="mx-4">
              <AboutSection
                isSignedIn={!!user}
                appVersion={appVersion}
                onOpenAbout={() => setAboutDialogOpen(true)}
                onTakeTour={async () => {
                  haptics.light();
                  if (user) {
                    try {
                      const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
                        Query.equal('user_id', user!.id),
                        Query.select(['$id']),
                        Query.limit(1),
                      ]);
                      if (profileRes.documents.length > 0) {
                        await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileRes.documents[0].$id, {
                          onboarding_completed: false,
                        });
                      }
                    } catch { /* non-critical */ }
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
                onOpenChangelog={() => setChangelogOpen(true)}
              />
            </div>
          </div>

          {user && (
            <div>
              <SectionLabel>Danger Zone</SectionLabel>
              <div className="mx-4">
                <DangerZoneSection
                  onSignOut={() => setSignOutConfirmOpen(true)}
                  onDeleteData={() => setDeleteDialogOpen(true)}
                />
              </div>
            </div>
          )}

          <div className="pt-2 pb-10">
            <div className="px-4 flex flex-col items-center gap-5">
              <Suspense fallback={null}>
                <ProfileCard
                  name="Magdy Saber"
                  title="Creator & Developer"
                  avatarUrl={developerPhoto}
                  contactText="Contact Me"
                  showUserInfo={true}
                  enableTilt={true}
                  behindGlowEnabled
                  onContactClick={() => openExternal('mailto:contact@magdysaber.com')}
                />
              </Suspense>

              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-soft">
                  <AppIcon size={48} showSparkle={false} className="w-full h-full" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <h2 className="text-sm font-semibold text-foreground">WiseResume</h2>
                  <span className="text-xs text-muted-foreground font-mono">{appVersion}</span>
                </div>
                <p className="text-sm text-muted-foreground text-center">Made with ❤️ in Egypt</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        {helpSheetOpen && <HelpSheet open={helpSheetOpen} onOpenChange={setHelpSheetOpen} />}
        {aiSettingsOpen && <AISettingsSheet open={aiSettingsOpen} onOpenChange={setAISettingsOpen} />}
      </Suspense>

      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You'll need to sign in again to access your data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground">Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GuestCtaCard({ navigate }: {navigate: (path: string) => void;}) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('wr-settings-guest-cta-dismissed') === '1');
  return (
    <AnimatePresence mode="wait">
      {!dismissed ?
      <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl bg-card border border-border shadow-soft p-4 relative">
          <button onClick={() => {setDismissed(true); localStorage.setItem('wr-settings-guest-cta-dismissed', '1');}} className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted"><X size={14}/></button>
          <div className="flex items-center gap-4">
            <AppIcon size={32} />
            <div>
              <p className="font-medium">Welcome, Guest</p>
              <p className="text-sm text-muted-foreground">Create a free account to unlock more.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/auth?mode=signup')} className="w-full mt-4">Get Started Free</Button>
        </motion.div> :
      <div className="rounded-2xl bg-card border border-border">
          <SettingsRow type="navigation" label="Sign in to unlock all features" onClick={() => navigate('/auth?mode=login')} />
        </div>
      }
    </AnimatePresence>
  );
}

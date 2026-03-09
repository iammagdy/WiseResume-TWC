import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { getAppUrl } from '@/lib/portfolioUrl';

import { useNavigate } from 'react-router-dom';
import {
  LogOut, Info, ChevronRight, Download, Bell, Sparkles, Shield, Palette,
  Brain, Chrome, Mail, ScrollText, X, Check,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { openExternal } from '@/lib/openExternal';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { useSettingsStore } from '@/store/settingsStore';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { toast } from 'sonner';
import { AppIcon } from '@/components/brand/AppIcon';
import { BackButton } from '@/components/ui/BackButton';
import { useIsDark } from '@/hooks/useIsDark';
import { getChangelog } from '@/hooks/useChangelogBadge';
import developerPhoto from '@/assets/developer-photo.png';

// Lazy-loaded sheets
const EditProfileSheet = lazy(() => import('@/components/settings/EditProfileSheet').then(m => ({ default: m.EditProfileSheet })));
const DataExportSheet = lazy(() => import('@/components/settings/DataExportSheet').then(m => ({ default: m.DataExportSheet })));
const DeleteDataDialog = lazy(() => import('@/components/settings/DeleteDataDialog').then(m => ({ default: m.DeleteDataDialog })));
const BiometricSetupSheet = lazy(() => import('@/components/settings/BiometricSetupSheet').then(m => ({ default: m.BiometricSetupSheet })));
const BiometricTimeoutSheet = lazy(() => import('@/components/settings/BiometricTimeoutSheet').then(m => ({ default: m.BiometricTimeoutSheet })));
const ElevenLabsKeySheet = lazy(() => import('@/components/settings/ElevenLabsKeySheet').then(m => ({ default: m.ElevenLabsKeySheet })));
const AISettingsSheet = lazy(() => import('@/components/settings/AISettingsSheet').then(m => ({ default: m.AISettingsSheet })));
const HelpSheet = lazy(() => import('@/components/settings/HelpSheet').then(m => ({ default: m.HelpSheet })));
const DeveloperCreditCard = lazy(() => import('@/components/settings/DeveloperCreditCard').then(m => ({ default: m.DeveloperCreditCard })));

// Extracted section components
import { AccountSection } from '@/components/settings/sections/AccountSection';
import { AppearanceSection } from '@/components/settings/sections/AppearanceSection';
import { AIVoiceSection } from '@/components/settings/sections/AIVoiceSection';
import { EditorExportSection } from '@/components/settings/sections/EditorExportSection';
import { NotificationsSection } from '@/components/settings/sections/NotificationsSection';
import { PrivacySection } from '@/components/settings/sections/PrivacySection';
import { AboutSection } from '@/components/settings/sections/AboutSection';

// --- Section index chips ---
const SECTIONS = [
  { id: 'section-account', label: 'Account', icon: LogOut },
  { id: 'section-appearance', label: 'Appearance', icon: Palette },
  { id: 'section-ai-voice', label: 'AI & Voice', icon: Brain },
  { id: 'section-editor-export', label: 'Editor', icon: Download },
  { id: 'section-notifications', label: 'Notifications', icon: Bell },
  { id: 'section-privacy', label: 'Privacy', icon: Shield },
  { id: 'section-about', label: 'About', icon: Info },
] as const;

// --- Section header helper ---
function SectionHeader({ icon: Icon, label, badge }: { icon: React.ElementType; label: string; badge?: React.ReactNode }) {
  return (
    <h2 className="text-label uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
      <div className="w-1 h-5 rounded-full bg-primary/40" />
      <Icon className="w-4 h-4 text-primary/60" />
      {label}
      {badge}
    </h2>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const isDark = useIsDark();
  const { user, loading, signOut } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { currentResumeId } = useResumeStore();

  const {
    biometricLockEnabled,
    setBiometricLockEnabled,
    elevenlabsApiKey,
    setElevenlabsApiKey,
    setHasSeenSplash,
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
  const [changelogData, setChangelogData] = useState<Array<{ version: string; date: string; latest?: boolean; summary?: string; items: Array<{ title: string; description: string }> }>>([]);
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
    getChangelog().then(data => {
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
    fetch('/changelog.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setChangelogData(data); changelogFetchedAt.current = Date.now(); })
      .catch(() => setChangelogError(true))
      .finally(() => setChangelogLoading(false));
  }, [changelogOpen]);

  const appVersion = changelogData[0]?.version || 'v2.0.0';

  // --- Section index: active tracking ---
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Map<string, boolean>();

    SECTIONS.forEach(({ id }) => {
      const el = container.querySelector(`#${id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          visibleSections.set(id, entry.isIntersecting);
          for (const s of SECTIONS) {
            if (visibleSections.get(s.id)) {
              setActiveSection(s.id);
              break;
            }
          }
        },
        { root: container, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [user]);

  const scrollToSection = (id: string) => {
    haptics.light();
    const container = scrollContainerRef.current;
    const el = container?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Auth provider detection
  const authProvider = (user?.app_metadata?.provider as string) || 'email';
  const providerLabel = ({ google: 'Google', apple: 'Apple', email: 'Email' } as Record<string, string>)[authProvider] || 'Email';
  const ProviderIcon = authProvider === 'google' ? Chrome : Mail;

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
    } catch {}
    navigate('/');
    toast.success('All data deleted');
  }, [signOut, navigate]);

  const handleShareApp = useCallback(async () => {
    const shareData = {
      title: 'WiseResume',
      text: 'Build a professional resume in minutes with AI-powered writing assistance.',
      url: getAppUrl(),
    };
    haptics.light();
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard');
      } catch { }
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
      return profile.fullName
        .split(' ')
        .map((w: string) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const displayName = profile?.fullName || user?.email || 'User';

  // Suspense fallback already shows SettingsSkeleton; avoid double skeleton
  if (loading) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="pt-safe sticky top-0 z-10 pb-1 px-4 glass-header backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-page-title">Settings</h1>
          </div>

          {/* Section index chips */}
          <div className="relative">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
              {SECTIONS.map(({ id, label, icon: SIcon }) => {
                if (id === 'section-account' && !user) return null;
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 touch-manipulation shrink-0 min-h-[44px]',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <SIcon className="w-3 h-3" />
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Right-edge fade to hint horizontal scroll */}
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-background to-transparent" />
          </div>
        </header>

        {/* Content */}
        <div ref={scrollContainerRef} className="px-5 py-4 space-y-8 overflow-y-auto pb-24">
          {/* Guest CTA */}
          {!user && <GuestCtaCard navigate={navigate} />}

          {/* Profile Section */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl glass-elevated text-left active:scale-[0.98] transition-all touch-manipulation border-glow"
          >
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatarUrl || user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{displayName}</p>
              {user?.email && (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1 font-normal">
                  <ProviderIcon className="w-3 h-3" />
                  {providerLabel}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">View & edit profile</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>

          <Separator className="opacity-10" />

          {/* Account Section */}
          {user && (
            <>
              <div id="section-account">
                <SectionHeader icon={LogOut} label="Account" />
                <p className="text-xs text-muted-foreground mb-3 px-1">Manage your account and data</p>
                <AccountSection
                  user={user}
                  authProvider={authProvider}
                  onChangePassword={handleChangePassword}
                  onSignOut={() => setSignOutConfirmOpen(true)}
                  onDeleteData={() => setDeleteDialogOpen(true)}
                />
              </div>
              <Separator className="opacity-10" />
            </>
          )}

          <Separator className="opacity-10" />

          {/* Appearance Section */}
          <div id="section-appearance">
            <SectionHeader icon={Palette} label="Appearance" />
            <p className="text-xs text-muted-foreground mb-3 px-1">Theme, language, and display preferences</p>
            <AppearanceSection onLanguage={handleLanguage} />
          </div>

          <Separator className="opacity-10" />

          {/* AI & Voice Section */}
          <div id="section-ai-voice">
            <SectionHeader icon={Brain} label="AI & Voice" />
            <p className="text-xs text-muted-foreground mb-3 px-1">Choose your AI engine and voice settings</p>
            <AIVoiceSection
              onOpenAISettings={() => setAISettingsOpen(true)}
              onOpenElevenLabsKey={() => setElevenLabsKeyOpen(true)}
            />
          </div>

          <Separator className="opacity-10" />

          {/* Editor & Export Section */}
          <div id="section-editor-export">
            <SectionHeader icon={Download} label="Editor & Export" />
            <p className="text-xs text-muted-foreground mb-3 px-1">PDF output and resume backup options</p>
            <EditorExportSection
              isSignedIn={!!user}
              onManageExports={() => setDataExportSheetOpen(true)}
              onNavigateAuth={() => navigate('/auth')}
            />
          </div>

          <Separator className="opacity-10" />

          {/* Notifications Section */}
          <div id="section-notifications">
            <SectionHeader icon={Bell} label="Notifications" />
            <p className="text-xs text-muted-foreground mb-3 px-1">Control alerts and suggestion prompts</p>
            <NotificationsSection />
          </div>

          <Separator className="opacity-10" />

          {/* Privacy Section */}
          <div id="section-privacy">
            <SectionHeader icon={Shield} label="Privacy & Security" />
            <p className="text-xs text-muted-foreground mb-3 px-1">Biometric lock, data protection, and privacy controls</p>
            <PrivacySection
              onOpenBiometricTimeout={() => setBiometricTimeoutOpen(true)}
              onBiometricToggle={handleBiometricToggle}
            />
          </div>

          <Separator className="opacity-10" />

          {/* About Section */}
          <div id="section-about">
            <SectionHeader icon={Info} label="About & Help" />
            <p className="text-xs text-muted-foreground mb-3 px-1">App info, onboarding, and sharing</p>
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

          {/* Developer Credit Card */}
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

          {/* Branded Footer */}
          <div className="pt-2 pb-10">
            <div className="flex flex-col items-center gap-4 px-6 py-8 rounded-3xl glass-elevated border border-white/[0.08] shadow-xl w-full max-w-xs mx-auto">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-purple-500/30 ring-1 ring-white/10">
                <AppIcon size={56} showSparkle={false} className="w-full h-full" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <h2 className="text-lg font-bold text-foreground tracking-tight">WiseResume</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-mono font-medium">
                  {appVersion}
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Made with <span className="text-red-500">❤️</span> in Egypt
              </p>
              <button
                type="button"
                onClick={() => setChangelogOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border active:scale-95 transition text-sm text-muted-foreground font-medium touch-manipulation min-h-[44px] ${
                  isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'
                }`}
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
        {editProfileOpen && user && (
          <EditProfileSheet
            open={editProfileOpen}
            onOpenChange={setEditProfileOpen}
            profile={profile}
            userId={user?.id}
            userEmail={user?.email}
            onSave={updateProfile}
          />
        )}
        {dataExportSheetOpen && (
          <DataExportSheet
            open={dataExportSheetOpen}
            onOpenChange={setDataExportSheetOpen}
            resumes={resumes}
            userEmail={user?.email ?? null}
            userName={profile?.fullName ?? null}
            currentResumeId={currentResumeId}
          />
        )}
        {deleteDialogOpen && user && (
          <DeleteDataDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            userId={user.id}
            resumeCount={resumes.length}
            onDeleted={handleDataDeleted}
          />
        )}
        {biometricSetupOpen && (
          <BiometricSetupSheet
            open={biometricSetupOpen}
            onOpenChange={setBiometricSetupOpen}
            biometryType={biometryType}
            onEnable={handleBiometricSetupConfirm}
          />
        )}
        {biometricTimeoutOpen && (
          <BiometricTimeoutSheet
            open={biometricTimeoutOpen}
            onOpenChange={setBiometricTimeoutOpen}
            selectedTimeout={useSettingsStore.getState().biometricLockTimeout}
            onSelect={useSettingsStore.getState().setBiometricLockTimeout}
          />
        )}
        {elevenLabsKeyOpen && (
          <ElevenLabsKeySheet
            open={elevenLabsKeyOpen}
            onOpenChange={setElevenLabsKeyOpen}
            currentKey={elevenlabsApiKey}
            onSave={setElevenlabsApiKey}
          />
        )}
        {aiSettingsOpen && (
          <AISettingsSheet
            open={aiSettingsOpen}
            onOpenChange={setAISettingsOpen}
          />
        )}
        {helpSheetOpen && (
          <HelpSheet
            open={helpSheetOpen}
            onOpenChange={setHelpSheetOpen}
          />
        )}
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
          <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {changelogLoading ? (
              <div className="space-y-6 pt-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : changelogError ? (
              <p className="text-sm text-muted-foreground text-center py-8">Could not load changelog.</p>
            ) : (
              <div className="relative pt-2">
                <div className="absolute left-[7px] top-4 bottom-4 w-px bg-border" />
                <div className="space-y-6">
                  {changelogData.map((release, idx) => (
                    <div key={release.version} className="relative pl-6">
                      <div className={cn(
                        "absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center",
                        idx === 0
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40 bg-background"
                      )}>
                        {idx === 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-sm font-bold tracking-tight",
                          idx === 0 ? "text-primary" : "text-foreground"
                        )}>
                          {release.version}
                        </span>
                        {release.latest && (
                          <span className="text-[10px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Latest
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {release.date}
                        </span>
                      </div>
                      {release.summary && (
                        <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
                          {release.summary}
                        </p>
                      )}
                      <ul className="space-y-1.5">
                        {release.items.map((item, i) => (
                          <li key={i} className="flex gap-2 text-xs">
                            <span className="text-muted-foreground/50 mt-0.5 shrink-0">·</span>
                            <span>
                              <span className="font-medium text-foreground">{item.title}</span>
                              <span className="text-muted-foreground"> — {item.description}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Guest CTA Card ---
const GUEST_CTA_DISMISS_KEY = 'wr-settings-guest-cta-dismissed';

function GuestCtaCard({ navigate }: { navigate: (path: string) => void }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(GUEST_CTA_DISMISS_KEY) === '1');

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(GUEST_CTA_DISMISS_KEY, '1');
  };

  return (
    <AnimatePresence mode="wait">
      {!dismissed ? (
        <motion.div
          key="full-cta"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl glass-elevated border-glow overflow-hidden relative"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center z-10"
            aria-label="Dismiss"
          >
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
            <Button size="sm" onClick={() => navigate('/auth')} className="w-full mt-4">
              Get Started Free
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="compact-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl glass-elevated overflow-hidden"
        >
          <SettingsRow
            type="navigation"
            label="Sign in to unlock all features"
            icon={<AppIcon size={20} showSparkle={false} />}
            onClick={() => navigate('/auth')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

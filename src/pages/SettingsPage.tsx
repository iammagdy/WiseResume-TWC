import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { getAppUrl } from '@/lib/portfolioUrl';
import { SettingsSkeleton } from '@/components/layout/PageSkeletons';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Info, 
  ChevronRight, 
  ChevronDown,
  Download, 
  Trash2,
  Bell,
  BellOff,
  Sparkles,
  Shield,
  Database,
  CheckCircle2,
  Fingerprint,
  ScanFace,
  Eye,
  Clock,
  Key,
  ArrowLeft,
  Brain,
  Mic,
  Globe,
  Star,
  Share2,
  Mail,
  Chrome,
  RotateCcw,
  Lock,
  Check,
  BookOpen,
  Palette,
  X,
  Cloud,
  CloudOff,
  Github,
  Moon,
  KeyRound,
  FileText,
  Briefcase,
  BarChart3,
  EyeOff,
  Activity,
  Bug,
  ScrollText,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { openExternal } from '@/lib/openExternal';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { useCoverLetters } from '@/hooks/useCoverLetters';
import { useJobApplications } from '@/hooks/useJobApplications';
import { useSettingsStore } from '@/store/settingsStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { useResumeStore } from '@/store/resumeStore';
import { haptics } from '@/lib/haptics';
import { triggerBugReport } from '@/lib/bugReport';
import { useAICredits } from '@/hooks/useAICredits';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { toast } from 'sonner';
import { AppIcon } from '@/components/brand/AppIcon';
import { BackButton } from '@/components/ui/BackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { getChangelog } from '@/hooks/useChangelogBadge';
import developerPhoto from '@/assets/developer-photo.png';

// Lazy-loaded sheets
const EditProfileSheet = lazy(() => import('@/components/settings/EditProfileSheet').then(m => ({ default: m.EditProfileSheet })));
const PDFDefaultsSheet = lazy(() => import('@/components/settings/PDFDefaultsSheet').then(m => ({ default: m.PDFDefaultsSheet })));
const DataExportSheet = lazy(() => import('@/components/settings/DataExportSheet').then(m => ({ default: m.DataExportSheet })));
const DeleteDataDialog = lazy(() => import('@/components/settings/DeleteDataDialog').then(m => ({ default: m.DeleteDataDialog })));
const BiometricSetupSheet = lazy(() => import('@/components/settings/BiometricSetupSheet').then(m => ({ default: m.BiometricSetupSheet })));
const BiometricTimeoutSheet = lazy(() => import('@/components/settings/BiometricTimeoutSheet').then(m => ({ default: m.BiometricTimeoutSheet })));
const ElevenLabsKeySheet = lazy(() => import('@/components/settings/ElevenLabsKeySheet').then(m => ({ default: m.ElevenLabsKeySheet })));
const AISettingsSheet = lazy(() => import('@/components/settings/AISettingsSheet').then(m => ({ default: m.AISettingsSheet })));
const HelpSheet = lazy(() => import('@/components/settings/HelpSheet').then(m => ({ default: m.HelpSheet })));
const DeveloperCreditCard = lazy(() => import('@/components/settings/DeveloperCreditCard').then(m => ({ default: m.DeveloperCreditCard })));
const PushNotificationSettings = lazy(() => import('@/components/settings/PushNotificationSettings').then(m => ({ default: m.PushNotificationSettings })));

// --- Section index chips ---
const SECTIONS = [
  { id: 'section-appearance', label: 'Appearance', icon: Palette },
  { id: 'section-ai-voice', label: 'AI & Voice', icon: Brain },
  { id: 'section-editor-export', label: 'Editor', icon: Download },
  { id: 'section-notifications', label: 'Notifications', icon: Bell },
  { id: 'section-privacy', label: 'Privacy', icon: Shield },
  { id: 'section-account', label: 'Account', icon: LogOut },
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
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { data: coverLetters = [] } = useCoverLetters();
  const { data: applications = [] } = useJobApplications();
  const { currentResumeId } = useResumeStore();
  
  const {
    showAutoSaveToasts,
    setShowAutoSaveToasts,
    autoSaveToastMode,
    setAutoSaveToastMode,
    showAIEnhancementTips,
    setShowAIEnhancementTips,
    aiTipFrequency,
    setAITipFrequency,
    quietHoursEnabled,
    setQuietHoursEnabled,
    quietHoursStart,
    setQuietHoursStart,
    quietHoursEnd,
    setQuietHoursEnd,
    pdfDefaults,
    setPdfDefaults,
    biometricLockEnabled,
    setBiometricLockEnabled,
    biometricLockTimeout,
    setBiometricLockTimeout,
    elevenlabsApiKey,
    setElevenlabsApiKey,
    aiProvider,
    localOnlyMode,
    setLocalOnlyMode,
    analyticsEnabled,
    setAnalyticsEnabled,
    setHasSeenSplash,
  } = useSettingsStore();
 
  const { isAvailable: biometricAvailable, biometryType, authenticate } = useBiometricLock(biometricLockEnabled);

  // Sheet states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dataExportSheetOpen, setDataExportSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [biometricSetupOpen, setBiometricSetupOpen] = useState(false);
  const [biometricTimeoutOpen, setBiometricTimeoutOpen] = useState(false);
  const [elevenLabsKeyOpen, setElevenLabsKeyOpen] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  // Dynamic changelog — single fetch via module-level cache
  const [changelogData, setChangelogData] = useState<Array<{ version: string; date: string; latest?: boolean; summary?: string; items: Array<{ title: string; description: string }> }>>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState(false);
  const changelogFetchedAt = useRef<number>(0);

  // Auto-open changelog if navigated with ?changelog=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('changelog') === 'true') {
      setChangelogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch changelog once on mount via shared cache
  useEffect(() => {
    getChangelog().then(data => {
      setChangelogData(data as typeof changelogData);
      changelogFetchedAt.current = Date.now();
    });
  }, []);

  // When dialog opens, only re-fetch if stale (>5 min)
  useEffect(() => {
    if (!changelogOpen) return;
    const age = Date.now() - changelogFetchedAt.current;
    if (changelogData.length > 0 && age < 5 * 60 * 1000) return; // fresh
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
          // Pick first visible
          for (const s of SECTIONS) {
            if (visibleSections.get(s.id)) {
              setActiveSection(s.id);
              break;
            }
          }
        },
        { root: container, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [user]); // re-run when user changes (account section appears)

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

  const getBiometryIcon = () => {
    switch (biometryType) {
      case 'faceId': return ScanFace;
      case 'iris': return Eye;
      case 'fingerprint': return Fingerprint;
      default: return Fingerprint;
    }
  };

  const getBiometryLabel = () => {
    switch (biometryType) {
      case 'faceId': return 'Face ID Lock';
      case 'iris': return 'Iris Lock';
      case 'fingerprint': return 'Fingerprint Lock';
      default: return 'Biometric Lock';
    }
  };

  const BiometryIcon = getBiometryIcon();

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      haptics.light();
      setBiometricSetupOpen(true);
    } else {
      haptics.medium();
      setBiometricLockEnabled(false);
    }
  };
 
  const handleBiometricSetupConfirm = async (): Promise<boolean> => {
    const success = await authenticate();
    if (success) {
      setBiometricLockEnabled(true);
    }
    return success;
  };

  const handleSignOut = async () => {
    haptics.medium();
    setSignOutConfirmOpen(false);
    await signOut();
    navigate('/');
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    haptics.light();
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    if (error) {
      toast.error('Failed to send password reset email');
    } else {
      toast.success('Password reset email sent! Check your inbox.');
    }
  };

  const handleOpenEditProfile = () => {
    haptics.light();
    setEditProfileOpen(true);
  };

  const handleDataDeleted = async () => {
    await signOut();
    navigate('/');
  };

  const handleShareApp = async () => {
    haptics.light();
    const shareData = {
      title: 'WiseResume',
      text: 'Build professional resumes with AI — try WiseResume!',
      url: getAppUrl(),
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared successfully! 🎉');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied! Share it with a friend 🎉');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied! Share it with a friend 🎉');
      } catch {
        toast(shareData.url, { duration: 8000, icon: '🔗' });
      }
    }
  };

  const handleRateApp = () => {
    haptics.light();
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isAndroid) {
      openExternal('https://play.google.com/store/apps/details?id=com.wiseresume.app');
    } else if (isIOS) {
      openExternal('https://apps.apple.com/app/wiseresume/id000000000');
    } else {
      toast('Store listing coming soon! Thanks for your support ⭐', { icon: '🚀' });
    }
  };

  const handleLanguage = () => {
    haptics.light();
    toast('More languages coming soon!', { icon: '🌍' });
  };

  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName
        .split(' ')
        .map((n) => n[0])
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
  const profileCompletion = calculateProfileCompletion(profile);

  // Privacy status
  const privacyStatus = localOnlyMode && !analyticsEnabled ? 'Strict' : 'Standard';

  if (loading) {
    return <SettingsSkeleton />;
  }

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
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
            {SECTIONS.map(({ id, label, icon: SIcon }) => {
              // Hide Account chip for guests
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
        </header>

        {/* Content */}
        <div ref={scrollContainerRef} className="px-5 py-4 space-y-8 overflow-y-auto pb-24">
          {/* Guest CTA */}
          {!user && <GuestCtaCard navigate={navigate} />}
          
          {/* 1. Profile Section */}
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

          {/* 2. Appearance & Language */}
          <div id="section-appearance">
            <SectionHeader icon={Palette} label="Appearance" />
            <p className="text-xs text-muted-foreground mb-3 px-1">Theme, language, and display preferences</p>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <div className="p-4">
                <ThemeToggle className="w-full justify-center" />
              </div>
              <Separator className="bg-border/30" />
              <SettingsRow
                type="navigation"
                label="Language"
                value="English"
                icon={<Globe className="w-4 h-4" />}
                onClick={handleLanguage}
              />
            </div>
          </div>

          <Separator className="opacity-10" />

          {/* 3. AI & Voice */}
          <div id="section-ai-voice">
            <SectionHeader icon={Brain} label="AI & Voice" />
            <p className="text-xs text-muted-foreground mb-3 px-1">Choose your AI engine and voice settings</p>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="AI Provider"
                description="Powers analysis, tailoring, and enhancements"
                value={aiProvider === 'wiseresume' ? 'Wise AI' : 'Gemini'}
                icon={<Brain className="w-4 h-4" />}
                onClick={() => setAISettingsOpen(true)}
              />
              <Separator className="bg-border/30" />
              <AICreditsRow onOpenAISettings={() => setAISettingsOpen(true)} />
              <Separator className="bg-border/30" />

              {elevenlabsApiKey ? (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">ElevenLabs Connected</p>
                    <p className="text-xs text-muted-foreground">
                      Used for speech-to-text in mock interviews
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setElevenLabsKeyOpen(true)}
                    className="text-xs"
                  >
                    Manage
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                      ElevenLabs Voice
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connect to enable realistic voice interviews
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setElevenLabsKeyOpen(true)}
                    className="shrink-0"
                  >
                    Connect
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator className="opacity-10" />

          {/* 4. Editor & Export */}
          <div id="section-editor-export">
            <SectionHeader icon={Download} label="Editor & Export" />
            <p className="text-xs text-muted-foreground mb-3 px-1">PDF output and resume backup options</p>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              {/* PDF Export Settings - Collapsible */}
              <Collapsible open={pdfOpen} onOpenChange={setPdfOpen}>
                <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors touch-manipulation">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Download className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium">PDF Export Settings</p>
                    <p className="text-xs text-muted-foreground">
                      {pdfDefaults.pageNumberFormat === 'simple' ? 'Simple' : 'Full'}, Badge {pdfDefaults.showBranding !== false ? 'on' : 'off'}
                    </p>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    pdfOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="settings-page-numbers" className="text-sm font-medium">Show Page Numbers</Label>
                        <p className="text-xs text-muted-foreground">Display in PDF footer</p>
                      </div>
                      <Switch
                        id="settings-page-numbers"
                        checked={pdfDefaults.showPageNumbers ?? true}
                        onCheckedChange={(checked) => {
                          haptics.light();
                          setPdfDefaults({ showPageNumbers: checked });
                        }}
                      />
                    </div>
                    {pdfDefaults.showPageNumbers !== false && (
                      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
                        <Label className="text-sm font-medium">Format</Label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { haptics.light(); setPdfDefaults({ pageNumberFormat: 'simple' }); }}
                            className={cn(
                              'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                              pdfDefaults.pageNumberFormat === 'simple'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background hover:border-primary/50'
                            )}
                          >
                            Simple (1)
                          </button>
                          <button
                            onClick={() => { haptics.light(); setPdfDefaults({ pageNumberFormat: 'full' }); }}
                            className={cn(
                              'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                              (pdfDefaults.pageNumberFormat ?? 'full') === 'full'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background hover:border-primary/50'
                            )}
                          >
                            Full (1 of 3)
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="settings-branding" className="text-sm font-medium flex items-center gap-1.5">
                          <span className="text-primary">✦</span> WiseResume Badge
                        </Label>
                        <p className="text-xs text-muted-foreground">Prestige stamp on exports</p>
                      </div>
                      <Switch
                        id="settings-branding"
                        checked={pdfDefaults.showBranding ?? true}
                        onCheckedChange={(checked) => {
                          haptics.light();
                          setPdfDefaults({ showBranding: checked });
                        }}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator className="bg-border/30" />

              {/* Export Resumes - Collapsible */}
              <Collapsible open={exportOpen} onOpenChange={setExportOpen}>
                <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors touch-manipulation">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium">Export Resumes</p>
                  </div>
                  <CloudSyncBadge isSignedIn={!!user} />
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200 ml-1",
                    exportOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    {user ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setDataExportSheetOpen(true)}
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Manage Exports
                      </Button>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-2">
                        <p className="text-sm text-muted-foreground text-center">Sign in to backup and export your resumes</p>
                        <Button size="sm" onClick={() => navigate('/auth')}>
                          Sign in
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <Separator className="opacity-10" />

          {/* 5. Notifications */}
          <div id="section-notifications">
            <SectionHeader icon={Bell} label="Notifications" />
            <p className="text-xs text-muted-foreground mb-3 px-1">Control alerts and suggestion prompts</p>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <Suspense fallback={null}>
                <PushNotificationSettings />
              </Suspense>
              <SettingsRow
                type="toggle"
                label="Auto-save Toasts"
                description="Show save confirmations"
                icon={showAutoSaveToasts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                checked={showAutoSaveToasts}
                onCheckedChange={setShowAutoSaveToasts}
              />
              {showAutoSaveToasts && (
                <div className="px-4 pb-3 pt-1">
                  <p className="text-xs text-muted-foreground mb-2 pl-11">Show:</p>
                  <div className="flex gap-2 pl-11">
                    {(['always', 'errors-only'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => { haptics.light(); setAutoSaveToastMode(mode); }}
                        className={cn(
                          'py-1.5 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                          autoSaveToastMode === mode
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:border-primary/50'
                        )}
                      >
                        {mode === 'always' ? 'Always' : 'Errors Only'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Separator className="bg-border/30" />
              <SettingsRow
                type="toggle"
                label="AI Enhancement Tips"
                description="Proactive improvement suggestions"
                icon={<Sparkles className="w-4 h-4" />}
                checked={showAIEnhancementTips}
                onCheckedChange={setShowAIEnhancementTips}
              />
              {showAIEnhancementTips && (
                <div className="px-4 pb-3 pt-1">
                  <p className="text-xs text-muted-foreground mb-2 pl-11">Frequency:</p>
                  <div className="flex gap-2 pl-11">
                    {(['daily', 'weekly', 'on-demand'] as const).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => { haptics.light(); setAITipFrequency(freq); }}
                        className={cn(
                          'py-1.5 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                          aiTipFrequency === freq
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:border-primary/50'
                        )}
                      >
                        {freq === 'on-demand' ? 'On-Demand' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Separator className="bg-border/30" />
              {/* Quiet Hours */}
              <SettingsRow
                type="toggle"
                label="Quiet Hours"
                description="Silence notifications during set times"
                icon={<Moon className="w-4 h-4" />}
                checked={quietHoursEnabled}
                onCheckedChange={(v) => { setQuietHoursEnabled(v); haptics.light(); }}
              />
              {quietHoursEnabled && (
                <div className="px-4 pb-3 pt-1">
                  <div className="flex items-center gap-2 pl-11">
                    <div className="flex flex-col items-center">
                      <label className="text-[10px] text-muted-foreground mb-1">From</label>
                      <input
                        type="time"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs w-[90px] text-center"
                      />
                    </div>
                    <span className="text-muted-foreground text-xs mt-4">–</span>
                    <div className="flex flex-col items-center">
                      <label className="text-[10px] text-muted-foreground mb-1">To</label>
                      <input
                        type="time"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs w-[90px] text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="opacity-10" />
          <div id="section-privacy">
            <SectionHeader
              icon={Shield}
              label="Privacy & Security"
              badge={
                <Badge
                  variant={privacyStatus === 'Strict' ? 'default' : 'secondary'}
                  className="text-[10px] px-2 py-0 ml-auto"
                >
                  {privacyStatus}
                </Badge>
              }
            />
            <p className="text-xs text-muted-foreground mb-3 px-1">Biometric lock, data protection, and privacy controls</p>
            
            <div className="rounded-2xl glass-elevated overflow-hidden">
              {/* Biometric lock - available on mobile */}
              {biometricAvailable ? (
                <>
                  <SettingsRow
                    type="toggle"
                    label={getBiometryLabel()}
                    description="Protect your resumes"
                    icon={<BiometryIcon className="w-4 h-4" />}
                    checked={biometricLockEnabled}
                    onCheckedChange={handleBiometricToggle}
                  />
                  {biometricLockEnabled && (
                    <>
                      <Separator className="bg-border/30" />
                      <SettingsRow
                        type="navigation"
                        label="Require Authentication After"
                        value={
                          biometricLockTimeout === 0 ? 'Immediately' :
                          biometricLockTimeout === 30000 ? '30 seconds' :
                          biometricLockTimeout === 60000 ? '1 minute' : '5 minutes'
                        }
                        icon={<Clock className="w-4 h-4" />}
                        onClick={() => setBiometricTimeoutOpen(true)}
                      />
                    </>
                  )}
                  <Separator className="bg-border/30" />
                </>
              ) : null}
              
              {/* Privacy toggles - always visible */}
              <SettingsRow
                type="toggle"
                label="Local-Only Mode"
                description="Keep data on this device only"
                icon={<EyeOff className="w-4 h-4" />}
                checked={localOnlyMode}
                onCheckedChange={setLocalOnlyMode}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="toggle"
                label="Usage Analytics"
                description="Help improve WiseResume with anonymous usage data"
                icon={<Activity className="w-4 h-4" />}
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
            
            <p className="text-xs text-muted-foreground mt-3 px-1 leading-relaxed">
              Your resumes are stored securely and never sold to third parties.
            </p>
          </div>

          <Separator className="opacity-10" />

          {/* 7. Account - Auth only */}
          {user && (
            <>
              <div id="section-account">
                <SectionHeader icon={LogOut} label="Account" />
                <p className="text-xs text-muted-foreground mb-3 px-1">Manage your account and data</p>
                
                {/* Account Stats - enhanced */}
                <AccountStatsCard
                  resumes={resumes.length}
                  coverLetters={coverLetters.length}
                  applications={applications.length}
                  createdAt={user.created_at}
                />

                <div className="rounded-2xl glass-elevated overflow-hidden">
                  {/* Change Password - email users only */}
                  {authProvider === 'email' && (
                    <>
                      <SettingsRow
                        type="navigation"
                        label="Change Password"
                        description="Send a password reset email"
                        icon={<KeyRound className="w-4 h-4" />}
                        onClick={handleChangePassword}
                      />
                      <Separator className="bg-border/30" />
                    </>
                  )}
                  <SettingsRow
                    type="button"
                    label="Sign Out"
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={() => { haptics.medium(); setSignOutConfirmOpen(true); }}
                  />
                  <Separator className="bg-border/30" />
                  <SettingsRow
                    type="button"
                    label="Delete All Data"
                    description="Permanently remove all your data"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => setDeleteDialogOpen(true)}
                    destructive
                  />
                </div>
              </div>
              <Separator className="opacity-10" />
            </>
          )}

          {/* 8. About & Help */}
          <div id="section-about">
            <SectionHeader icon={Info} label="About & Help" />
            <p className="text-xs text-muted-foreground mb-3 px-1">App info, onboarding, and sharing</p>

            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="button"
                label="Take Tour Again"
                description="Replay the quick product tour to learn the main features"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={async () => {
                  haptics.light();
                  if (user) {
                    await supabase.from('profiles').update({ onboarding_completed: false }).eq('user_id', user.id);
                  } else {
                    localStorage.removeItem('wr-onboarding-seen');
                  }
                  toast.success('Onboarding reset — redirecting…');
                  navigate('/onboarding');
                }}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="button"
                label="Replay Splash Screen"
                description="Re-watch the animated intro"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={() => {
                  haptics.light();
                  setHasSeenSplash(false);
                  toast.success('Replaying splash…');
                  navigate('/');
                }}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="button"
                label="Rate WiseResume"
                description="Love WiseResume? Leave a rating to help others find it"
                icon={<Star className="w-4 h-4" />}
                onClick={handleRateApp}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="button"
                label="Share WiseResume"
                description="Send a link to a friend or colleague"
                icon={<Share2 className="w-4 h-4" />}
                onClick={handleShareApp}
              />
            </div>

            <div className="rounded-2xl glass-elevated overflow-hidden mt-3">
              <SettingsRow
                type="navigation"
                label="Get Help"
                description="Docs, email support, and community"
                icon={<BookOpen className="w-4 h-4" />}
                onClick={() => setHelpSheetOpen(true)}
              />
              {user && (
                <>
                  <Separator className="bg-border/30" />
                  <SettingsRow
                    type="button"
                    label="Report a Bug"
                    description="Let us know if something isn't working right"
                    icon={<Bug className="w-4 h-4" />}
                    onClick={() => {
                      haptics.light();
                      triggerBugReport({
                        errorMessage: 'User-reported issue',
                        route: window.location.pathname,
                      });
                    }}
                  />
                  <Separator className="bg-border/30" />
                  <SettingsRow
                    type="toggle"
                    label="Shake to Report Bug"
                    description="Shake your device to quickly open the bug report"
                    icon={<Activity className="w-4 h-4" />}
                    checked={useSettingsStore.getState().shakeToReportEnabled}
                    onCheckedChange={(val) => {
                      haptics.light();
                      useSettingsStore.getState().setShakeToReportEnabled(val);
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Developer Credit Card — whileInView, once */}
          <Suspense fallback={null}>
            <DeveloperCreditCard
              name="Magdy Saber"
              title="Creator & Developer"
              avatarUrl={developerPhoto}
              websiteUrl="https://magdysaber.com"
              githubUrl="https://github.com/iammagdy"
              onContactClick={() => window.open('mailto:contact@magdysaber.com')}
            />
          </Suspense>

          {/* Branded Footer */}
          <div className="pt-2 pb-10">
            <div className="flex flex-col items-center gap-4 px-6 py-8 rounded-3xl glass-elevated border border-white/[0.08] shadow-xl w-full max-w-xs mx-auto">
              {/* App icon with glow */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-purple-500/30 ring-1 ring-white/10">
                <AppIcon size={56} showSparkle={false} className="w-full h-full" />
              </div>

              {/* Name + version badge */}
              <div className="flex flex-col items-center gap-1.5">
                <h2 className="text-lg font-bold text-foreground tracking-tight">WiseResume</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-mono font-medium">
                  {appVersion}
                </span>
              </div>

              {/* Tagline */}
              <p className="text-sm text-muted-foreground text-center">
                Made with <span className="text-red-500">❤️</span> in Egypt
              </p>

              {/* Changelog pill button */}
              <button
                type="button"
                onClick={() => setChangelogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-sm text-muted-foreground font-medium touch-manipulation min-h-[44px]"
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
            selectedTimeout={biometricLockTimeout}
            onSelect={setBiometricLockTimeout}
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
                {/* Timeline line */}
                <div className="absolute left-[7px] top-4 bottom-4 w-px bg-border" />
                <div className="space-y-6">
                  {changelogData.map((release, idx) => (
                    <div key={release.version} className="relative pl-6">
                      {/* Timeline dot */}
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

                      {/* Version header */}
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

                      {/* Summary */}
                      {release.summary && (
                        <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
                          {release.summary}
                        </p>
                      )}

                      {/* Items */}
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

function CloudSyncBadge({ isSignedIn }: { isSignedIn: boolean }) {
  const pendingCount = useOfflineSyncStore(s => s.pendingChanges.length);

  if (!isSignedIn) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5">
        <Lock className="w-3 h-3" />
        Sign in
      </Badge>
    );
  }

  if (pendingCount > 0) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5 bg-warning/10 text-warning border-warning/30">
        <Cloud className="w-3 h-3" />
        Pending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
      <Cloud className="w-3 h-3" />
      <Check className="w-2.5 h-2.5 -ml-1.5" />
      Backed up
    </Badge>
  );
}

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

// --- Enhanced AI Credits Row with color-coded progress & CTA ---
function AICreditsRow({ onOpenAISettings }: { onOpenAISettings: () => void }) {
  const { data: credits } = useAICredits();
  const used = credits?.daily_usage || 0;
  const limit = credits?.daily_limit || 20;
  const percentage = Math.min((used / limit) * 100, 100);

  const progressColor = percentage > 80
    ? 'bg-destructive'
    : percentage > 60
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 min-h-[56px]">
      <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary flex-shrink-0">
        <Activity className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">AI Credits</p>
        <p className="text-xs text-muted-foreground">
          {used} / {limit} used today
        </p>
        <div className="relative h-1.5 mt-1.5 w-full overflow-hidden rounded-full bg-secondary/30">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {percentage > 80 && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenAISettings(); }}
            className="text-[11px] text-primary hover:underline mt-1 inline-block"
          >
            Get unlimited with your own key →
          </button>
        )}
      </div>
    </div>
  );
}

// --- Enhanced Account Stats with count-up & membership tier ---
function AccountStatsCard({ resumes, coverLetters, applications, createdAt }: {
  resumes: number;
  coverLetters: number;
  applications: number;
  createdAt?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const countRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hasAnimated = useRef(false);

  const stats = [
    { value: resumes, label: 'Resumes' },
    { value: coverLetters, label: 'Cover Letters' },
    { value: applications, label: 'Applications' },
  ];

  // Membership tier
  const membershipTier = (() => {
    if (!createdAt) return null;
    const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months >= 12) return 'Founding Member';
    if (months >= 6) return 'Early Adopter';
    if (months >= 1) return 'Member';
    return 'New Member';
  })();

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasAnimated.current) return;
      hasAnimated.current = true;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      stats.forEach((stat, i) => {
        const span = countRefs.current[i];
        if (!span) return;
        if (prefersReduced || stat.value === 0) {
          span.textContent = String(stat.value);
          return;
        }
        const duration = 800;
        const start = performance.now();
        const animate = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          span.textContent = String(Math.round(eased * stat.value));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      });
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [resumes, coverLetters, applications]);

  return (
    <div
      ref={cardRef}
      className="rounded-2xl glass-elevated overflow-hidden p-4 mb-3 border border-primary/20"
    >
      {membershipTier && (
        <div className="flex justify-center mb-2">
          <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
            <Star className="w-3 h-3" />
            {membershipTier}
          </Badge>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 text-center">
        {stats.map((stat, i) => (
          <div key={stat.label}>
            <p className="text-lg font-bold text-primary">
              <span ref={el => { countRefs.current[i] = el; }}>0</span>
            </p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      {createdAt && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Member since {new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

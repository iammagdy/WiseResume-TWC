import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
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
  Clock,
  Key,
  ArrowLeft,
  ArrowUp,
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
  Users,
  Palette,
  X,
  Cloud,
  CloudOff,
  Github,
  Linkedin,
  Twitter,
  Moon
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { useSettingsStore } from '@/store/settingsStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { useResumeStore } from '@/store/resumeStore';
import { haptics } from '@/lib/haptics';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { toast } from 'sonner';
import { AppIcon } from '@/components/brand/AppIcon';
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
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
  } = useSettingsStore();
 
  const { isAvailable: biometricAvailable, biometryType, authenticate } = useBiometricLock(biometricLockEnabled);

  // Scroll enhancements
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('section-appearance');

  const SECTIONS = [
    { id: 'section-appearance', label: 'Appearance', icon: Palette },
    { id: 'section-ai-voice', label: 'AI & Voice', icon: Brain },
    { id: 'section-editor-export', label: 'Editor & Export', icon: Download },
    { id: 'section-notifications', label: 'Notifications', icon: Bell },
    { id: 'section-privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'section-account', label: 'Account', icon: LogOut },
    { id: 'section-about', label: 'About & Help', icon: Info },
  ];

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setShowScrollTop(scrollRef.current.scrollTop > 300);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { root: container, threshold: 0.1, rootMargin: '-80px 0px -80% 0px' }
    );

    SECTIONS.forEach(({ id }) => {
      const el = container.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

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

  // Auth provider detection
  const authProvider = (user?.app_metadata?.provider as string) || 'email';
  const providerLabel = ({ google: 'Google', apple: 'Apple', email: 'Email' } as Record<string, string>)[authProvider] || 'Email';
  const ProviderIcon = authProvider === 'google' ? Chrome : Mail;

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
    await signOut();
    navigate('/');
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
      url: 'https://wiseresume.lovable.app',
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch {
      // user cancelled share
    }
  };

  const handleRateApp = () => {
    haptics.light();
    toast.success('Thanks for your support! ⭐');
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

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="pt-safe pt-4 pb-3 px-4 glass-header">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </header>

        <div ref={scrollRef} onScroll={handleScroll} style={{ scrollBehavior: 'smooth' }} className="flex-1 overflow-y-auto px-5 py-4 space-y-8">
          {/* Section jump bar */}
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {SECTIONS.map(s => {
              const SectionIcon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    haptics.selection();
                    const el = scrollRef.current?.querySelector(`#${s.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-xs font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95 shrink-0",
                    activeSection === s.id
                      ? "bg-primary text-primary-foreground"
                      : "glass-elevated text-muted-foreground"
                  )}
                >
                  <SectionIcon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
          {/* 1. Profile Section */}
          <button
            onClick={handleOpenEditProfile}
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
              {profile?.jobTitle ? (
                <p className="text-sm text-muted-foreground truncate">{profile.jobTitle}</p>
              ) : (
                <p className="text-sm text-muted-foreground truncate">
                  Tap to complete your profile
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1 font-normal">
                  <ProviderIcon className="w-3 h-3" />
                  {providerLabel}
                </Badge>
              </div>
              {profileCompletion < 100 && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={profileCompletion} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{profileCompletion}%</span>
                </div>
              )}
              {profileCompletion === 100 && (
                <div className="mt-1 flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Profile complete</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>

          <Separator className="opacity-10" />

          {/* 2. Appearance & Language */}
          <div id="section-appearance" className="glass-surface-alt">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary/60" />
              Appearance
            </h2>
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary/60" />
              AI & Voice
            </h2>
            <p className="text-xs text-muted-foreground mb-3 px-1">Choose your AI engine and voice settings</p>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="AI Provider"
                description="Powers analysis, tailoring, and enhancements"
                value={aiProvider === 'wiseresume' ? 'WiseResume AI' : 'Gemini'}
                icon={<Brain className="w-4 h-4" />}
                onClick={() => setAISettingsOpen(true)}
              />
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
          <div id="section-editor-export" className="glass-surface-alt">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary/60" />
              Editor & Export
            </h2>
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
                    {/* Page numbers toggle */}
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
                    {/* Page number format */}
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
                    {/* Branding toggle */}
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary/60" />
              Notifications
            </h2>
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
          <div id="section-privacy" className="glass-surface-alt">
            <TooltipProvider>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary/60" />
                Privacy & Security
                {!biometricAvailable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 ml-1 cursor-help">
                        Mobile only
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Biometric lock requires a device with fingerprint or face recognition
                    </TooltipContent>
                  </Tooltip>
                )}
              </h2>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mb-3 px-1">Biometric lock and data protection</p>
            {biometricAvailable ? (
              <div className="rounded-2xl glass-elevated overflow-hidden">
                <SettingsRow
                  type="toggle"
                  label="Biometric Lock"
                  description="Protect your resumes"
                  icon={<Fingerprint className="w-4 h-4" />}
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
              </div>
            ) : (
              <div className="rounded-2xl glass-elevated overflow-hidden opacity-50 pointer-events-none">
                <div className="flex items-center gap-3 py-3.5 px-4 min-h-[56px]">
                  <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Biometric Lock</p>
                    <p className="text-xs text-muted-foreground">Available on mobile devices with biometrics</p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3 px-1 leading-relaxed">
              Your resumes are stored securely and never sold to third parties.{' '}
              <a
                href="https://magdysaber.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Privacy Policy
              </a>
            </p>
          </div>

          <Separator className="opacity-10" />

          {/* 7. Account - Auth only */}
          {user && (
            <>
              <div id="section-account">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-primary/60" />
                  Account
                </h2>
                <p className="text-xs text-muted-foreground mb-3 px-1">Sign out or delete your data</p>
                <div className="rounded-2xl glass-elevated overflow-hidden">
                  <SettingsRow
                    type="button"
                    label="Delete All Data"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => setDeleteDialogOpen(true)}
                    destructive
                  />
                  <Separator className="bg-border/30" />
                  <SettingsRow
                    type="button"
                    label="Sign Out"
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={handleSignOut}
                    destructive
                  />
                </div>
              </div>
              <Separator className="opacity-10" />
            </>
          )}

          {/* 8. About & Help */}
          <div id="section-about" className="glass-surface-alt">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary/60" />
              About & Help
            </h2>
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
                  navigate('/dashboard');
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
            </div>
          </div>

          {/* Developer Credit Card */}
          <Suspense fallback={null}>
            <DeveloperCreditCard
              name="Magdy Saber"
              title="Creator & Developer"
              avatarUrl={developerPhoto}
              websiteUrl="https://magdysaber.com"
              onContactClick={() => window.open('mailto:contact@magdysaber.com')}
            />
          </Suspense>

          {/* Footer */}
          <div className="text-center pt-2 pb-10 space-y-2">
            <button
              onClick={() => setChangelogOpen(true)}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors touch-manipulation"
            >
              WiseResume v1.5.0
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <a href="https://magdysaber.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacy</a>
              <span>·</span>
              <a href="https://magdysaber.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Terms</a>
              <span>·</span>
              <button onClick={() => setChangelogOpen(true)} className="hover:text-primary transition-colors touch-manipulation">Changelog</button>
            </div>

            <div className="flex items-center justify-center gap-1">
              <a href="https://x.com/magdysaber" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-primary touch-manipulation">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/in/magdysaber" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-primary touch-manipulation">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://github.com/magdysaber" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-primary touch-manipulation">
                <Github className="w-4 h-4" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground">Made in 🇪🇬</p>
          </div>
        </div>
      </div>

      {/* Scroll-to-top FAB */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-5 z-20 w-11 h-11 rounded-full glass-elevated flex items-center justify-center text-primary shadow-lg active:scale-95 transition-transform touch-manipulation border border-border/30"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

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
        {/* PDFDefaultsSheet removed — controls are now inline */}
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

      {/* Changelog Dialog */}
      <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
        <DialogContent className="max-w-sm" hideCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Changelog</DialogTitle>
            <DialogDescription>What's new in WiseResume</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-4 pt-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold">v1.5.0</p>
                <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">Latest</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Polished Tailor Loading Screen</span> — Smooth real-feel progress animation with cubic ease-out curve, animated percentage counter, glowing progress bar, estimated time remaining, and fun facts carousel.
                </li>
                <li>
                  <span className="font-medium text-foreground">Mobile Scroll Fixes</span> — Fixed non-scrollable pages on mobile for Job Details, Application Details, Cover Letters, and Notifications pages.
                </li>
                <li>
                  <span className="font-medium text-foreground">Enhanced Tailor Step Visualization</span> — Redesigned step list with vertical connecting lines, spring-animated checkmarks, and highlighted active step with loading spinner.
                </li>
                <li>
                  <span className="font-medium text-foreground">Projected Score Preview</span> — Live projected ATS score comparison (before vs. after) and skill gap count displayed during the tailoring process.
                </li>
                <li>
                  <span className="font-medium text-foreground">Smart Progress Estimation</span> — Estimated time remaining countdown and percentage-based step transitions that adapt to actual backend response time.
                </li>
              </ul>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-semibold mb-2">v1.0.0</p>
              <p className="text-xs text-muted-foreground">
                Initial release — AI writing assistant, 12 templates, ATS scoring, PDF export, cloud sync, biometric lock, interview prep.
              </p>
            </div>
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

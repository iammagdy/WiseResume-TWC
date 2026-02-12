import { useEffect, useState, lazy, Suspense } from 'react';
import { SettingsSkeleton } from '@/components/layout/PageSkeletons';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Info, 
  ChevronRight, 
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
  Brain,
  Mic,
  Globe,
  Star,
  Share2,
  Mail,
  Chrome,
  RotateCcw
} from 'lucide-react';
import { DeveloperCreditCard } from '@/components/settings/DeveloperCreditCard';
import developerPhoto from '@/assets/developer-photo.png';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { useSettingsStore } from '@/store/settingsStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { useResumeStore } from '@/store/resumeStore';
import { haptics } from '@/lib/haptics';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { toast } from 'sonner';

// Lazy-loaded sheets
const EditProfileSheet = lazy(() => import('@/components/settings/EditProfileSheet').then(m => ({ default: m.EditProfileSheet })));
const PDFDefaultsSheet = lazy(() => import('@/components/settings/PDFDefaultsSheet').then(m => ({ default: m.PDFDefaultsSheet })));
const DataExportSheet = lazy(() => import('@/components/settings/DataExportSheet').then(m => ({ default: m.DataExportSheet })));
const DeleteDataDialog = lazy(() => import('@/components/settings/DeleteDataDialog').then(m => ({ default: m.DeleteDataDialog })));
const BiometricSetupSheet = lazy(() => import('@/components/settings/BiometricSetupSheet').then(m => ({ default: m.BiometricSetupSheet })));
const BiometricTimeoutSheet = lazy(() => import('@/components/settings/BiometricTimeoutSheet').then(m => ({ default: m.BiometricTimeoutSheet })));
const ElevenLabsKeySheet = lazy(() => import('@/components/settings/ElevenLabsKeySheet').then(m => ({ default: m.ElevenLabsKeySheet })));
const AISettingsSheet = lazy(() => import('@/components/settings/AISettingsSheet').then(m => ({ default: m.AISettingsSheet })));

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { currentResumeId } = useResumeStore();
  
  const {
    showAutoSaveToasts,
    setShowAutoSaveToasts,
    showAIEnhancementTips,
    setShowAIEnhancementTips,
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

  // Sheet states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [pdfDefaultsSheetOpen, setPdfDefaultsSheetOpen] = useState(false);
  const [dataExportSheetOpen, setDataExportSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [biometricSetupOpen, setBiometricSetupOpen] = useState(false);
  const [biometricTimeoutOpen, setBiometricTimeoutOpen] = useState(false);
  const [elevenLabsKeyOpen, setElevenLabsKeyOpen] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);

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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

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
    // In a real native app, this would open the app store page
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Profile Section */}
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
              {/* Auth provider badge */}
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

          {/* Appearance */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Appearance
            </h2>
            <div className="p-4 rounded-2xl glass-elevated">
              <ThemeToggle className="w-full justify-center" />
            </div>
          </div>

          {/* Editor Preferences */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Editor Preferences
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="PDF Export Settings"
                icon={<Download className="w-4 h-4" />}
                onClick={() => setPdfDefaultsSheetOpen(true)}
              />
            </div>
          </div>

          {/* AI & Voice */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              AI & Voice
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="AI Provider"
                value={aiProvider === 'wiseresume' ? 'WiseResume AI' : 'Gemini'}
                icon={<Brain className="w-4 h-4" />}
                onClick={() => setAISettingsOpen(true)}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="navigation"
                label="ElevenLabs API Key"
                description="For voice interviews"
                value={elevenlabsApiKey ? '••••••' : 'Not set'}
                icon={<Mic className="w-4 h-4" />}
                onClick={() => setElevenLabsKeyOpen(true)}
              />
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Notifications
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="toggle"
                label="Auto-save Toasts"
                description="Show save confirmations"
                icon={showAutoSaveToasts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                checked={showAutoSaveToasts}
                onCheckedChange={setShowAutoSaveToasts}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="toggle"
                label="AI Enhancement Tips"
                description="Proactive improvement suggestions"
                icon={<Sparkles className="w-4 h-4" />}
                checked={showAIEnhancementTips}
                onCheckedChange={setShowAIEnhancementTips}
              />
            </div>
          </div>

          {/* Data & Export */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Data & Export
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="Export Resumes"
                description={`${resumes.length} resume${resumes.length !== 1 ? 's' : ''} created`}
                icon={<Database className="w-4 h-4" />}
                onClick={() => setDataExportSheetOpen(true)}
              />
            </div>
          </div>

          {/* Privacy & Security */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Privacy & Security
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="toggle"
                label="Biometric Lock"
                description={
                  biometricAvailable 
                    ? "Protect your resumes" 
                    : "Available on mobile app"
                }
                icon={<Fingerprint className="w-4 h-4" />}
                checked={biometricLockEnabled}
                onCheckedChange={handleBiometricToggle}
                disabled={!biometricAvailable}
              />
              {biometricLockEnabled && biometricAvailable && (
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
          </div>

          {/* Account */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Account
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="Language"
                value="English"
                icon={<Globe className="w-4 h-4" />}
                onClick={handleLanguage}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="button"
                label="Take Tour Again"
                description="Replay the welcome onboarding"
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

          {/* About */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              About
            </h2>
            
            <DeveloperCreditCard
              name="Magdy Saber"
              title="Creator & Developer"
              avatarUrl={developerPhoto}
              websiteUrl="https://magdysaber.com"
              onContactClick={() => window.open('mailto:contact@magdysaber.com')}
            />

            <div className="rounded-2xl glass-elevated overflow-hidden mt-3">
              <SettingsRow
                type="button"
                label="Rate WiseResume"
                description="Help us grow ⭐"
                icon={<Star className="w-4 h-4" />}
                onClick={handleRateApp}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="button"
                label="Share WiseResume"
                description="Tell your friends"
                icon={<Share2 className="w-4 h-4" />}
                onClick={handleShareApp}
              />
            </div>

            <div className="p-4 rounded-2xl glass-elevated mt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-sm text-muted-foreground">
                  WiseResume v1.0.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sheets and Dialogs */}
      <Suspense fallback={null}>
        {editProfileOpen && (
          <EditProfileSheet
            open={editProfileOpen}
            onOpenChange={setEditProfileOpen}
            profile={profile}
            userId={user?.id}
            userEmail={user?.email}
            onSave={updateProfile}
          />
        )}
        {pdfDefaultsSheetOpen && (
          <PDFDefaultsSheet
            open={pdfDefaultsSheetOpen}
            onOpenChange={setPdfDefaultsSheetOpen}
            pdfDefaults={pdfDefaults}
            onUpdate={setPdfDefaults}
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
      </Suspense>
    </div>
  );
}

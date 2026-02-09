import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  RotateCcw, 
  Info, 
  ChevronRight, 
  FileSliders, 
  Download, 
  Trash2,
  Bell,
  BellOff,
  Sparkles,
  Shield,
  Database,
  BarChart3,
  CloudOff,
  CheckCircle2,
  Fingerprint,
  Clock,
  Key,
  ExternalLink,
  ArrowLeft,
  Brain,
  Mic
} from 'lucide-react';
import { DeveloperCreditCard } from '@/components/settings/DeveloperCreditCard';
import developerPhoto from '@/assets/developer-photo.png';
import { EditProfileSheet } from '@/components/settings/EditProfileSheet';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { DefaultTemplateSheet } from '@/components/settings/DefaultTemplateSheet';
import { PDFDefaultsSheet } from '@/components/settings/PDFDefaultsSheet';
import { DataExportSheet } from '@/components/settings/DataExportSheet';
import { DeleteDataDialog } from '@/components/settings/DeleteDataDialog';
import { BiometricSetupSheet } from '@/components/settings/BiometricSetupSheet';
import { BiometricTimeoutSheet } from '@/components/settings/BiometricTimeoutSheet';
import { ElevenLabsKeySheet } from '@/components/settings/ElevenLabsKeySheet';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { useSettingsStore } from '@/store/settingsStore';
import { useResumeStore } from '@/store/resumeStore';
import { TEMPLATE_CONFIGS } from '@/lib/templateConfig';
import { haptics } from '@/lib/haptics';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { currentResumeId } = useResumeStore();
  
  // Settings store
  const {
    showAutoSaveToasts,
    setShowAutoSaveToasts,
    showAIEnhancementTips,
    setShowAIEnhancementTips,
    localOnlyMode,
    setLocalOnlyMode,
    analyticsEnabled,
    setAnalyticsEnabled,
    defaultTemplate,
    setDefaultTemplate,
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
 
  // Biometric lock hook
  const { isAvailable: biometricAvailable, biometryType, authenticate } = useBiometricLock(biometricLockEnabled);

  // Sheet states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [pdfDefaultsSheetOpen, setPdfDefaultsSheetOpen] = useState(false);
  const [dataExportSheetOpen, setDataExportSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [biometricSetupOpen, setBiometricSetupOpen] = useState(false);
  const [biometricTimeoutOpen, setBiometricTimeoutOpen] = useState(false);
  const [elevenLabsKeyOpen, setElevenLabsKeyOpen] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);

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
 

  // Redirect if not authenticated
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

  const handleResetOnboarding = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('user_id', user.id);
      haptics.success();
      toast.success('Onboarding reset. Refresh to see it again.');
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

  // Get user initials for avatar fallback
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

  // Display name: prefer profile full_name, fallback to email
  const displayName = profile?.fullName || user?.email || 'User';
  const profileCompletion = calculateProfileCompletion(profile);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
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
          {/* Profile Section - Tappable */}
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
                  {profile?.fullName ? user?.email : 'Tap to complete your profile'}
                </p>
              )}
              {profileCompletion < 100 && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={profileCompletion} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{profileCompletion}%</span>
                </div>
              )}
              {profileCompletion === 100 && (
                <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Profile complete</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>

          {/* Appearance Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Appearance
            </h2>
            <div className="p-4 rounded-2xl glass-elevated">
              <ThemeToggle className="w-full justify-center" />
            </div>
          </div>

          {/* Editor Preferences Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Editor Preferences
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="Default Template"
                value={TEMPLATE_CONFIGS[defaultTemplate].name}
                icon={<FileSliders className="w-4 h-4" />}
                onClick={() => setTemplateSheetOpen(true)}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="navigation"
                label="PDF Export Settings"
                icon={<Download className="w-4 h-4" />}
                onClick={() => setPdfDefaultsSheetOpen(true)}
              />
            </div>
          </div>

          {/* AI & Voice Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              AI & Voice
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="AI Provider"
                value={aiProvider === 'lovable' ? 'WiseResume AI' : 'Gemini'}
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

          {/* Data & Export Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Data & Export
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="navigation"
                label="Export Resumes"
                description={`${resumes.length} resume${resumes.length !== 1 ? 's' : ''} available`}
                icon={<Database className="w-4 h-4" />}
                onClick={() => setDataExportSheetOpen(true)}
              />
            </div>
          </div>

          {/* Privacy Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Privacy
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
              <Separator className="bg-border/30" />
              <SettingsRow
                type="toggle"
                label="Local-Only Mode"
                description="Keep data on device only"
                icon={<CloudOff className="w-4 h-4" />}
                checked={localOnlyMode}
                onCheckedChange={setLocalOnlyMode}
              />
              <Separator className="bg-border/30" />
              <SettingsRow
                type="toggle"
                label="Analytics"
                description="Help improve WiseResume"
                icon={<BarChart3 className="w-4 h-4" />}
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
          </div>


          {/* Account Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              Account
            </h2>
            <div className="rounded-2xl glass-elevated overflow-hidden">
              <SettingsRow
                type="button"
                label="Reset Onboarding"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleResetOnboarding}
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

          {/* About Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              About
            </h2>
            
            {/* Developer Credit Card */}
            <DeveloperCreditCard
              name="Magdy Saber"
              title="Creator & Developer"
              avatarUrl={developerPhoto}
              websiteUrl="https://magdysaber.com"
              onContactClick={() => window.open('mailto:contact@magdysaber.com')}
            />

            {/* Version Info */}
            <div className="p-4 rounded-2xl glass-elevated">
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
      <EditProfileSheet
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        profile={profile}
        userId={user?.id}
        userEmail={user?.email}
        onSave={updateProfile}
      />

      <DefaultTemplateSheet
        open={templateSheetOpen}
        onOpenChange={setTemplateSheetOpen}
        selectedTemplate={defaultTemplate}
        onSelect={setDefaultTemplate}
      />

      <PDFDefaultsSheet
        open={pdfDefaultsSheetOpen}
        onOpenChange={setPdfDefaultsSheetOpen}
        pdfDefaults={pdfDefaults}
        onUpdate={setPdfDefaults}
      />

      <DataExportSheet
        open={dataExportSheetOpen}
        onOpenChange={setDataExportSheetOpen}
        resumes={resumes}
        userEmail={user?.email ?? null}
        userName={profile?.fullName ?? null}
        currentResumeId={currentResumeId}
      />

      {user && (
        <DeleteDataDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userId={user.id}
          resumeCount={resumes.length}
          onDeleted={handleDataDeleted}
        />
      )}
 
      <BiometricSetupSheet
        open={biometricSetupOpen}
        onOpenChange={setBiometricSetupOpen}
        biometryType={biometryType}
        onEnable={handleBiometricSetupConfirm}
      />

      <BiometricTimeoutSheet
        open={biometricTimeoutOpen}
        onOpenChange={setBiometricTimeoutOpen}
        selectedTimeout={biometricLockTimeout}
        onSelect={setBiometricLockTimeout}
      />

      <ElevenLabsKeySheet
        open={elevenLabsKeyOpen}
        onOpenChange={setElevenLabsKeyOpen}
        currentKey={elevenlabsApiKey}
        onSave={setElevenlabsApiKey}
      />

      <AISettingsSheet
        open={aiSettingsOpen}
        onOpenChange={setAISettingsOpen}
      />
    </div>
  );
}

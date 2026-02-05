import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Clock
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { EditProfileSheet } from '@/components/settings/EditProfileSheet';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { DefaultTemplateSheet } from '@/components/settings/DefaultTemplateSheet';
import { PDFDefaultsSheet } from '@/components/settings/PDFDefaultsSheet';
import { DataExportSheet } from '@/components/settings/DataExportSheet';
import { DeleteDataDialog } from '@/components/settings/DeleteDataDialog';
import { BiometricSetupSheet } from '@/components/settings/BiometricSetupSheet';
import { BiometricTimeoutSheet } from '@/components/settings/BiometricTimeoutSheet';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id);
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
   const handleBiometricToggle = async (enabled: boolean) => {
     if (enabled) {
       // Show setup sheet first
       haptics.light();
       setBiometricSetupOpen(true);
     } else {
       // Disable immediately
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
      <MobileLayout showBottomNav>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showBottomNav>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="pt-safe pt-4 pb-3 px-4 border-b border-border">
          <h1 className="text-xl font-bold">Settings</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Profile Section - Tappable */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleOpenEditProfile}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border text-left active:scale-[0.98] transition-transform touch-manipulation"
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
          </motion.button>

          {/* Appearance Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              APPEARANCE
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border">
              <ThemeToggle className="w-full justify-center" />
            </div>
          </motion.div>

          {/* Editor Preferences Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              EDITOR PREFERENCES
            </h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <SettingsRow
                type="navigation"
                label="Default Template"
                value={TEMPLATE_CONFIGS[defaultTemplate].name}
                icon={<FileSliders className="w-4 h-4" />}
                onClick={() => setTemplateSheetOpen(true)}
              />
              <Separator />
              <SettingsRow
                type="navigation"
                label="PDF Export Settings"
                icon={<Download className="w-4 h-4" />}
                onClick={() => setPdfDefaultsSheetOpen(true)}
              />
            </div>
          </motion.div>

          {/* Notifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              NOTIFICATIONS
            </h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <SettingsRow
                type="toggle"
                label="Auto-save Toasts"
                description="Show save confirmations"
                icon={showAutoSaveToasts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                checked={showAutoSaveToasts}
                onCheckedChange={setShowAutoSaveToasts}
              />
              <Separator />
              <SettingsRow
                type="toggle"
                label="AI Enhancement Tips"
                description="Proactive improvement suggestions"
                icon={<Sparkles className="w-4 h-4" />}
                checked={showAIEnhancementTips}
                onCheckedChange={setShowAIEnhancementTips}
              />
            </div>
          </motion.div>

          {/* Data & Export Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              DATA & EXPORT
            </h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <SettingsRow
                type="navigation"
                label="Export Resumes"
                description={`${resumes.length} resume${resumes.length !== 1 ? 's' : ''} available`}
                icon={<Database className="w-4 h-4" />}
                onClick={() => setDataExportSheetOpen(true)}
              />
            </div>
          </motion.div>

          {/* Privacy Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              PRIVACY
            </h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
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
                  <Separator />
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
              <Separator />
              <SettingsRow
                type="toggle"
                label="Local-Only Mode"
                description="Keep data on device only"
                icon={<CloudOff className="w-4 h-4" />}
                checked={localOnlyMode}
                onCheckedChange={setLocalOnlyMode}
              />
              <Separator />
              <SettingsRow
                type="toggle"
                label="Analytics"
                description="Help improve WiseResume"
                icon={<BarChart3 className="w-4 h-4" />}
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
          </motion.div>

          {/* Account Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              ACCOUNT
            </h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <SettingsRow
                type="button"
                label="Reset Onboarding"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleResetOnboarding}
              />
              <Separator />
              <SettingsRow
                type="button"
                label="Delete All Data"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setDeleteDialogOpen(true)}
                destructive
              />
              <Separator />
              <SettingsRow
                type="button"
                label="Sign Out"
                icon={<LogOut className="w-4 h-4" />}
                onClick={handleSignOut}
                destructive
              />
            </div>
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              ABOUT
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  WiseResume v1.0.0
                </span>
              </div>
            </div>
          </motion.div>
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
    </MobileLayout>
  );
}

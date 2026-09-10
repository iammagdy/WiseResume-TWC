import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react';
import { getAppUrl } from '@/lib/portfolioUrl';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, LogOut, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { openExternal } from '@/lib/openExternal';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { usePlan } from '@/hooks/usePlan';
import { useSettingsStore } from '@/store/settingsStore';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { toast } from 'sonner';
import { AppIcon } from '@/components/brand/AppIcon';
import { SettingsSkeleton } from '@/components/layout/PageSkeletons';
import { getChangelog } from '@/hooks/useChangelogBadge';
import { getBuildVersionLabel } from '@/lib/appVersion';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsProfileHero } from '@/components/settings/SettingsProfileHero';
import { withAvatarCacheBust } from '@/lib/avatarStorage';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { SettingsTabLayout, SettingsTabContent, type SettingsTabId } from '@/components/settings/SettingsTabLayout';
import { SettingsSearchInput } from '@/components/settings/SettingsSearchInput';
import { useLocale } from '@/i18n/LocaleProvider';
import '@/components/settings/settings-workspace.css';

// Lazy-loaded sheets
const EditProfileSheet = lazyWithRetry(() => import('@/components/settings/EditProfileSheet').then((m) => ({ default: m.EditProfileSheet })));
const DataExportSheet = lazyWithRetry(() => import('@/components/settings/DataExportSheet').then((m) => ({ default: m.DataExportSheet })));
const DeleteDataDialog = lazyWithRetry(() => import('@/components/settings/DeleteDataDialog').then((m) => ({ default: m.DeleteDataDialog })));
const BiometricSetupSheet = lazyWithRetry(() => import('@/components/settings/BiometricSetupSheet').then((m) => ({ default: m.BiometricSetupSheet })));
const BiometricTimeoutSheet = lazyWithRetry(() => import('@/components/settings/BiometricTimeoutSheet').then((m) => ({ default: m.BiometricTimeoutSheet })));
const HelpSheet = lazyWithRetry(() => import('@/components/settings/HelpSheet').then((m) => ({ default: m.HelpSheet })));

// Extracted section components
import { TalentPoolDiscoverableCard } from '@/components/settings/TalentPoolDiscoverableCard';
import { AccountSection } from '@/components/settings/sections/AccountSection';
import { AIEngineSection } from '@/components/settings/sections/AIEngineSection';
import { AppearanceSection } from '@/components/settings/sections/AppearanceSection';
import { EditorExportSection } from '@/components/settings/sections/EditorExportSection';
import { NotificationsSection } from '@/components/settings/sections/NotificationsSection';
import { PrivacySection } from '@/components/settings/sections/PrivacySection';
import { AboutSection } from '@/components/settings/sections/AboutSection';
import { DangerZoneSection } from '@/components/settings/sections/DangerZoneSection';
import { ChangelogDialog } from '@/components/settings/ChangelogDialog';
import { AboutDialog } from '@/components/settings/AboutDialog';

function UserIdCard({ userId }: { userId: string }) {
  const { t } = useLocale();
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
      className="settings-user-id w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left touch-manipulation"
      title={t('app.settingsPage.userId.title', 'انسخ معرّف المستخدم')}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{t('app.settingsPage.userId.label', 'معرّف المستخدم')}</p>
        <p className="font-mono text-xs text-foreground truncate">{userId}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('app.settingsPage.userId.description', 'شارِك هذا المعرّف مع الدعم إذا احتجت إلى مساعدة في حسابك.')}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
        {copied ? t('app.settingsPage.userId.copied', 'تم النسخ') : t('app.settingsPage.userId.copy', 'نسخ')}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user, loading, signOut } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id);
  const { plan } = usePlan();
  const { data: resumes = [] } = useResumes();
  const { currentResumeId } = useResumeStore();

  const {
    biometricLockEnabled,
    setBiometricLockEnabled,
  } = useSettingsStore();

  const { isAvailable: _biometricAvailable, biometryType, authenticate } = useBiometricLock(biometricLockEnabled);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sheet states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [dataExportSheetOpen, setDataExportSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [biometricSetupOpen, setBiometricSetupOpen] = useState(false);
  const [biometricTimeoutOpen, setBiometricTimeoutOpen] = useState(false);
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  // Dynamic changelog
  const [, setChangelogData] = useState<{ version: string }[]>([]);
  const changelogFetchedAt = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('changelog') === 'true') {
      setChangelogOpen(true);
      // Clean up the query param while keeping other params like tab
      params.delete('changelog');
      const remaining = params.toString();
      window.history.replaceState({}, '', remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname);
    }
  }, []);

  useEffect(() => {
    getChangelog().then((data) => {
      setChangelogData(data);
      changelogFetchedAt.current = Date.now();
    });
  }, []);

  const appVersion = getBuildVersionLabel();

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
    toast.success(t('app.settingsPage.toasts.signedOut', 'تم تسجيل الخروج بنجاح'));
  }, [signOut, navigate, t]);

  const handleDataDeleted = useCallback(async () => {
    try {
      await signOut();
    } catch { /* sign-out after delete is best-effort */ }
    toast.success(t('app.settingsPage.toasts.dataDeleted', 'تم حذف جميع البيانات'));
    window.location.replace('/');
  }, [signOut, t]);

  const handleShareApp = useCallback(async () => {
    const shareData = {
      title: t('app.settingsPage.share.title', 'WiseResume'),
      text: t('app.settingsPage.share.text', 'أنشئ سيرة ذاتية احترافية خلال دقائق بمساعدة الذكاء الاصطناعي.'),
      url: getAppUrl()
    };
    haptics.light();
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled share */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success(t('app.settingsPage.toasts.linkCopied', 'تم نسخ الرابط'));
      } catch { /* clipboard unavailable */ }
    }
  }, [t]);

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

  const displayName = profile?.fullName || user?.email || t('app.settingsPage.userFallback', 'مستخدم');
  const planLabel = plan === 'premium' ? 'Ultimate' : plan.charAt(0).toUpperCase() + plan.slice(1);
  const planCta =
    plan === 'free'
      ? t('app.settingsPage.plan.free', 'الخطة المجانية · استخدم كوبوناً للترقية')
      : t('app.settingsPage.plan.paid', 'خطة {{plan}} · إدارة الاشتراك', {
          plan: planLabel,
        });

  // Search indexing and filtering
  const searchableSections = useMemo(() => {
    return [
      {
        id: 'account-main',
        tabId: 'account' as SettingsTabId,
        tabLabel: t('settings.tabs.account', 'Account'),
        title: t('app.settingsPage.sections.account.title', 'Account & Subscription'),
        keywords: ['account', 'email', 'name', 'avatar', 'user id', 'subscription', 'plan', 'billing', 'password', 'sign out', 'logout'],
        render: () => (
          <div className="space-y-6">
            {user && (
              <SettingsProfileHero
                plan={plan}
                avatarUrl={withAvatarCacheBust(profile?.avatarUrl, profile?.updatedAt)}
                initials={getInitials()}
                displayName={displayName}
                email={user.email}
                planCta={planCta}
                onOpenProfile={() => navigate('/profile')}
                onManagePlan={(e) => {
                  e.stopPropagation();
                  navigate('/subscription');
                }}
                onEditSettings={() => setEditProfileOpen(true)}
              />
            )}
            {user ? (
              <SettingsSection title={t('app.settingsPage.sections.account.title', 'Account')} description={t('app.settingsPage.sections.account.description', 'Plan, usage, and sign in credentials')}>
                <AccountSection authProvider="Appwrite" />
                <UserIdCard userId={user.id} />
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-soft">
                  <SettingsRow
                    type="button"
                    label={t('app.settingsPage.signOut.label', 'Sign Out')}
                    description={t('app.settingsPage.signOut.description', 'End your active session on this device')}
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={() => setSignOutConfirmOpen(true)}
                  />
                </div>
              </SettingsSection>
            ) : (
              <GuestCtaCard navigate={navigate} />
            )}
          </div>
        ),
      },
      {
        id: 'preferences-ai',
        tabId: 'preferences' as SettingsTabId,
        tabLabel: t('settings.tabs.preferences', 'AI & Preferences'),
        title: t('app.settingsPage.sections.aiEngine.title', 'AI Engine Settings'),
        keywords: ['ai', 'engine', 'gpt', 'claude', 'gemini', 'ollama', 'byok', 'model', 'creativity', 'temperature', 'tailoring', 'privacy'],
        render: () => (
          user ? (
            <SettingsSection title={t('app.settingsPage.sections.aiEngine.title', 'AI Engine')} description={t('app.settingsPage.sections.aiEngine.description', 'AI model, tailoring intensity, and writing preferences')}>
              <AIEngineSection />
            </SettingsSection>
          ) : null
        ),
      },
      {
        id: 'preferences-appearance-export',
        tabId: 'preferences' as SettingsTabId,
        tabLabel: t('settings.tabs.preferences', 'AI & Preferences'),
        title: t('app.settingsPage.sections.preferences.title', 'Appearance & Export Defaults'),
        keywords: ['theme', 'dark mode', 'light mode', 'appearance', 'color', 'export', 'pdf', 'paper size', 'margins', 'page numbers', 'download'],
        render: () => (
          <SettingsSection title={t('app.settingsPage.sections.preferences.title', 'Preferences')} description={t('app.settingsPage.sections.preferences.description', 'Theme, font scaling, and default document export settings')}>
            <AppearanceSection />
            <EditorExportSection
              isSignedIn={!!user}
              onManageExports={() => setDataExportSheetOpen(true)}
              onNavigateAuth={() => navigate('/auth?mode=login')}
            />
          </SettingsSection>
        ),
      },
      {
        id: 'notifications-main',
        tabId: 'notifications' as SettingsTabId,
        tabLabel: t('settings.tabs.notifications', 'الإشعارات'),
        title: t('app.settingsPage.sections.notifications.title', 'Notifications & Alerts'),
        keywords: ['notifications', 'alerts', 'email', 'marketing', 'job alerts', 'updates'],
        render: () => (
          <SettingsSection title={t('app.settingsPage.sections.notifications.title', 'الإشعارات')}>
            <NotificationsSection />
          </SettingsSection>
        ),
      },
      {
        id: 'privacy-security',
        tabId: 'privacy' as SettingsTabId,
        tabLabel: t('settings.tabs.privacy', 'Privacy & Security'),
        title: t('app.settingsPage.sections.privacy.title', 'Privacy, Biometrics & Data'),
        keywords: ['privacy', 'security', 'biometric', 'fingerprint', 'face id', 'lock', 'timeout', 'redact', 'pii', 'talent pool', 'gdpr', 'data export'],
        render: () => (
          <SettingsSection title={t('app.settingsPage.sections.privacy.title', 'Privacy & Security')}>
            <PrivacySection
              onOpenBiometricTimeout={() => setBiometricTimeoutOpen(true)}
              onBiometricToggle={handleBiometricToggle}
            />
            {user && <TalentPoolDiscoverableCard />}
          </SettingsSection>
        ),
      },
      {
        id: 'help-about',
        tabId: 'help' as SettingsTabId,
        tabLabel: t('settings.tabs.help', 'Help'),
        title: t('app.settingsPage.sections.support.title', 'Help, Guides & About'),
        keywords: ['help', 'support', 'about', 'tour', 'guide', 'faq', 'contact', 'changelog', 'version', 'rate', 'share'],
        render: () => (
          <SettingsSection title={t('app.settingsPage.sections.support.title', 'Support & About')} description={t('app.settingsPage.sections.support.description', 'Assistance, tutorials, product updates, and feedback')}>
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
                toast.success(t('app.settingsPage.toasts.onboardingReset', 'Onboarding reset · Redirecting'));
                navigate('/onboarding');
              }}
              onRateApp={handleRateApp}
              onShareApp={handleShareApp}
              onOpenHelp={() => setHelpSheetOpen(true)}
              onOpenChangelog={() => setChangelogOpen(true)}
            />
          </SettingsSection>
        ),
      },
      {
        id: 'help-danger',
        tabId: 'help' as SettingsTabId,
        tabLabel: t('settings.tabs.help', 'Help'),
        title: t('app.settingsPage.sections.danger.title', 'Danger Zone'),
        keywords: ['danger', 'delete', 'account', 'data', 'reset', 'erase', 'destroy'],
        render: () => (
          user ? (
            <SettingsSection title={t('app.settingsPage.sections.danger.title', 'Danger Zone')} variant="danger">
              <DangerZoneSection
                onDeleteData={() => setDeleteDialogOpen(true)}
              />
            </SettingsSection>
          ) : null
        ),
      },
    ];
  }, [user, profile, plan, planCta, displayName, appVersion, handleRateApp, handleShareApp, handleBiometricToggle, navigate, t]);

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return searchableSections.filter((section) => {
      const titleMatch = section.title.toLowerCase().includes(q);
      const keywordMatch = section.keywords.some(k => k.toLowerCase().includes(q));
      return titleMatch || keywordMatch;
    });
  }, [searchQuery, searchableSections]);

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="settings-workspace flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="settings-workspace__scroll flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-28 space-y-6 w-full max-w-5xl mx-auto">
        {/* Page Header with Title and Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('settings.title', 'Settings')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('settings.subtitle', 'Manage your account, preferences, privacy, and system configurations.')}
            </p>
          </div>

          <SettingsSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full sm:w-72 shrink-0"
          />
        </div>

        {/* Search Results Mode */}
        {searchQuery.trim() !== '' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {t('settings.searchResultsFor', 'Results for "{{query}}"', { query: searchQuery })} ({searchResults.length})
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t('settings.clearSearch', 'Clear search')}
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card space-y-3">
                <Search className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="text-base font-semibold text-foreground">
                  {t('settings.noResultsFound', 'No settings found')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t('settings.noResultsDesc', 'No settings matching your search query were found. Try another search term or browse the tabs.')}
                </p>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                  {t('settings.showAllSettings', 'Show all settings')}
                </Button>
              </div>
            ) : (
              searchResults.map((section) => (
                <div key={section.id} className="space-y-2">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                    {section.tabLabel}
                  </span>
                  {section.render()}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Normal Tabbed Navigation Mode */
          <SettingsTabLayout>
            {/* Tab 1: Account */}
            <SettingsTabContent id="account">
              <div className="space-y-6">
                {!user ? (
                  <GuestCtaCard navigate={navigate} />
                ) : (
                  <>
                    <SettingsProfileHero
                      plan={plan}
                      avatarUrl={withAvatarCacheBust(profile?.avatarUrl, profile?.updatedAt)}
                      initials={getInitials()}
                      displayName={displayName}
                      email={user.email}
                      planCta={planCta}
                      onOpenProfile={() => navigate('/profile')}
                      onManagePlan={(e) => {
                        e.stopPropagation();
                        navigate('/subscription');
                      }}
                      onEditSettings={() => setEditProfileOpen(true)}
                    />

                    <SettingsSection
                      title={t('app.settingsPage.sections.account.title', 'Account')}
                      description={t('app.settingsPage.sections.account.description', 'Plan, usage, and sign in credentials')}
                    >
                      <AccountSection authProvider="Appwrite" />
                      <UserIdCard userId={user.id} />
                      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-soft">
                        <SettingsRow
                          type="button"
                          label={t('app.settingsPage.signOut.label', 'Sign Out')}
                          description={t('app.settingsPage.signOut.description', 'End your active session on this device')}
                          icon={<LogOut className="w-4 h-4" />}
                          onClick={() => setSignOutConfirmOpen(true)}
                        />
                      </div>
                    </SettingsSection>
                  </>
                )}
              </div>
            </SettingsTabContent>

            {/* Tab 2: Preferences (AI Engine, Theme, Export Defaults) */}
            <SettingsTabContent id="preferences">
              <div className="space-y-6">
                {user && (
                  <SettingsSection
                    title={t('app.settingsPage.sections.aiEngine.title', 'AI Engine')}
                    description={t('app.settingsPage.sections.aiEngine.description', 'AI model, tailoring intensity, and writing preferences')}
                  >
                    <AIEngineSection />
                  </SettingsSection>
                )}

                <SettingsSection
                  title={t('app.settingsPage.sections.preferences.title', 'Preferences')}
                  description={t('app.settingsPage.sections.preferences.description', 'Theme, font scaling, and default document export settings')}
                >
                  <AppearanceSection />
                  <EditorExportSection
                    isSignedIn={!!user}
                    onManageExports={() => setDataExportSheetOpen(true)}
                    onNavigateAuth={() => navigate('/auth?mode=login')}
                  />
                </SettingsSection>
              </div>
            </SettingsTabContent>

            {/* Tab 3: Notifications */}
            <SettingsTabContent id="notifications">
              <div className="space-y-6">
                <SettingsSection title={t('app.settingsPage.sections.notifications.title', 'الإشعارات')}>
                  <NotificationsSection />
                </SettingsSection>
              </div>
            </SettingsTabContent>

            {/* Tab 4: Privacy & Security */}
            <SettingsTabContent id="privacy">
              <div className="space-y-6">
                <SettingsSection title={t('app.settingsPage.sections.privacy.title', 'Privacy & Security')}>
                  <PrivacySection
                    onOpenBiometricTimeout={() => setBiometricTimeoutOpen(true)}
                    onBiometricToggle={handleBiometricToggle}
                  />
                  {user && <TalentPoolDiscoverableCard />}
                </SettingsSection>
              </div>
            </SettingsTabContent>

            {/* Tab 5: Help, Support & Danger Zone */}
            <SettingsTabContent id="help">
              <div className="space-y-6">
                <SettingsSection
                  title={t('app.settingsPage.sections.support.title', 'Support & About')}
                  description={t('app.settingsPage.sections.support.description', 'Assistance, tutorials, product updates, and feedback')}
                >
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
                      toast.success(t('app.settingsPage.toasts.onboardingReset', 'Onboarding reset · Redirecting'));
                      navigate('/onboarding');
                    }}
                    onRateApp={handleRateApp}
                    onShareApp={handleShareApp}
                    onOpenHelp={() => setHelpSheetOpen(true)}
                    onOpenChangelog={() => setChangelogOpen(true)}
                  />
                </SettingsSection>

                {user && (
                  <SettingsSection title={t('app.settingsPage.sections.danger.title', 'Danger Zone')} variant="danger">
                    <DangerZoneSection
                      onDeleteData={() => setDeleteDialogOpen(true)}
                    />
                  </SettingsSection>
                )}

                <SettingsFooter appVersion={appVersion} />
              </div>
            </SettingsTabContent>
          </SettingsTabLayout>
        )}
      </div>

      {/* Sheets & Dialogs */}
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
        {helpSheetOpen && <HelpSheet open={helpSheetOpen} onOpenChange={setHelpSheetOpen} />}
      </Suspense>

      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('app.settingsPage.signOut.confirmTitle', 'تسجيل الخروج؟')}</AlertDialogTitle>
            <AlertDialogDescription>{t('app.settingsPage.signOut.confirmDescription', 'ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى بياناتك.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'إلغاء')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground">
              {t('app.settingsPage.signOut.label', 'تسجيل الخروج')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
      <AboutDialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen} appVersion={appVersion} />
    </div>
  );
}

function GuestCtaCard({ navigate }: { navigate: (path: string) => void; }) {
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('wr-settings-guest-cta-dismissed') === '1');
  return (
    <AnimatePresence mode="wait">
      {!dismissed ? (
        <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="settings-profile-hero p-4 relative">
          <div className="settings-profile-hero__glow" aria-hidden />
          <button
            onClick={() => {
              setDismissed(true);
              localStorage.setItem('wr-settings-guest-cta-dismissed', '1');
            }}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-4">
            <AppIcon size={32} />
            <div>
              <p className="font-medium">{t('app.settingsPage.guest.title', 'مرحباً بك')}</p>
              <p className="text-sm text-muted-foreground">{t('app.settingsPage.guest.description', 'أنشئ حساباً مجانياً لفتح المزيد من المزايا.')}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/auth?mode=signup')} className="w-full mt-4">
            {t('app.settingsPage.guest.cta', 'ابدأ مجاناً')}
          </Button>
        </motion.div>
      ) : (
        <div className="settings-card-group overflow-hidden">
          <SettingsRow
            type="navigation"
            label={t('app.settingsPage.guest.signIn', 'سجّل الدخول لفتح جميع المزايا')}
            onClick={() => navigate('/auth?mode=login')}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

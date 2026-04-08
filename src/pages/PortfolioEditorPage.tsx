import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CareerCardSheet } from '@/components/portfolio/CareerCardSheet';
import { QRGeneratorSheet } from '@/components/portfolio/qr/QRGeneratorSheet';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { supabase } from '@/integrations/supabase/safeClient';

import { EDGE_FUNCTIONS_URL } from '@/lib/supabaseConstants';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { PortfolioEditorSkeleton } from '@/components/layout/PageSkeletons';

import { useNavigate } from 'react-router-dom';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { getPortfolioUrl } from '@/lib/portfolioUrl';
import { openExternal } from '@/lib/openExternal';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { normalizeUrl } from '@/lib/urlUtils';

import type { PortfolioStyle, PortfolioLayout, PortfolioFont } from '@/components/portfolio/editor/AppearanceSection';
import { type PortfolioSections, DEFAULT_SECTIONS } from '@/components/portfolio/editor/ContentVisibilitySection';
import { LivePreviewCard } from '@/components/portfolio/editor/LivePreviewCard';
import { StatusBar } from '@/components/portfolio/editor/StatusBar';
import { SetupTab } from '@/components/portfolio/editor/SetupTab';
import { ContentTab } from '@/components/portfolio/editor/ContentTab';
import { DesignTab } from '@/components/portfolio/editor/DesignTab';
import { MoreTab } from '@/components/portfolio/editor/MoreTab';
import { SaveBar } from '@/components/portfolio/editor/SaveBar';
import { PortfolioHistorySheet } from '@/components/portfolio/PortfolioHistorySheet';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';


export default function PortfolioEditorPage() {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { saveSnapshot } = usePortfolioHistory(user?.id);
  const queryClient = useQueryClient();

  // Collapsible sections state — all collapsed by default
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  }, []);


  // Core state
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [bio, setBio] = useState('');
  const [portfolioEnabled, setPortfolioEnabled] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatingSEO, setGeneratingSEO] = useState(false);
  const [generatingAvailability, setGeneratingAvailability] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [sections, setSections] = useState<PortfolioSections>(DEFAULT_SECTIONS);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [portfolioStyle, setPortfolioStyle] = useState<PortfolioStyle>('minimal');
  const [portfolioLayout, setPortfolioLayout] = useState<PortfolioLayout>('single');
  const [portfolioAccentColor, setPortfolioAccentColor] = useState('#e84545');
  const [portfolioFont, setPortfolioFont] = useState<PortfolioFont>('inter');
  const [openToWork, setOpenToWork] = useState(false);
  const [availabilityHeadline, setAvailabilityHeadline] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showCareerCard, setShowCareerCard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRestoringHistory, setIsRestoringHistory] = useState(false);
  const [syncMode, setSyncMode] = useState<'auto' | 'locked'>('auto');
  const [caseStudies, setCaseStudies] = useState<Array<{id: string;title: string;challenge: string;outcome: string;}>>([]);
  const [services, setServices] = useState<Array<{id: string;title: string;description: string;category: string;}>>([]);
  const [testimonials, setTestimonials] = useState<Array<{id: string;quote: string;authorName: string;authorTitle: string;}>>([]);
  const [highlights, setHighlights] = useState<Array<{id: string;value: string;label: string;}>>([]);
  const [portfolioSummary, setPortfolioSummary] = useState('');
  const [activeTab, setActiveTab] = useState<'setup' | 'content' | 'design' | 'more'>('setup');

  // ── Unsaved changes tracking ──
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);
  const navigate = useNavigate();

  const getCurrentSnapshot = useCallback(() => {
    return JSON.stringify({
      username, bio, portfolioEnabled, githubUrl, websiteUrl, twitterUrl,
      linkedinUrl, contactEmail, selectedTheme, sections, metaTitle,
      metaDescription, portfolioStyle, portfolioLayout, portfolioAccentColor,
      portfolioFont, openToWork, availabilityHeadline, syncMode,
      caseStudies, services, testimonials, highlights, portfolioSummary,
      selectedResumeId,
    });
  }, [
    username, bio, portfolioEnabled, githubUrl, websiteUrl, twitterUrl,
    linkedinUrl, contactEmail, selectedTheme, sections, metaTitle,
    metaDescription, portfolioStyle, portfolioLayout, portfolioAccentColor,
    portfolioFont, openToWork, availabilityHeadline, syncMode,
    caseStudies, services, testimonials, highlights, portfolioSummary,
    selectedResumeId,
  ]);

  const tabIndexMap = { setup: 0, content: 1, design: 2, more: 3 } as const;
  const directionRef = useRef(0);
  const prevTabRef = useRef(activeTab);
  const reducedMotion = useMemo(() => getSafeMatchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const handleTabChange = useCallback((tab: 'setup' | 'content' | 'design' | 'more') => {
    directionRef.current = tabIndexMap[tab] > tabIndexMap[prevTabRef.current] ? 1 : -1;
    prevTabRef.current = tab;
    haptics.light();
    setActiveTab(tab);
  }, [tabIndexMap]);

  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync profile → local state
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.portfolioBio || '');
      setPortfolioEnabled(profile.portfolioEnabled || false);
      setGithubUrl(profile.githubUrl || '');
      setWebsiteUrl(profile.websiteUrl || '');
      setTwitterUrl(profile.twitterUrl || '');
      setLinkedinUrl(profile.linkedinUrl || '');
      setContactEmail(profile.contactEmail || '');
      setSelectedTheme(profile.theme || 'system');
      setSections((profile.portfolioSections as PortfolioSections) || DEFAULT_SECTIONS);
      setMetaTitle(profile.portfolioMetaTitle || '');
      setMetaDescription(profile.portfolioMetaDescription || '');
      setPortfolioStyle((profile.portfolioStyle || 'minimal') as PortfolioStyle);
      setPortfolioLayout((profile.portfolioLayout || 'single') as PortfolioLayout);
      setPortfolioAccentColor(profile.portfolioAccentColor || '#e84545');
      setPortfolioFont((profile.portfolioFont || 'inter') as PortfolioFont);
      setOpenToWork(profile.openToWork || false);
      setAvailabilityHeadline(profile.availabilityHeadline || '');
      setSyncMode(profile.portfolioSyncMode as 'auto' | 'locked' || 'auto');
      const extras = profile.portfolioExtras || {};
      setCaseStudies(extras.caseStudies as Array<{id: string;title: string;challenge: string;outcome: string;}> || []);
      setServices(extras.services as Array<{id: string;title: string;description: string;category: string;}> || []);
      setTestimonials(extras.testimonials as Array<{id: string;quote: string;authorName: string;authorTitle: string;}> || []);
      setHighlights(extras.highlights as Array<{id: string;value: string;label: string;}> || []);
      setPortfolioSummary(extras.portfolioSummary as string || '');
    }
  }, [profile]);

  // Capture snapshot after profile syncs to local state
  useEffect(() => {
    if (profile && !lastSavedSnapshot) {
      // Delay by 1 tick so all setState calls from the profile sync effect have flushed
      const id = requestAnimationFrame(() => setLastSavedSnapshot(getCurrentSnapshot()));
      return () => cancelAnimationFrame(id);
    }
  }, [profile, lastSavedSnapshot, getCurrentSnapshot]);

  // Browser close/refresh warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [lastSavedSnapshot, getCurrentSnapshot]);

  // In-app navigation guard
  const handleNavigateAway = useCallback((path: string) => {
    if (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot) {
      setPendingNavPath(path);
    } else {
      navigate(path);
    }
  }, [lastSavedSnapshot, getCurrentSnapshot, navigate]);

  // Init selectedResumeId
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const hasData = (r: typeof resumes[0]) => !!(r.summary || r.experience && (r.experience as unknown[]).length > 0);
      if (profile?.portfolioResumeId && resumes.some((r) => r.id === profile.portfolioResumeId)) {
        setSelectedResumeId(profile.portfolioResumeId);
      } else {
        const withData = resumes.find(hasData);
        const primary = resumes.find((r) => r.is_primary);
        setSelectedResumeId(withData?.id || primary?.id || resumes[0].id);
      }
    }
  }, [resumes, selectedResumeId, profile?.portfolioResumeId]);

  // Debounced username availability check
  useEffect(() => {
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    if (!username || username.length < 3 || usernameError) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    if (profile?.username === username) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    setUsernameAvailable(null);
    usernameCheckRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('check_username_available', {
          p_username: username,
          p_user_id: user!.id
        });
        if (error) throw error;
        setUsernameAvailable(data === true);
      } catch (err) {
        console.error('Failed to check username availability:', err);
        setUsernameAvailable(null);
        toast.error('Failed to check username availability. Please try again.');
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => {if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);};
  }, [username, usernameError, user, profile?.username]);



  if (!user) return null;
  if (loading || !profile) return <PortfolioEditorSkeleton />;

  const validateUsername = (value: string) => {
    if (!value) {setUsernameError('');return;}
    if (value.length < 3) {setUsernameError('At least 3 characters');return;}
    if (value.length > 30) {setUsernameError('Max 30 characters');return;}
    if (!/^[a-z0-9-]+$/.test(value)) {setUsernameError('Only lowercase letters, numbers, hyphens');return;}
    if (value.startsWith('-') || value.endsWith('-')) {setUsernameError('Cannot start or end with hyphen');return;}
    setUsernameError('');
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(clean);
    validateUsername(clean);
  };

  const callPortfolioAI = async (action: string, extraBody?: Record<string, unknown>) => {
    // Priority: 1. State selectedResumeId, 2. Profile linked resume, 3. Primary resume, 4. Any resume
    const linkedResumeId = profile?.portfolioResumeId;
    const primaryResumeId = resumes.find(r => r.is_primary)?.id;
    const targetId = selectedResumeId || linkedResumeId || primaryResumeId || resumes[0]?.id;
    
    const selectedResume = resumes.find((r) => r.id === targetId);

    if (!selectedResume && action === 'bio') {
      throw new Error("Resume data not available yet. Please wait a moment.");
    }

    const token = await getSupabaseToken();
    const res = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/generate-portfolio-bio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action,
        summary: selectedResume?.summary || '',
        fullName: profile?.fullName || '',
        jobTitle: profile?.jobTitle || '',
        experience: selectedResume?.experience || [],
        skills: selectedResume?.skills || [],
        careerLevel: profile?.careerLevel || 'mid',
        ...extraBody
      })
    });
    if (!res.ok) throw new Error(`AI request failed`);
    return res.json();
  };

  const handleGenerateBio = async () => {
    const selectedResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];
    if (!selectedResume?.summary && !profile?.jobTitle && (!selectedResume?.experience || (selectedResume.experience as unknown[]).length === 0)) {
      toast.error('Selected resume has no data for bio generation.');
      return;
    }
    setGeneratingBio(true);
    haptics.light();
    try {
      const { bio: generatedBio } = await callPortfolioAI('bio');
      setBio(generatedBio);
      toast.success('Bio generated!');
    } catch (err: unknown) {
      console.error('Bio generation failed:', err);
      toast.error('Failed to generate bio. Please try again later.');
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleGenerateSEO = async () => {
    setGeneratingSEO(true);
    haptics.light();
    try {
      const { metaTitle: t, metaDescription: d } = await callPortfolioAI('seo');
      if (t) setMetaTitle(t);
      if (d) setMetaDescription(d);
      toast.success('SEO meta generated!');
    } catch (err: unknown) {
      console.error('SEO generation failed:', err);
      toast.error('Failed to generate SEO meta. Please try again later.');
    } finally {
      setGeneratingSEO(false);
    }
  };

  const handleGenerateAvailability = async () => {
    setGeneratingAvailability(true);
    haptics.light();
    try {
      const { headline } = await callPortfolioAI('availability');
      if (headline) setAvailabilityHeadline(headline);
      toast.success('Availability headline generated!');
    } catch (err: unknown) {
      console.error('Headline generation failed:', err);
      toast.error('Failed to generate headline. Please try again later.');
    } finally {
      setGeneratingAvailability(false);
    }
  };

  const handleSave = async (overrides?: {portfolioEnabled?: boolean;}) => {
    const isEnabling = overrides?.portfolioEnabled === true ||
    overrides?.portfolioEnabled === undefined && portfolioEnabled;
    if (isEnabling && !username) {
      toast.error('Set a username before publishing your portfolio.');
      setSavingPortfolio(false);
      return;
    }
    if (usernameError) return;
    setSavingPortfolio(true);
    haptics.light();
    try {
      if (username && username.length >= 3 && profile?.username !== username) {
        const { data: available } = await supabase.rpc('check_username_available', {
          p_username: username,
          p_user_id: user!.id
        });
        if (!available) {
          setUsernameAvailable(false);
          toast.error('Username was just taken. Please choose another.');
          setSavingPortfolio(false);
          return;
        }
      }
      const updates: Record<string, unknown> = {
        username: username || null,
        portfolioBio: bio || null,
        portfolioEnabled: overrides?.portfolioEnabled !== undefined ? overrides.portfolioEnabled : portfolioEnabled,
        portfolioResumeId: selectedResumeId || null,
        githubUrl: normalizeUrl(githubUrl) || null,
        websiteUrl: normalizeUrl(websiteUrl) || null,
        twitterUrl: normalizeUrl(twitterUrl) || null,
        linkedinUrl: normalizeUrl(linkedinUrl) || null,
        contactEmail: contactEmail?.trim().toLowerCase() || null,
        theme: selectedTheme,
        portfolioSections: sections,
        portfolioMetaTitle: metaTitle || null,
        portfolioMetaDescription: metaDescription || null,
        portfolioStyle,
        portfolioLayout,
        portfolioAccentColor: portfolioAccentColor || null,
        portfolioFont,
        openToWork,
        availabilityHeadline: availabilityHeadline || null,
        portfolioSyncMode: syncMode,
        portfolioExtras: { caseStudies, services, testimonials, highlights, portfolioSummary }
      };

      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      
      // Save history snapshot (fire and forget to not block UI)
      if (overrides?.portfolioEnabled === undefined) {
        saveSnapshot(updates as Record<string, unknown>).catch(e => {
          console.error("Failed to save history snapshot", e);
        });
      }

      setLastSavedSnapshot(getCurrentSnapshot());

      // Invalidate public portfolio cache to reflect changes immediately
      queryClient.invalidateQueries({ queryKey: ['public-portfolio'] });
      if (overrides?.portfolioEnabled !== undefined) {
        setPortfolioEnabled(overrides.portfolioEnabled);
      }
      toast.success('Portfolio saved!');
    } catch (err: unknown) {
      const pgError = err as { code?: string; message?: string };
      if (pgError?.code === '23505') {
        setUsernameAvailable(false);
        toast.error('This username was just taken. Please choose another.');
      } else {
        toast.error('Failed to save portfolio. Your changes might not be published.');
      }
      // Revert local state toggles if it failed to save the override
      if (overrides?.portfolioEnabled !== undefined && profile) {
        setPortfolioEnabled(!!profile.portfolioEnabled);
      }
    } finally {
      setSavingPortfolio(false);
    }
  };

  const handleSaveAndLeave = async () => {
    if (!pendingNavPath) return;
    setIsSavingBeforeLeave(true);
    try {
      await handleSave();
      const path = pendingNavPath;
      setPendingNavPath(null);
      navigate(path);
    } catch {
      setPendingNavPath(null);
    } finally {
      setIsSavingBeforeLeave(false);
    }
  };

  // Display URL
  const portfolioDisplayUrl = username ? `thewise.cloud/p/${username}` : '';
  const actualPortfolioUrl = username ? getPortfolioUrl(username) : '';

  const handleCopyUrl = async () => {
    if (!actualPortfolioUrl) return;
    await navigator.clipboard.writeText(actualPortfolioUrl);
    setCopied(true);
    haptics.light();
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareQR = async () => {
    if (!actualPortfolioUrl) return;
    haptics.light();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile?.fullName || 'My'} Portfolio`, url: actualPortfolioUrl });
      } catch {/* cancelled */}
    } else {
      await navigator.clipboard.writeText(actualPortfolioUrl);
      toast.success('Link copied!');
    }
  };

  const toggleSectionVisibility = (key: keyof PortfolioSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRestoreHistory = async (historyData: Record<string, unknown>) => {
    setIsRestoringHistory(true);
    haptics.light();
    try {
      await updateProfile(historyData as Parameters<typeof updateProfile>[0]);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['public-portfolio'] });

      toast.success('Portfolio restored successfully!');
      setShowHistory(false);
    } catch (err) {
      console.error('Failed to restore portfolio:', err);
      toast.error('Failed to restore portfolio. Please try again.');
    } finally {
      setIsRestoringHistory(false);
    }
  };

  // ── Portfolio Strength ────────────────────────────────────────────────────
  const selectedResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];
  const strengthChecks = [
    { ok: !!profile?.avatarUrl, tip: 'Add a profile photo in Settings → Profile' },
    { ok: bio.length >= 50, tip: 'Write a bio (at least 50 characters)' },
    { ok: username.length >= 3, tip: 'Set a portfolio username' },
    { ok: !!(linkedinUrl || githubUrl || websiteUrl || twitterUrl || contactEmail), tip: 'Add at least one social link or contact email' },
    { ok: availabilityHeadline.length > 0, tip: 'Set an availability headline' },
    { ok: metaTitle.length > 0, tip: 'Add a custom page title for SEO' },
    { ok: metaDescription.length > 0, tip: 'Add a meta description for SEO' },
    { ok: Array.isArray(selectedResume?.experience) && (selectedResume?.experience as unknown[]).length >= 1, tip: 'Add work experience to your resume' },
    { ok: Array.isArray(selectedResume?.skills) && (selectedResume?.skills as unknown[]).length >= 3, tip: 'Add at least 3 skills to your resume' }
  ];

  const strengthScore = Math.round(strengthChecks.filter((c) => c.ok).length / strengthChecks.length * 100);
  const strengthMissing = strengthChecks.filter((c) => !c.ok).slice(0, 3);
  const strengthLabel = strengthScore === 100 ? 'Ready to Publish' : strengthScore < 40 ? 'Needs work' : strengthScore < 70 ? 'Good' : 'Strong';


  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border bg-background/95 backdrop-blur-sm">
        <BackButton onBeforeBack={() => {
          if (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot) {
            handleNavigateAway('/dashboard');
            return true;
          }
          return false;
        }} />
        <h1 className="text-page-title leading-tight flex-1">Portfolio</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-6 bg-[#fbf9f9]/15">
        {/* Status Bar */}
        <StatusBar
          portfolioEnabled={portfolioEnabled}
          portfolioDisplayUrl={portfolioDisplayUrl}
          actualPortfolioUrl={actualPortfolioUrl}
          copied={copied}
          onCopyUrl={handleCopyUrl}
          onOpenQR={() => {haptics.light();setShowQR(true);}}

          strengthScore={strengthScore}
          strengthLabel={strengthLabel}
          strengthMissing={strengthMissing} />
        

        {/* Live Preview Card */}
        <LivePreviewCard
          avatarUrl={profile?.avatarUrl}
          fullName={profile?.fullName}
          jobTitle={profile?.jobTitle}
          portfolioStyle={portfolioStyle}
          accentColor={portfolioAccentColor}
          portfolioFont={portfolioFont}
          bio={bio}
          openToWork={openToWork}
          views={profile?.views || 0} />
        

        {/* Tab Row */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-card border border-border">
          {([
          { id: 'setup', label: 'Setup' },
          { id: 'content', label: 'Content' },
          { id: 'design', label: 'Design' },
          { id: 'more', label: 'More' }] as
          const).map((tab) =>
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] touch-manipulation active:scale-[0.97] ${
            activeTab === tab.id ?
            'bg-card border border-border shadow-soft text-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.2)]' :
            'text-muted-foreground hover:bg-muted/50'}`
            }>
            
              {tab.label}
            </button>
          )}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={reducedMotion ? false : { x: directionRef.current * 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reducedMotion ? undefined : { x: directionRef.current * -20, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: 'easeInOut' }}>
            
            {activeTab === 'setup' &&
            <SetupTab
              username={username}
              onUsernameChange={handleUsernameChange}
              usernameError={usernameError}
              usernameAvailable={usernameAvailable}
              checkingUsername={checkingUsername}
              resumes={resumes}
              selectedResumeId={selectedResumeId}
              onSelectedResumeIdChange={setSelectedResumeId}
              bio={bio}
              onBioChange={setBio}
              onGenerateBio={handleGenerateBio}
              generatingBio={generatingBio}
              sections={sections}
              onToggleSectionVisibility={toggleSectionVisibility}
              openSections={openSections}
              toggleSection={toggleSection}
              openToWork={openToWork}
              onOpenToWorkChange={setOpenToWork}
              availabilityHeadline={availabilityHeadline}
              onAvailabilityHeadlineChange={setAvailabilityHeadline}
              onGenerateAvailability={handleGenerateAvailability}
              generatingAvailability={generatingAvailability} />

            }

            {activeTab === 'content' &&
            <ContentTab
              openSections={openSections}
              toggleSection={toggleSection}
              syncMode={syncMode}
              onSyncModeChange={setSyncMode}
              portfolioSummary={portfolioSummary}
              onPortfolioSummaryChange={setPortfolioSummary}
              bio={bio}
              caseStudies={caseStudies}
              onCaseStudiesChange={setCaseStudies}
              services={services}
              onServicesChange={setServices}
              testimonials={testimonials}
              onTestimonialsChange={setTestimonials}
              highlights={highlights}
              onHighlightsChange={setHighlights} />

            }

            {activeTab === 'design' &&
            <DesignTab
              portfolioStyle={portfolioStyle}
              onPortfolioStyleChange={setPortfolioStyle}
              portfolioAccentColor={portfolioAccentColor}
              onPortfolioAccentColorChange={setPortfolioAccentColor}
              portfolioFont={portfolioFont}
              onPortfolioFontChange={setPortfolioFont}
              portfolioLayout={portfolioLayout}
              onPortfolioLayoutChange={setPortfolioLayout}
              selectedTheme={selectedTheme}
              onSelectedThemeChange={setSelectedTheme}
              userName={profile?.fullName || undefined}
              userAvatarUrl={profile?.avatarUrl || undefined} />

            }

            {activeTab === 'more' &&
            <MoreTab
              onOpenHistory={() => setShowHistory(true)}
              metaTitle={metaTitle}
              onMetaTitleChange={setMetaTitle}
              metaDescription={metaDescription}
              onMetaDescriptionChange={setMetaDescription}
              onGenerateSEO={handleGenerateSEO}
              generatingSEO={generatingSEO}
              seoPlaceholderName={profile?.fullName || 'Name'}
              seoPlaceholderTitle={profile?.jobTitle || 'Job Title'}
              portfolioUsername={profile?.username || undefined}
              userId={user?.id}
              portfolioEnabled={portfolioEnabled}
              views={profile?.views || 0}
              onOpenCareerCard={() => setShowCareerCard(true)}
              hasLivePortfolio={portfolioEnabled && !!username}
              linkedinUrl={linkedinUrl}
              onLinkedinUrlChange={setLinkedinUrl}
              githubUrl={githubUrl}
              onGithubUrlChange={setGithubUrl}
              contactEmail={contactEmail}
              onContactEmailChange={setContactEmail}
              twitterUrl={twitterUrl}
              onTwitterUrlChange={setTwitterUrl}
              websiteUrl={websiteUrl}
              onWebsiteUrlChange={setWebsiteUrl}
              openSections={openSections}
              toggleSection={toggleSection} />

            }
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Save Bar */}
      <SaveBar
        onSave={() => handleSave()}
        saving={savingPortfolio}
        disabled={!!usernameError || usernameAvailable === false || checkingUsername}
        portfolioEnabled={portfolioEnabled}
        onPortfolioEnabledChange={setPortfolioEnabled} />
      

      {/* Sheets */}
      <QRGeneratorSheet
        open={showQR}
        onOpenChange={setShowQR}
        portfolioUrl={actualPortfolioUrl}
        displayUrl={portfolioDisplayUrl}
        onShare={handleShareQR} />
      
      <CareerCardSheet
        open={showCareerCard}
        onOpenChange={setShowCareerCard}
        profile={profile as Parameters<typeof CareerCardSheet>[0]['profile']}
        selectedResume={selectedResume as Parameters<typeof CareerCardSheet>[0]['selectedResume']}
        accentColor={portfolioAccentColor} />

      <PortfolioHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        userId={user?.id}
        onRestore={handleRestoreHistory}
        isRestoring={isRestoringHistory}
      />
      
      <UnsavedChangesDialog
        open={pendingNavPath !== null}
        isSaving={isSavingBeforeLeave}
        onSaveAndLeave={handleSaveAndLeave}
        onDiscard={() => {
          const path = pendingNavPath;
          setPendingNavPath(null);
          if (path) navigate(path);
        }}
        onCancel={() => setPendingNavPath(null)}
      />
    </div>);

}
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CareerCardSheet } from '@/components/portfolio/CareerCardSheet';
import { QRGeneratorSheet } from '@/components/portfolio/qr/QRGeneratorSheet';
import { VisitorsPanel } from '@/components/portfolio/VisitorsPanel';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Copy, Check, Sparkles, Loader2, ExternalLink,
  Eye, QrCode, Plus, Briefcase, Star, Search,
  ArrowRight, AlertTriangle, X, MessageSquareQuote, TrendingUp,
} from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { computeSkillFrequencies } from '@/lib/skillCloud';
import type { Experience, Project } from '@/types/resume';
import { getPortfolioUrl } from '@/lib/portfolioUrl';
import { openExternal } from '@/lib/openExternal';

import { CollapsibleCard } from '@/components/portfolio/editor/shared';
import { ProfileSection } from '@/components/portfolio/editor/ProfileSection';
import { AppearanceSection, type PortfolioStyle, type PortfolioLayout, type PortfolioFont, THEMES } from '@/components/portfolio/editor/AppearanceSection';
import { ContentVisibilitySection, type PortfolioSections, DEFAULT_SECTIONS } from '@/components/portfolio/editor/ContentVisibilitySection';
import { LivePreviewCard } from '@/components/portfolio/editor/LivePreviewCard';

export default function PortfolioEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();

  // Collapsible sections state — all collapsed by default
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Banner dismiss state
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('portfolio_info_dismissed') === '1'
  );

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
  const [syncMode, setSyncMode] = useState<'auto' | 'locked'>('auto');
  const [caseStudies, setCaseStudies] = useState<Array<{id:string;title:string;challenge:string;outcome:string}>>([]);
  const [services, setServices] = useState<Array<{id:string;title:string;description:string;category:string}>>([]);
  const [testimonials, setTestimonials] = useState<Array<{id:string;quote:string;authorName:string;authorTitle:string}>>([]);
  const [highlights, setHighlights] = useState<Array<{id:string;value:string;label:string}>>([]);
  const [showAllSections, setShowAllSections] = useState(false);

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
      setContactEmail(profile.contactEmail || '');
      setSelectedTheme(profile.theme || 'system');
      const p = profile as unknown as Record<string, unknown>;
      setSections((p.portfolioSections as PortfolioSections) || DEFAULT_SECTIONS);
      setMetaTitle((p.portfolioMetaTitle as string) || '');
      setMetaDescription((p.portfolioMetaDescription as string) || '');
      setPortfolioStyle((profile.portfolioStyle || 'minimal') as PortfolioStyle);
      setPortfolioLayout((profile.portfolioLayout || 'single') as PortfolioLayout);
      setPortfolioAccentColor(profile.portfolioAccentColor || '#e84545');
      setPortfolioFont((profile.portfolioFont || 'inter') as PortfolioFont);
      setOpenToWork(profile.openToWork || false);
      setAvailabilityHeadline(profile.availabilityHeadline || '');
      setSyncMode((profile.portfolioSyncMode as 'auto' | 'locked') || 'auto');
      const extras = (profile.portfolioExtras as Record<string, unknown>) || {};
      setCaseStudies((extras.caseStudies as Array<{id:string;title:string;challenge:string;outcome:string}>) || []);
      setServices((extras.services as Array<{id:string;title:string;description:string;category:string}>) || []);
      setTestimonials((extras.testimonials as Array<{id:string;quote:string;authorName:string;authorTitle:string}>) || []);
      setHighlights((extras.highlights as Array<{id:string;value:string;label:string}>) || []);
    }
  }, [profile]);

  // Init selectedResumeId
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const hasData = (r: typeof resumes[0]) => !!(r.summary || (r.experience && (r.experience as unknown[]).length > 0));
      if (profile?.portfolioResumeId && resumes.some(r => r.id === profile.portfolioResumeId)) {
        setSelectedResumeId(profile.portfolioResumeId);
      } else {
        const withData = resumes.find(hasData);
        const primary = resumes.find(r => r.is_primary);
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
          p_user_id: user!.id,
        });
        if (error) throw error;
        setUsernameAvailable(data === true);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => { if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current); };
  }, [username, usernameError, user, profile?.username]);

  // ── Skill Frequency Scores (for hero stats row) ──────────────────
  const _selectedResumeForSkills = resumes.find(r => r.id === selectedResumeId) || resumes[0];
  const skillScores = useMemo(() => {
    const skills = (_selectedResumeForSkills?.skills ?? []) as string[];
    const experience = (_selectedResumeForSkills?.experience ?? []) as Experience[];
    const projects = (_selectedResumeForSkills?.projects ?? []) as Project[];
    if (!skills.length) return {};
    return computeSkillFrequencies(skills, experience, projects);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_selectedResumeForSkills]);

  const sortedSkillScores = useMemo(
    () => Object.entries(skillScores).sort(([, a], [, b]) => b - a),
    [skillScores]
  );

  if (!user) return null;

  const validateUsername = (value: string) => {
    if (!value) { setUsernameError(''); return; }
    if (value.length < 3) { setUsernameError('At least 3 characters'); return; }
    if (value.length > 30) { setUsernameError('Max 30 characters'); return; }
    if (!/^[a-z0-9-]+$/.test(value)) { setUsernameError('Only lowercase letters, numbers, hyphens'); return; }
    if (value.startsWith('-') || value.endsWith('-')) { setUsernameError('Cannot start or end with hyphen'); return; }
    setUsernameError('');
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(clean);
    validateUsername(clean);
  };

  const callPortfolioAI = async (action: string, extraBody?: Record<string, unknown>) => {
    const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-portfolio-bio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        action,
        summary: selectedResume?.summary || '',
        fullName: profile?.fullName || '',
        jobTitle: profile?.jobTitle || '',
        experience: selectedResume?.experience || [],
        skills: selectedResume?.skills || [],
        careerLevel: (profile as unknown as Record<string, unknown>)?.careerLevel || 'mid',
        ...extraBody,
      }),
    });
    if (!res.ok) throw new Error(`AI request failed`);
    return res.json();
  };

  const handleGenerateBio = async () => {
    const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
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
      toast.error((err as Error).message || 'Failed to generate bio');
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
      toast.error((err as Error).message || 'Failed to generate SEO meta');
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
      toast.error((err as Error).message || 'Failed to generate headline');
    } finally {
      setGeneratingAvailability(false);
    }
  };

  const handleSave = async (overrides?: { portfolioEnabled?: boolean }) => {
    const isEnabling = overrides?.portfolioEnabled === true ||
      (overrides?.portfolioEnabled === undefined && portfolioEnabled);
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
          p_user_id: user!.id,
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
        githubUrl: githubUrl || null,
        websiteUrl: websiteUrl || null,
        twitterUrl: twitterUrl || null,
        contactEmail: contactEmail || null,
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
        portfolioExtras: { caseStudies, services, testimonials, highlights },
      };
      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      if (overrides?.portfolioEnabled !== undefined) {
        setPortfolioEnabled(overrides.portfolioEnabled);
      }
      toast.success('Portfolio saved!');
    } catch {
      toast.error('Failed to save portfolio');
    } finally {
      setSavingPortfolio(false);
    }
  };

  // Display URL
  const portfolioDisplayUrl = username ? `WiseResume/${username}` : '';
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
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(actualPortfolioUrl);
      toast.success('Link copied!');
    }
  };

  const toggleSectionVisibility = (key: keyof PortfolioSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Portfolio Strength ────────────────────────────────────────────────────
  const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
  const strengthChecks = [
    { ok: !!profile?.avatarUrl, tip: 'Add a profile photo in Settings → Profile' },
    { ok: bio.length >= 50, tip: 'Write a bio (at least 50 characters)' },
    { ok: username.length >= 3, tip: 'Set a portfolio username' },
    { ok: !!(githubUrl || websiteUrl || twitterUrl || contactEmail), tip: 'Add at least one social link or contact email' },
    { ok: availabilityHeadline.length > 0, tip: 'Set an availability headline' },
    { ok: metaTitle.length > 0, tip: 'Add a custom page title for SEO' },
    { ok: metaDescription.length > 0, tip: 'Add a meta description for SEO' },
    { ok: Array.isArray(selectedResume?.experience) && (selectedResume?.experience as unknown[]).length >= 1, tip: 'Add work experience to your resume' },
    { ok: Array.isArray(selectedResume?.skills) && (selectedResume?.skills as unknown[]).length >= 3, tip: 'Add at least 3 skills to your resume' },
    { ok: portfolioEnabled, tip: 'Publish your portfolio to make it live' },
  ];
  const strengthScore = Math.round((strengthChecks.filter(c => c.ok).length / strengthChecks.length) * 100);
  const strengthMissing = strengthChecks.filter(c => !c.ok).slice(0, 3);
  const strengthLabel = strengthScore < 40 ? 'Needs work' : strengthScore < 70 ? 'Good' : 'Strong';

  const strongSkillCount = sortedSkillScores.filter(([, s]) => s >= 2).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border glass-header backdrop-blur-md">
        <BackButton />
        <div>
          <h1 className="text-page-title leading-tight">My Portfolio Website</h1>
          <p className="text-[10px] text-muted-foreground leading-none">Share a beautiful profile link with the world</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 pb-24">

        {/* ══════════════════════════════════════════════════════════════
            1. HERO CARD — Portfolio Overview + inline strength tips
           ══════════════════════════════════════════════════════════════ */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Portfolio Overview</h3>
            <Badge variant={portfolioEnabled ? 'default' : 'secondary'} className="text-xs">
              {portfolioEnabled ? '🟢 Live' : 'Draft'}
            </Badge>
          </div>

          {/* URL row */}
          {username && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-foreground truncate flex-1 font-mono">{portfolioDisplayUrl}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyUrl} title="Copy link">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { haptics.light(); setShowQR(true); }} title="QR Code">
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Compact stats row */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span className="font-semibold text-foreground">{profile?.views || 0}</span> views
            </span>
            <span className="text-border">·</span>
            <span className={`font-semibold ${strengthScore < 40 ? 'text-destructive' : strengthScore < 70 ? 'text-yellow-500' : 'text-green-500'}`}>
              {strengthScore}% · {strengthLabel}
            </span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">
              <span className="text-emerald-400 font-medium">{strongSkillCount}</span> skills
            </span>
          </div>

          {/* Inline strength tips */}
          {strengthMissing.length > 0 && (
            <div className="space-y-0.5 pt-1">
              {strengthMissing.map((m, i) => {
                const handleTipTap = () => {
                  haptics.light();
                  const tip = m.tip.toLowerCase();
                  if (tip.includes('bio') || tip.includes('social link') || tip.includes('contact email') || tip.includes('availability') || tip.includes('username')) {
                    setOpenSections(prev => new Set(prev).add('profile'));
                    setTimeout(() => document.getElementById('section-profile')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
                  } else if (tip.includes('page title') || tip.includes('meta description')) {
                    setShowAllSections(true);
                    setOpenSections(prev => new Set(prev).add('seo'));
                    setTimeout(() => document.getElementById('section-seo')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
                  } else {
                    navigate('/editor');
                  }
                };
                return (
                  <button key={i} onClick={handleTipTap} className="w-full flex items-center gap-1.5 text-xs text-muted-foreground py-1 rounded-lg hover:bg-muted/30 active:scale-[0.98] transition-all touch-manipulation text-left px-1">
                    <span className="text-primary shrink-0">·</span>
                    <span className="flex-1">{m.tip}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Publish toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium text-foreground">Make portfolio public</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Anyone with your link can view your portfolio website.</p>
            </div>
            <Switch checked={portfolioEnabled} onCheckedChange={setPortfolioEnabled} />
          </div>

          {/* Save */}
          <Button
            onClick={() => handleSave()}
            disabled={savingPortfolio || !!usernameError || usernameAvailable === false || checkingUsername}
            className="w-full h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation"
          >
            {savingPortfolio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Portfolio
          </Button>

          {portfolioEnabled && (
            <Button
              variant="outline"
              className="w-full h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => handleSave({ portfolioEnabled: false })}
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Unpublish Portfolio
            </Button>
          )}

          {/* Quick actions (only when live) */}
          {portfolioEnabled && username && (
            <div className="pt-1">
              <Button variant="outline" className="w-full h-10 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-xs" onClick={() => { haptics.light(); setShowCareerCard(true); }}>
                <Sparkles className="w-4 h-4 mr-1.5" /> Career Card
              </Button>
            </div>
          )}

          {/* Live Preview Mini-Card */}
          <LivePreviewCard
            avatarUrl={profile?.avatarUrl}
            fullName={profile?.fullName}
            jobTitle={profile?.jobTitle}
            portfolioStyle={portfolioStyle}
            accentColor={portfolioAccentColor}
            portfolioFont={portfolioFont}
          />
        </div>

        {/* QR Code Studio */}
        <QRGeneratorSheet
          open={showQR}
          onOpenChange={setShowQR}
          portfolioUrl={actualPortfolioUrl}
          displayUrl={portfolioDisplayUrl}
          onShare={handleShareQR}
        />

        {/* ══════════════════════════════════════════════════════════════
            2. PROFILE — Username, Resume, Bio, Social, Availability
           ══════════════════════════════════════════════════════════════ */}
        <ProfileSection
          openSections={openSections}
          toggleSection={toggleSection}
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
          githubUrl={githubUrl}
          onGithubUrlChange={setGithubUrl}
          websiteUrl={websiteUrl}
          onWebsiteUrlChange={setWebsiteUrl}
          twitterUrl={twitterUrl}
          onTwitterUrlChange={setTwitterUrl}
          contactEmail={contactEmail}
          onContactEmailChange={setContactEmail}
          openToWork={openToWork}
          onOpenToWorkChange={setOpenToWork}
          availabilityHeadline={availabilityHeadline}
          onAvailabilityHeadlineChange={setAvailabilityHeadline}
          onGenerateAvailability={handleGenerateAvailability}
          generatingAvailability={generatingAvailability}
          currentUsername={profile?.username || null}
        />

        {/* ══════════════════════════════════════════════════════════════
            3. APPEARANCE — Theme, Accent, Font, Layout, Color Mode
           ══════════════════════════════════════════════════════════════ */}
        <AppearanceSection
          openSections={openSections}
          toggleSection={toggleSection}
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
        />

        {/* ══════════════════════════════════════════════════════════════
            4. CONTENT & VISIBILITY — Sections + Sync Mode
           ══════════════════════════════════════════════════════════════ */}
        <ContentVisibilitySection
          openSections={openSections}
          toggleSection={toggleSection}
          sections={sections}
          onToggleSectionVisibility={toggleSectionVisibility}
          syncMode={syncMode}
          onSyncModeChange={setSyncMode}
        />

        {/* ══════════════════════════════════════════════════════════════
            5. VISITORS & ANALYTICS — unchanged
           ══════════════════════════════════════════════════════════════ */}
        <CollapsibleCard
          id="visitors"
          icon={<Eye className="w-4 h-4" />}
          title="Visitors & Analytics"
          hint={profile?.views != null ? <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{profile.views} views</Badge> : undefined}
          openSections={openSections}
          toggleSection={toggleSection}
        >
          <VisitorsPanel
            username={profile?.username || undefined}
            userId={user?.id}
            portfolioEnabled={portfolioEnabled}
          />
        </CollapsibleCard>

        {/* ══════════════════════════════════════════════════════════════
            CONDITIONAL SECTIONS — behind "Add more sections"
           ══════════════════════════════════════════════════════════════ */}

        {/* ── Case Studies ──────────────────────────────────────────── */}
        {(showAllSections || caseStudies.length > 0) && (
          <CollapsibleCard
            id="casestudies"
            icon={<Briefcase className="w-4 h-4" />}
            title="Case Studies"
            hint={caseStudies.length > 0 ? <span>{caseStudies.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-xs text-muted-foreground mb-3">Showcase detailed project stories with challenge, approach, and outcome.</p>
            <div className="space-y-3">
              {caseStudies.map((cs, i) => (
                <div key={cs.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Case Study {i + 1}</span>
                    <button onClick={() => setCaseStudies(prev => prev.filter(c => c.id !== cs.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Input placeholder="Title (e.g. Redesigned onboarding flow)" value={cs.title} onChange={e => setCaseStudies(prev => prev.map(c => c.id === cs.id ? {...c, title: e.target.value} : c))} />
                  <Textarea placeholder="Challenge — What problem were you solving?" value={cs.challenge} onChange={e => setCaseStudies(prev => prev.map(c => c.id === cs.id ? {...c, challenge: e.target.value} : c))} className="min-h-[60px] text-sm" />
                  <Textarea placeholder="Outcome — What was the measurable result?" value={cs.outcome} onChange={e => setCaseStudies(prev => prev.map(c => c.id === cs.id ? {...c, outcome: e.target.value} : c))} className="min-h-[60px] text-sm" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCaseStudies(prev => [...prev, {id: crypto.randomUUID(), title:'', challenge:'', outcome:''}])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" /> Add Case Study
              </Button>
            </div>
          </CollapsibleCard>
        )}

        {/* ── Services ──────────────────────────────────────────────── */}
        {(showAllSections || services.length > 0) && (
          <CollapsibleCard
            id="services"
            icon={<Star className="w-4 h-4" />}
            title="Services & Offerings"
            hint={services.length > 0 ? <span>{services.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-xs text-muted-foreground mb-3">List what you offer as a freelancer, consultant, or professional.</p>
            <div className="space-y-3">
              {services.map((svc, i) => (
                <div key={svc.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service {i + 1}</span>
                    <button onClick={() => setServices(prev => prev.filter(s => s.id !== svc.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Input placeholder="Service title (e.g. UX Audit)" value={svc.title} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? {...s, title: e.target.value} : s))} />
                  <Textarea placeholder="Brief description of what's included..." value={svc.description} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? {...s, description: e.target.value} : s))} className="min-h-[60px] text-sm" />
                  <select value={svc.category} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? {...s, category: e.target.value} : s))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="consulting">Consulting</option>
                    <option value="writing">Writing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setServices(prev => [...prev, {id: crypto.randomUUID(), title:'', description:'', category:'development'}])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" /> Add Service
              </Button>
            </div>
          </CollapsibleCard>
        )}

        {/* ── Testimonials ──────────────────────────────────────────── */}
        {(showAllSections || testimonials.length > 0) && (
          <CollapsibleCard
            id="testimonials"
            icon={<MessageSquareQuote className="w-4 h-4" />}
            title="Testimonials"
            hint={testimonials.length > 0 ? <span>{testimonials.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-xs text-muted-foreground mb-3">Add quotes from colleagues or clients (max 3).</p>
            <div className="space-y-3">
              {testimonials.map((t, i) => (
                <div key={t.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Testimonial {i + 1}</span>
                    <button onClick={() => setTestimonials(prev => prev.filter(x => x.id !== t.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Textarea placeholder="What they said about you..." value={t.quote} onChange={e => setTestimonials(prev => prev.map(x => x.id === t.id ? {...x, quote: e.target.value} : x))} className="min-h-[60px] text-sm" maxLength={300} />
                  <Input placeholder="Author name" value={t.authorName} onChange={e => setTestimonials(prev => prev.map(x => x.id === t.id ? {...x, authorName: e.target.value} : x))} />
                  <Input placeholder="Author title (e.g. CEO at Acme)" value={t.authorTitle} onChange={e => setTestimonials(prev => prev.map(x => x.id === t.id ? {...x, authorTitle: e.target.value} : x))} />
                </div>
              ))}
              {testimonials.length < 3 && (
                <Button variant="outline" size="sm" onClick={() => setTestimonials(prev => [...prev, {id: crypto.randomUUID(), quote:'', authorName:'', authorTitle:''}])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                  <Plus className="w-4 h-4 mr-2" /> Add Testimonial
                </Button>
              )}
            </div>
          </CollapsibleCard>
        )}

        {/* ── Highlight Metrics ──────────────────────────────────────── */}
        {(showAllSections || highlights.length > 0) && (
          <CollapsibleCard
            id="highlights"
            icon={<TrendingUp className="w-4 h-4" />}
            title="Highlight Metrics"
            hint={highlights.length > 0 ? <span>{highlights.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-xs text-muted-foreground mb-3">Showcase key numbers (e.g. "50+ projects", "10 years"). Max 3.</p>
            <div className="space-y-3">
              {highlights.map((h, i) => (
                <div key={h.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metric {i + 1}</span>
                    <button onClick={() => setHighlights(prev => prev.filter(x => x.id !== h.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Input placeholder="Value (e.g. 50+)" value={h.value} onChange={e => setHighlights(prev => prev.map(x => x.id === h.id ? {...x, value: e.target.value} : x))} maxLength={10} />
                  <Input placeholder="Label (e.g. Projects Delivered)" value={h.label} onChange={e => setHighlights(prev => prev.map(x => x.id === h.id ? {...x, label: e.target.value} : x))} maxLength={30} />
                </div>
              ))}
              {highlights.length < 3 && (
                <Button variant="outline" size="sm" onClick={() => setHighlights(prev => [...prev, {id: crypto.randomUUID(), value:'', label:''}])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                  <Plus className="w-4 h-4 mr-2" /> Add Metric
                </Button>
              )}
            </div>
          </CollapsibleCard>
        )}

        {(showAllSections || metaTitle || metaDescription) && (
          <CollapsibleCard
            id="seo"
            icon={<Search className="w-4 h-4" />}
            title="SEO & Sharing"
            hint={metaTitle ? <span className="truncate max-w-[120px]">{metaTitle}</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Customize how your portfolio appears on Google & social media.</p>
              <Button variant="ghost" size="sm" onClick={handleGenerateSEO} disabled={generatingSEO} className="h-7 text-xs px-2 active:scale-95 shrink-0 ml-2">
                {generatingSEO ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                AI Generate
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Custom Page Title</label>
              <Input placeholder={`${profile?.fullName || 'Name'} — ${profile?.jobTitle || 'Job Title'}`} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={60} />
              <p className="text-xs text-muted-foreground text-right">{metaTitle.length}/60</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Custom Meta Description</label>
              <Textarea placeholder="Defaults to your bio..." value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="min-h-[60px]" maxLength={160} />
              <p className="text-xs text-muted-foreground text-right">{metaDescription.length}/160</p>
            </div>
          </CollapsibleCard>
        )}

        {/* ── "Add more sections" toggle ─────────────────────────────── */}
        {!showAllSections && (
          <Button
            variant="outline"
            className="w-full h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-sm"
            onClick={() => { haptics.light(); setShowAllSections(true); }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add more sections
          </Button>
        )}

      </div>

      {/* ── Floating "View Live" pill ──────────────────────────────── */}
      <FloatingViewLivePill
        onViewLive={actualPortfolioUrl ? () => openExternal(actualPortfolioUrl) : undefined}
        hasLiveUrl={!!actualPortfolioUrl && portfolioEnabled}
      />

      <CareerCardSheet
        open={showCareerCard}
        onOpenChange={setShowCareerCard}
        profile={profile as Parameters<typeof CareerCardSheet>[0]['profile']}
        selectedResume={selectedResume as Parameters<typeof CareerCardSheet>[0]['selectedResume']}
        accentColor={portfolioAccentColor}
      />
    </div>
  );
}

// ─── Floating View Live Pill ─────────────────────────────────────────────────
function FloatingViewLivePill({ onViewLive, hasLiveUrl }: { onViewLive?: () => void; hasLiveUrl: boolean }) {
  const prefersReduced = useReducedMotion();
  if (!hasLiveUrl || !onViewLive) return null;
  return (
    <motion.div
      className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 flex items-center justify-center max-w-sm mx-auto"
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.5 }}
    >
      <button
        onClick={onViewLive}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full glass-elevated border border-primary/30 shadow-lg touch-manipulation active:scale-95 transition-transform min-h-[44px]"
      >
        <ExternalLink className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">View Live</span>
      </button>
    </motion.div>
  );
}

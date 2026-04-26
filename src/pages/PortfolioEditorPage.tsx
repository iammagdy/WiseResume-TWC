import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CareerCardSheet } from '@/components/portfolio/CareerCardSheet';
import { QRGeneratorSheet } from '@/components/portfolio/qr/QRGeneratorSheet';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { useProfile } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getUserId } from '@/lib/supabaseBridge';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { PortfolioEditorSkeleton } from '@/components/layout/PageSkeletons';

import { useNavigate } from 'react-router-dom';
import { QrCode, ExternalLink } from 'lucide-react';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { UsernameRequestDialog } from '@/components/settings/UsernameRequestDialog';
import { usePortfolioUsernameRules } from '@/hooks/usePortfolioUsernameRules';
import { getPortfolioUrl, getPortfolioDisplayUrl } from '@/lib/portfolioUrl';
import { getToken } from '@/lib/supabaseBridge';
import { openExternal } from '@/lib/openExternal';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { normalizeUrl } from '@/lib/urlUtils';

import type { PortfolioStyle, PortfolioLayout, PortfolioFont } from '@/components/portfolio/editor/AppearanceSection';
import { type PortfolioSections, DEFAULT_SECTIONS } from '@/components/portfolio/editor/ContentVisibilitySection';
import { LivePreviewCard } from '@/components/portfolio/editor/LivePreviewCard';
import { StatusBar } from '@/components/portfolio/editor/StatusBar';
import { SetupTab, type PremiumHandle } from '@/components/portfolio/editor/SetupTab';
import { ContentTab } from '@/components/portfolio/editor/ContentTab';
import { DesignTab } from '@/components/portfolio/editor/DesignTab';
import { MoreTab } from '@/components/portfolio/editor/MoreTab';
import { SaveBar } from '@/components/portfolio/editor/SaveBar';
import { PortfolioHistorySheet } from '@/components/portfolio/PortfolioHistorySheet';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { VisitorsTab } from '@/components/portfolio/editor/VisitorsTab';
import type { ScrollEffect } from '@/components/portfolio/editor/ScrollEffectPicker';
import { AICritiqueSheet, type CritiqueItem } from '@/components/portfolio/editor/AICritiqueSheet';
import { CompletionScoreBar, buildCompletionItems } from '@/components/portfolio/editor/CompletionScoreBar';
import { Monitor, Smartphone } from 'lucide-react';


async function sha256hex(message: string): Promise<string> {
  const msgBuf = new TextEncoder().encode(message);
  const hashBuf = await crypto.subtle.digest('SHA-256', msgBuf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PortfolioEditorPage() {
  const { user } = useAuth();
  const { isPro, isPremium } = usePlan();
  const isPaidUser = isPro || isPremium;
  const { profile, loading, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const usernameRules = usePortfolioUsernameRules(user?.id);
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
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<{ status: string; reason?: string } | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [premiumHandles, setPremiumHandles] = useState<PremiumHandle[]>([]);
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
  const [availabilityStatus, setAvailabilityStatus] = useState<'actively-looking' | 'open-to-offers' | 'not-looking'>('not-looking');
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
  const [sectionOrder, setSectionOrder] = useState<string[]>(['about', 'experience', 'caseStudies', 'projects', 'githubProjects', 'services', 'testimonials', 'skills', 'education', 'certifications', 'awards', 'publications', 'volunteering']);
  const [pinnedProject, setPinnedProject] = useState<{title: string; description: string; url: string} | null>(null);
  const [scrollEffect, setScrollEffect] = useState<ScrollEffect>('fade');
  const [videoIntroUrl, setVideoIntroUrl] = useState('');
  const [schedulingUrl, setSchedulingUrl] = useState('');
  const [abChallengerTheme, setAbChallengerTheme] = useState<string>('');
  const [portfolioCertifications, setPortfolioCertifications] = useState<Array<{id: string; name: string; issuer: string; date: string; credentialUrl: string; badgeUrl: string}>>([]);
  const [portfolioPrimaryLanguage, setPortfolioPrimaryLanguage] = useState('English');
  const [portfolioSecondaryLanguage, setPortfolioSecondaryLanguage] = useState('');
  const [portfolioTranslations, setPortfolioTranslations] = useState<Record<string, {
    bio?: string;
    portfolioSummary?: string;
    pinnedProjectDescription?: string;
    highlights?: Array<{ id: string; value: string; label: string }>;
    services?: Array<{ id: string; title: string; description?: string }>;
    testimonials?: Array<{ id: string; quote: string }>;
    caseStudies?: Array<{ id: string; title: string; challenge: string; outcome: string }>;
    portfolioCertifications?: Array<{ id: string; name: string; issuer: string }>;
  }>>({});
  const [translating, setTranslating] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'content' | 'design' | 'more' | 'visitors'>('setup');
  const [showCritique, setShowCritique] = useState(false);
  const [generatingCritique, setGeneratingCritique] = useState(false);
  const [critiqueItems, setCritiqueItems] = useState<CritiqueItem[]>([]);
  const [critiqueHasRun, setCritiqueHasRun] = useState(false);
  const [critiqueError, setCritiqueError] = useState(false);

  // Password protection
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [portfolioPassword, setPortfolioPassword] = useState('');
  const [passwordHash, setPasswordHash] = useState('');

  // Custom domain
  const [customDomain, setCustomDomain] = useState('');
  const [contactFormEnabled, setContactFormEnabled] = useState(true);

  // Mobile preview toggle (local UI state only — not persisted)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

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
      portfolioFont, availabilityStatus, availabilityHeadline, syncMode,
      caseStudies, services, testimonials, highlights, portfolioSummary,
      selectedResumeId, sectionOrder, pinnedProject, scrollEffect,
      videoIntroUrl, schedulingUrl, abChallengerTheme, portfolioCertifications, portfolioPrimaryLanguage, portfolioSecondaryLanguage,
      passwordEnabled, passwordHash, customDomain, contactFormEnabled,
    });
  }, [
    username, bio, portfolioEnabled, githubUrl, websiteUrl, twitterUrl,
    linkedinUrl, contactEmail, selectedTheme, sections, metaTitle,
    metaDescription, portfolioStyle, portfolioLayout, portfolioAccentColor,
    portfolioFont, availabilityStatus, availabilityHeadline, syncMode,
    caseStudies, services, testimonials, highlights, portfolioSummary,
    selectedResumeId, sectionOrder, pinnedProject, scrollEffect,
    videoIntroUrl, schedulingUrl, abChallengerTheme, portfolioCertifications, portfolioPrimaryLanguage, portfolioSecondaryLanguage,
    passwordEnabled, passwordHash, customDomain, contactFormEnabled,
  ]);

  const tabIndexMap = { setup: 0, content: 1, design: 2, more: 3, visitors: 4 } as const;
  const directionRef = useRef(0);
  const prevTabRef = useRef(activeTab);
  const reducedMotion = useMemo(() => getSafeMatchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const handleTabChange = useCallback((tab: 'setup' | 'content' | 'design' | 'more' | 'visitors') => {
    directionRef.current = tabIndexMap[tab] > tabIndexMap[prevTabRef.current] ? 1 : -1;
    prevTabRef.current = tab;
    haptics.light();
    setActiveTab(tab);
    requestAnimationFrame(() => {
      const tabEl = document.getElementById(`portfolio-tab-${tab}`);
      tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
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
      setAvailabilityStatus((profile.portfolioExtras?.availabilityStatus as 'actively-looking' | 'open-to-offers' | 'not-looking') || (profile.openToWork ? 'actively-looking' : 'not-looking'));
      setAvailabilityHeadline(profile.availabilityHeadline || '');
      setSyncMode(profile.portfolioSyncMode as 'auto' | 'locked' || 'auto');
      const extras = profile.portfolioExtras || {};
      setCaseStudies(extras.caseStudies as Array<{id: string;title: string;challenge: string;outcome: string;}> || []);
      setServices(extras.services as Array<{id: string;title: string;description: string;category: string;}> || []);
      setTestimonials(extras.testimonials as Array<{id: string;quote: string;authorName: string;authorTitle: string;}> || []);
      setHighlights(extras.highlights as Array<{id: string;value: string;label: string;}> || []);
      setPortfolioSummary(extras.portfolioSummary as string || '');
      setSectionOrder(extras.sectionOrder as string[] || ['about', 'experience', 'caseStudies', 'projects', 'githubProjects', 'services', 'testimonials', 'skills', 'education', 'certifications', 'awards', 'publications', 'volunteering']);
      setPinnedProject(extras.pinnedProject as {title: string; description: string; url: string} | null || null);
      setScrollEffect((extras.scrollEffect as ScrollEffect) || 'fade');
      setVideoIntroUrl(extras.videoIntroUrl as string || '');
      setSchedulingUrl(extras.schedulingUrl as string || '');
      setAbChallengerTheme(extras.abChallengerTheme as string || '');
      setPortfolioCertifications(extras.portfolioCertifications as Array<{id: string; name: string; issuer: string; date: string; credentialUrl: string; badgeUrl: string}> || []);
      setPortfolioPrimaryLanguage(extras.portfolioPrimaryLanguage as string || 'English');
      setPortfolioSecondaryLanguage(extras.portfolioSecondaryLanguage as string || '');
      setPortfolioTranslations(extras.portfolioTranslations as Record<string, { bio?: string; portfolioSummary?: string; pinnedProjectDescription?: string; highlights?: Array<{ id: string; value: string; label: string }>; services?: Array<{ id: string; title: string; description?: string }>; testimonials?: Array<{ id: string; quote: string }> }> || {});
      setPasswordEnabled((extras.passwordEnabled as boolean) || false);
      setPasswordHash((extras.passwordHash as string) || '');
      setCustomDomain((extras.customDomain as string) || '');
      setContactFormEnabled(typeof extras.contactFormEnabled === 'boolean' ? extras.contactFormEnabled : true);

      // If a persisted draft exists, overlay it on top of the live-column values.
      // The draft uses the same key names as getCurrentSnapshot().
      const d = profile.portfolioDraft;
      if (d) {
        if ('username' in d) setUsername(String(d.username ?? ''));
        if ('bio' in d) setBio(String(d.bio ?? ''));
        if ('portfolioEnabled' in d) setPortfolioEnabled(Boolean(d.portfolioEnabled));
        if ('githubUrl' in d) setGithubUrl(String(d.githubUrl ?? ''));
        if ('websiteUrl' in d) setWebsiteUrl(String(d.websiteUrl ?? ''));
        if ('twitterUrl' in d) setTwitterUrl(String(d.twitterUrl ?? ''));
        if ('linkedinUrl' in d) setLinkedinUrl(String(d.linkedinUrl ?? ''));
        if ('contactEmail' in d) setContactEmail(String(d.contactEmail ?? ''));
        if ('selectedTheme' in d) setSelectedTheme(String(d.selectedTheme ?? 'system'));
        if ('sections' in d) setSections(d.sections as PortfolioSections);
        if ('metaTitle' in d) setMetaTitle(String(d.metaTitle ?? ''));
        if ('metaDescription' in d) setMetaDescription(String(d.metaDescription ?? ''));
        if ('portfolioStyle' in d) setPortfolioStyle(d.portfolioStyle as PortfolioStyle);
        if ('portfolioLayout' in d) setPortfolioLayout(d.portfolioLayout as PortfolioLayout);
        if ('portfolioAccentColor' in d) setPortfolioAccentColor(String(d.portfolioAccentColor ?? '#e84545'));
        if ('portfolioFont' in d) setPortfolioFont(d.portfolioFont as PortfolioFont);
        if ('availabilityStatus' in d) setAvailabilityStatus(d.availabilityStatus as 'actively-looking' | 'open-to-offers' | 'not-looking');
        if ('availabilityHeadline' in d) setAvailabilityHeadline(String(d.availabilityHeadline ?? ''));
        if ('syncMode' in d) setSyncMode(d.syncMode as 'auto' | 'locked');
        if ('caseStudies' in d) setCaseStudies(d.caseStudies as typeof caseStudies);
        if ('services' in d) setServices(d.services as typeof services);
        if ('testimonials' in d) setTestimonials(d.testimonials as typeof testimonials);
        if ('highlights' in d) setHighlights(d.highlights as typeof highlights);
        if ('portfolioSummary' in d) setPortfolioSummary(String(d.portfolioSummary ?? ''));
        if ('selectedResumeId' in d) setSelectedResumeId(String(d.selectedResumeId ?? ''));
        if ('sectionOrder' in d) setSectionOrder(d.sectionOrder as string[]);
        if ('pinnedProject' in d) setPinnedProject(d.pinnedProject as typeof pinnedProject);
        if ('scrollEffect' in d) setScrollEffect(d.scrollEffect as ScrollEffect);
        if ('videoIntroUrl' in d) setVideoIntroUrl(String(d.videoIntroUrl ?? ''));
        if ('schedulingUrl' in d) setSchedulingUrl(String(d.schedulingUrl ?? ''));
        if ('abChallengerTheme' in d) setAbChallengerTheme(String(d.abChallengerTheme ?? ''));
        if ('portfolioCertifications' in d) setPortfolioCertifications(d.portfolioCertifications as typeof portfolioCertifications);
        if ('portfolioPrimaryLanguage' in d) setPortfolioPrimaryLanguage(String(d.portfolioPrimaryLanguage ?? 'English'));
        if ('portfolioSecondaryLanguage' in d) setPortfolioSecondaryLanguage(String(d.portfolioSecondaryLanguage ?? ''));
        if ('passwordEnabled' in d) setPasswordEnabled(Boolean(d.passwordEnabled));
        if ('passwordHash' in d) setPasswordHash(String(d.passwordHash ?? ''));
        if ('customDomain' in d) setCustomDomain(String(d.customDomain ?? ''));
        if ('contactFormEnabled' in d) setContactFormEnabled(Boolean(d.contactFormEnabled));
      }
    }
  }, [profile]);

  // Fetch available premium handles for the user-facing upgrade card
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('portfolio_premium_usernames')
      .select('username, price_cents, currency')
      .eq('status', 'available')
      .order('price_cents', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setPremiumHandles((data ?? []) as PremiumHandle[]);
      });
    return () => { cancelled = true; };
  }, []);

  // Track premium handle interest — fire once per session when available
  // handles are shown to a logged-in user. Fire-and-forget; never surfaces
  // errors to the user.
  useEffect(() => {
    if (!premiumHandles || premiumHandles.length === 0) return;
    const DEDUP_KEY = 'handle-interest-tracked';
    if (sessionStorage.getItem(DEDUP_KEY)) return;
    sessionStorage.setItem(DEDUP_KEY, '1');
    const token = getToken();
    if (!token) return;
    fetch('/api/track-handle-interest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }).catch(() => { /* fire-and-forget — ignore errors */ });
  }, [premiumHandles]);

  // Capture snapshot after profile syncs to local state
  useEffect(() => {
    if (profile && !lastSavedSnapshot) {
      // Delay by 1 tick so all setState calls from the profile sync effect have flushed
      const id = requestAnimationFrame(() => setLastSavedSnapshot(getCurrentSnapshot()));
      return () => cancelAnimationFrame(id);
    }
  }, [profile, lastSavedSnapshot, getCurrentSnapshot]);

  // Tracks the last snapshot that was successfully auto-persisted to draft.
  // Separate from lastSavedSnapshot (which is advanced only on explicit Publish).
  const lastDraftPersistedSnapshotRef = useRef<string>('');

  // Debounced autosave to portfolio_draft — persists working copy to DB so
  // drafts survive page closes.
  // IMPORTANT: writes directly to Supabase (bypassing the mutation that would
  // call queryClient.invalidateQueries) so the profile refetch → state sync
  // effect is NOT triggered and can never roll back the user's active edits.
  // The React Query cache is updated minimally (portfolioDraft only).
  // lastDraftPersistedSnapshotRef deduplicates repeated autosave writes for
  // the same snapshot content.
  useEffect(() => {
    if (!lastSavedSnapshot) return;
    const snapshot = getCurrentSnapshot();
    if (snapshot === lastSavedSnapshot) return;
    if (snapshot === lastDraftPersistedSnapshotRef.current) return;
    const timer = setTimeout(async () => {
      try {
        const supabaseUserId = getUserId();
        if (!supabaseUserId) return;
        const currentSnapshot = getCurrentSnapshot();
        // Re-check dedup inside the async callback (snapshot may have changed)
        if (currentSnapshot === lastDraftPersistedSnapshotRef.current) return;
        const parsed = JSON.parse(currentSnapshot) as Record<string, unknown>;
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('profiles')
          .update({ portfolio_draft: parsed, portfolio_draft_saved_at: now })
          .eq('user_id', supabaseUserId);
        if (!error) {
          lastDraftPersistedSnapshotRef.current = currentSnapshot;
          // Update cache in place — no invalidation, no refetch, no state clobber
          queryClient.setQueriesData<Profile | null>({ queryKey: ['profile'] }, (old) =>
            old ? { ...old, portfolioDraft: parsed, portfolioDraftSavedAt: now } : old
          );
        }
      } catch {
        // Silent — draft autosave is best-effort
      }
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCurrentSnapshot, lastSavedSnapshot]);

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
    if (!username || username.length < usernameRules.min_length || usernameError) {
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
        const status = (data as { status?: string } | null)?.status ?? 'invalid';
        setUsernameAvailable(status === 'available');
        setUsernameCheckStatus({
          status,
          reason: (data as { reason?: string } | null)?.reason,
        });
      } catch {
        setUsernameAvailable(null);
        toast.error('Failed to check username availability. Please try again.');
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => {if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);};
  }, [username, usernameError, user, profile?.username]);



  if (loading) return <PortfolioEditorSkeleton />;
  if (!user) return <PortfolioEditorSkeleton />;
  if (!profile) return <PortfolioEditorSkeleton />;

  const validateUsername = (value: string) => {
    if (!value) {setUsernameError('');return;}
    if (value.length < usernameRules.min_length) {setUsernameError(`At least ${usernameRules.min_length} characters`);return;}
    if (value.length > usernameRules.max_length) {setUsernameError(`Max ${usernameRules.max_length} characters`);return;}
    const charsOk = usernameRules.allow_hyphens
      ? /^[a-z0-9-]+$/.test(value)
      : /^[a-z0-9]+$/.test(value);
    if (!charsOk) {
      setUsernameError(
        usernameRules.allow_hyphens
          ? 'Only lowercase letters, numbers, hyphens'
          : 'Only lowercase letters and numbers',
      );
      return;
    }
    if (usernameRules.allow_hyphens && (value.startsWith('-') || value.endsWith('-'))) {
      setUsernameError('Cannot start or end with hyphen');
      return;
    }
    setUsernameError('');
  };

  const handleUsernameChange = (val: string) => {
    const cleanRegex = usernameRules.allow_hyphens ? /[^a-z0-9-]/g : /[^a-z0-9]/g;
    const clean = val.toLowerCase().replace(cleanRegex, '');
    setUsername(clean);
    validateUsername(clean);
  };

  const callPortfolioAI = async (action: string, resumeIdOverride?: string, extraBody?: Record<string, unknown>) => {
    // Priority: 1. Explicit override (captured at call time), 2. State selectedResumeId, 3. Profile linked resume, 4. Primary resume, 5. Any resume
    const linkedResumeId = profile?.portfolioResumeId;
    const primaryResumeId = resumes.find(r => r.is_primary)?.id;
    const targetId = resumeIdOverride || selectedResumeId || linkedResumeId || primaryResumeId || resumes[0]?.id;
    
    const selectedResume = resumes.find((r) => r.id === targetId);

    if (!selectedResume && action === 'bio') {
      throw new Error("Resume data not available yet. Please wait a moment.");
    }

    const { data, error } = await edgeFunctions.functions.invoke('generate-portfolio-bio', {
      body: {
        action,
        summary: selectedResume?.summary || '',
        fullName: profile?.fullName || '',
        jobTitle: profile?.jobTitle || '',
        experience: selectedResume?.experience || [],
        skills: selectedResume?.skills || [],
        careerLevel: profile?.careerLevel || 'mid',
        ...extraBody
      },
    });
    if (error) throw new Error(error.message || 'AI request failed');
    if (data?.error) throw new Error(data.error || 'AI request failed');
    return data;
  };

  const handleGenerateBio = async () => {
    // Capture the resume ID at the moment the button is clicked to avoid stale closures
    const currentResumeId = selectedResumeId;
    const currentResume = resumes.find((r) => r.id === currentResumeId) || resumes[0];
    if (!currentResume?.summary && !profile?.jobTitle && (!currentResume?.experience || (currentResume.experience as unknown[]).length === 0)) {
      toast.error('Selected resume has no data for bio generation.');
      return;
    }
    setGeneratingBio(true);
    haptics.light();
    try {
      const { bio: generatedBio } = await callPortfolioAI('bio', currentResumeId);
      setBio(generatedBio);
      toast.success('Bio generated!');
    } catch {
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
    } catch {
      toast.error('Failed to generate SEO meta. Please try again later.');
    } finally {
      setGeneratingSEO(false);
    }
  };

  const runTranslation = async (targetLanguage: string, silent = false) => {
    if (!targetLanguage) return null;
    if (!silent) setTranslating(true);
    try {
      const { data, error } = await edgeFunctions.functions.invoke('generate-portfolio-bio', {
        body: {
          action: 'translate',
          targetLanguage,
          bio,
          portfolioSummary,
          highlights: highlights.length > 0 ? highlights : undefined,
          services: services.length > 0 ? services.map((s: { id: string; title: string; description?: string }) => ({ id: s.id, title: s.title, description: s.description })) : undefined,
          testimonials: testimonials.length > 0 ? testimonials.map((t: { id: string; quote: string }) => ({ id: t.id, quote: t.quote })) : undefined,
          pinnedProjectDescription: pinnedProject?.description || undefined,
          caseStudies: caseStudies.length > 0 ? caseStudies.map((cs: { id: string; title: string; challenge: string; outcome: string }) => ({ id: cs.id, title: cs.title, challenge: cs.challenge, outcome: cs.outcome })) : undefined,
          portfolioCertifications: portfolioCertifications.length > 0 ? portfolioCertifications.map((c: { id: string; name: string; issuer: string }) => ({ id: c.id, name: c.name, issuer: c.issuer })) : undefined,
        },
      });
      if (error) throw new Error(error.message || 'Translation failed');
      if (data?.error) throw new Error(data.error || 'Translation failed');
      const translations = data?.translations;
      if (translations) {
        setPortfolioTranslations(prev => ({ ...prev, [targetLanguage]: translations }));
        if (!silent) toast.success(`Translated to ${targetLanguage}! Save to publish.`);
        return translations;
      }
      return null;
    } catch {
      if (!silent) toast.error('Translation failed. Please try again.');
      return null;
    } finally {
      if (!silent) setTranslating(false);
    }
  };

  const handleTranslate = () => {
    haptics.light();
    runTranslation(portfolioSecondaryLanguage);
  };

  const handleGenerateAvailability = async () => {
    setGeneratingAvailability(true);
    haptics.light();
    try {
      const { headline } = await callPortfolioAI('availability');
      if (headline) setAvailabilityHeadline(headline);
      toast.success('Availability headline generated!');
    } catch {
      toast.error('Failed to generate headline. Please try again later.');
    } finally {
      setGeneratingAvailability(false);
    }
  };

  const handleGetCritique = async () => {
    setGeneratingCritique(true);
    setShowCritique(true);
    setCritiqueError(false);
    haptics.light();
    try {
      const { suggestions } = await callPortfolioAI('critique', undefined, {
        portfolioSummary,
        caseStudies,
        services,
        testimonials,
        highlights,
        pinnedProject,
      });
      setCritiqueItems(Array.isArray(suggestions) ? suggestions : []);
      setCritiqueHasRun(true);
    } catch {
      toast.error('Failed to run critique. Please try again.');
      setCritiqueHasRun(true);
      setCritiqueError(true);
    } finally {
      setGeneratingCritique(false);
    }
  };

  const handleGenerateTestimonialPrompt = async (_testimonialId: string, colleagueName: string): Promise<string> => {
    const { prompt: promptText } = await callPortfolioAI('testimonial-prompt', undefined, {
      colleagueName: colleagueName || '',
    });
    return promptText || '';
  };

  const [savingDraft, setSavingDraft] = useState(false);

  const handleSaveDraft = async () => {
    haptics.light();
    setSavingDraft(true);
    try {
      const supabaseUserId = getUserId();
      if (!supabaseUserId) throw new Error('Not authenticated');
      const snapshot = JSON.parse(getCurrentSnapshot()) as Record<string, unknown>;
      const now = new Date().toISOString();
      // Direct write — bypass mutation invalidation to avoid clobbering active edits
      const { error } = await supabase
        .from('profiles')
        .update({ portfolio_draft: snapshot, portfolio_draft_saved_at: now })
        .eq('user_id', supabaseUserId);
      if (error) throw error;
      queryClient.setQueriesData<Profile | null>({ queryKey: ['profile'] }, (old) =>
        old ? { ...old, portfolioDraft: snapshot, portfolioDraftSavedAt: now } : old
      );
      setLastSavedSnapshot(getCurrentSnapshot());
      toast.success('Draft saved. Click "Publish" when you\'re ready to go live.');
    } catch {
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSave = async (overrides?: {portfolioEnabled?: boolean; portfolioStyleOverride?: string; abChallengerThemeOverride?: string}) => {
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
      if (username && username.length >= usernameRules.min_length && profile?.username !== username) {
        const { data: available } = await supabase.rpc('check_username_available', {
          p_username: username,
          p_user_id: user!.id
        });
        const availStatus = (available as { status?: string } | null)?.status ?? 'invalid';
        if (availStatus !== 'available') {
          setUsernameAvailable(false);
          setUsernameCheckStatus({
            status: availStatus,
            reason: (available as { reason?: string } | null)?.reason,
          });
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
        portfolioStyle: overrides?.portfolioStyleOverride !== undefined ? overrides.portfolioStyleOverride : portfolioStyle,
        portfolioLayout,
        portfolioAccentColor: portfolioAccentColor || null,
        portfolioFont,
        openToWork: availabilityStatus !== 'not-looking',
        availabilityHeadline: availabilityHeadline || null,
        portfolioSyncMode: syncMode,
        portfolioExtras: await (async () => {
          let finalPasswordHash = passwordHash;
          if (passwordEnabled && portfolioPassword) {
            finalPasswordHash = await sha256hex(portfolioPassword);
            setPasswordHash(finalPasswordHash);
            setPortfolioPassword('');
          }
          const effectivePasswordEnabled = passwordEnabled && !!finalPasswordHash;
          return {
            caseStudies, services, testimonials, highlights, portfolioSummary,
            sectionOrder,
            pinnedProject: pinnedProject || null,
            availabilityStatus,
            scrollEffect,
            videoIntroUrl: videoIntroUrl || null,
            schedulingUrl: normalizeUrl(schedulingUrl) || null,
            abChallengerTheme: overrides?.abChallengerThemeOverride !== undefined ? (overrides.abChallengerThemeOverride || null) : (abChallengerTheme || null),
            portfolioCertifications,
            portfolioPrimaryLanguage: portfolioPrimaryLanguage || 'English',
            portfolioSecondaryLanguage: portfolioSecondaryLanguage || null,
            portfolioTranslations: Object.keys(portfolioTranslations).length > 0 ? portfolioTranslations : null,
            lastSyncedFromResumeAt: syncMode === 'auto' ? new Date().toISOString() : (
              profile?.portfolioExtras?.lastSyncedFromResumeAt ?? null
            ),
            passwordEnabled: effectivePasswordEnabled,
            passwordHash: effectivePasswordEnabled ? finalPasswordHash : null,
            customDomain: isPaidUser ? (customDomain.trim() || null) : null,
            contactFormEnabled,
          };
        })()
      };

      // Clear the persisted draft in the same write as the live-column promotion
      // so publish is atomic — no fire-and-forget second mutation that could fail silently.
      (updates as Record<string, unknown>).portfolioDraft = null;
      (updates as Record<string, unknown>).portfolioDraftSavedAt = null;

      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      
      // Save history snapshot (fire and forget to not block UI)
      if (overrides?.portfolioEnabled === undefined) {
        saveSnapshot(updates as Record<string, unknown>).catch(() => {});
      }

      setLastSavedSnapshot(getCurrentSnapshot());

      // Invalidate public portfolio cache to reflect changes immediately
      queryClient.invalidateQueries({ queryKey: ['public-portfolio'] });
      if (overrides?.portfolioEnabled !== undefined) {
        setPortfolioEnabled(overrides.portfolioEnabled);
      }
      toast.success('Published! Your portfolio is now live.');

      // Auto-translate all sections on save when secondary language is configured.
      // Use the already-committed extras (updates.portfolioExtras) as the base
      // so the second patch never overwrites freshly saved fields with stale values.
      if (portfolioSecondaryLanguage) {
        const savedExtras = updates.portfolioExtras as Record<string, unknown>;
        runTranslation(portfolioSecondaryLanguage, true).then((newTranslations) => {
          if (newTranslations) {
            updateProfile({
              portfolioExtras: {
                ...savedExtras,
                portfolioTranslations: {
                  ...(savedExtras.portfolioTranslations as Record<string, unknown> || {}),
                  [portfolioSecondaryLanguage]: newTranslations,
                },
              }
            } as Parameters<typeof updateProfile>[0]).catch(() => {});
          }
        }).catch(() => {});
      }
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

  // Display URL — always show resume.thewise.cloud (never thewise.cloud)
  const portfolioDisplayUrl = username ? getPortfolioDisplayUrl(username) : '';
  // Canonical URL for copy/share/QR — always uses resume.thewise.cloud so shared links
  // always point to the primary domain regardless of which domain the editor is loaded on.
  const portfolioCanonicalUrl = username ? `https://resume.thewise.cloud/p/${username}` : '';
  // Navigation URL — uses the current domain so it works in any environment
  const actualPortfolioUrl = username ? getPortfolioUrl(username) : '';

  const handleCopyUrl = async () => {
    if (!portfolioCanonicalUrl) return;
    await navigator.clipboard.writeText(portfolioCanonicalUrl);
    setCopied(true);
    haptics.light();
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareQR = async () => {
    if (!portfolioCanonicalUrl) return;
    haptics.light();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile?.fullName || 'My'} Portfolio`, url: portfolioCanonicalUrl });
      } catch {/* cancelled */}
    } else {
      await navigator.clipboard.writeText(portfolioCanonicalUrl);
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
    } catch {
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
    { ok: username.length >= usernameRules.min_length, tip: 'Set a portfolio username' },
    { ok: !!(linkedinUrl || githubUrl || websiteUrl || twitterUrl || contactEmail), tip: 'Add at least one social link or contact email' },
    { ok: availabilityHeadline.length > 0, tip: 'Set an availability headline' },
    { ok: metaTitle.length > 0, tip: 'Add a custom page title for SEO' },
    { ok: metaDescription.length > 0, tip: 'Add a meta description for SEO' },
    { ok: Array.isArray(selectedResume?.experience) && (selectedResume?.experience as unknown[]).length >= 1, tip: 'Add work experience to your resume' },
    { ok: Array.isArray(selectedResume?.skills) && (selectedResume?.skills as unknown[]).length >= 3, tip: 'Add at least 3 skills to your resume' },
    { ok: services.length > 0, tip: 'Add services to showcase what you offer' },
    { ok: testimonials.length > 0, tip: 'Add testimonials to build credibility' },
  ];

  const completionItems = buildCompletionItems({
    bio,
    avatarUrl: profile?.avatarUrl,
    hasExperience: Array.isArray(selectedResume?.experience) && (selectedResume?.experience as unknown[]).length >= 1,
    hasSkills: Array.isArray(selectedResume?.skills) && (selectedResume?.skills as unknown[]).length >= 3,
    hasSocialLink: !!(linkedinUrl || githubUrl || websiteUrl || twitterUrl || contactEmail),
    hasProjects: caseStudies.length > 0 || services.length > 0,
    hasTestimonials: testimonials.length > 0,
    metaTitle,
    availabilityStatus,
    accentColor: portfolioAccentColor || null,
  });
  const weightedScore = completionItems.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);

  const strengthScore = Math.round(strengthChecks.filter((c) => c.ok).length / strengthChecks.length * 100);
  const strengthMissing = strengthChecks.filter((c) => !c.ok).slice(0, 3);
  const strengthLabel = portfolioEnabled && strengthScore === 100
    ? 'Ready to Publish'
    : !portfolioEnabled && strengthScore >= 70
    ? 'Publish to go live'
    : strengthScore < 40
    ? 'Needs work'
    : strengthScore < 70
    ? 'Good'
    : 'Strong';


  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-background/95 backdrop-blur-sm">
        <BackButton onBeforeBack={() => {
          if (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot) {
            handleNavigateAway('/dashboard');
            return true;
          }
          return false;
        }} />
        <h1 className="text-page-title leading-tight flex-1">Portfolio</h1>
        {portfolioEnabled && portfolioCanonicalUrl && (
          <a
            href={portfolioCanonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors shrink-0"
            title="View public portfolio"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View live</span>
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-6 bg-[#fbf9f9]/15">
        {/* Status Bar */}
        <StatusBar
          portfolioEnabled={portfolioEnabled}
          portfolioDisplayUrl={portfolioDisplayUrl}
          actualPortfolioUrl={portfolioCanonicalUrl}
          copied={copied}
          onCopyUrl={handleCopyUrl}
          onOpenQR={() => {haptics.light();setShowQR(true);}}
          strengthScore={strengthScore}
          strengthLabel={strengthLabel}
          strengthMissing={strengthMissing}
          hasUnpublishedChanges={!!(profile?.portfolioDraft || (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot))} />
        

        {/* Live Preview Card + mobile toggle */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground flex-1">Preview</span>
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted border border-border">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${previewMode === 'desktop' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Desktop preview"
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${previewMode === 'mobile' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Mobile preview"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>
          </div>

          {previewMode === 'mobile' ? (
            <div className="flex justify-center">
              {/* Phone shell: 220px wide, clips the 390→220 scaled iframe */}
              <div className="relative rounded-[2.5rem] border-[8px] border-foreground/20 overflow-hidden bg-background shadow-xl"
                style={{ width: 220, height: 396 }}>
                {/* Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-foreground/20 z-20 pointer-events-none" />
                {portfolioEnabled && portfolioCanonicalUrl ? (
                  <iframe
                    src={portfolioCanonicalUrl}
                    title="Mobile portfolio preview"
                    sandbox="allow-scripts allow-same-origin"
                    style={{
                      width: 390,
                      height: 700,
                      border: 'none',
                      transform: 'scale(0.5641)',
                      transformOrigin: 'top left',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <Smartphone className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">Publish your portfolio to see a mobile preview</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <LivePreviewCard
              avatarUrl={profile?.avatarUrl}
              fullName={profile?.fullName}
              jobTitle={profile?.jobTitle}
              portfolioStyle={portfolioStyle}
              accentColor={portfolioAccentColor}
              portfolioFont={portfolioFont}
              bio={bio}
              openToWork={availabilityStatus !== 'not-looking'}
              availabilityStatus={availabilityStatus}
              views={profile?.views || 0}
              scrollEffect={scrollEffect}
            />
          )}
        </div>
        

        {/* Share your profile — QR code entry point */}
        <button
          onClick={() => { haptics.light(); handleNavigateAway('/qr-code'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/20 active:scale-[0.98] transition-all touch-manipulation text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Get your QR code</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Share your portfolio anywhere, instantly</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">→</span>
        </button>

        {/* Tab Row */}
        <div
          id="portfolio-tab-strip"
          className="flex gap-1 p-1 rounded-xl bg-card border border-border overflow-x-auto scrollbar-none scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {([
          { id: 'setup', label: 'Setup' },
          { id: 'content', label: 'Content' },
          { id: 'design', label: 'Design' },
          { id: 'visitors', label: 'Visitors' },
          { id: 'more', label: 'More' }] as
          const).map((tab) =>
          <button
            key={tab.id}
            id={`portfolio-tab-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] touch-manipulation active:scale-[0.97] whitespace-nowrap px-2 snap-start shrink-0 ${
            activeTab === tab.id ?
            'bg-card border border-border shadow-soft text-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.2)]' :
            'text-muted-foreground hover:bg-muted/50'}`
            }>
            
              {tab.label}
            </button>
          )}
        </div>

        {/* Completion Score Bar */}
        <CompletionScoreBar score={weightedScore} items={completionItems} />

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
              usernameCheckStatus={usernameCheckStatus}
              onRequestUsername={() => setRequestDialogOpen(true)}
              checkingUsername={checkingUsername}
              usernameMinLength={usernameRules.min_length}
              usernameMaxLength={usernameRules.max_length}
              premiumHandles={premiumHandles}
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
              availabilityStatus={availabilityStatus}
              onAvailabilityStatusChange={setAvailabilityStatus}
              availabilityHeadline={availabilityHeadline}
              onAvailabilityHeadlineChange={setAvailabilityHeadline}
              onGenerateAvailability={handleGenerateAvailability}
              generatingAvailability={generatingAvailability}
              videoIntroUrl={videoIntroUrl}
              onVideoIntroUrlChange={setVideoIntroUrl}
              onGetCritique={handleGetCritique}
              generatingCritique={generatingCritique} />

            }

            {activeTab === 'content' &&
            <ContentTab
              openSections={openSections}
              toggleSection={toggleSection}
              syncMode={syncMode}
              onSyncModeChange={setSyncMode}
              resumeUpdatedAt={selectedResume?.updated_at ?? null}
              portfolioLastSyncedAt={profile?.portfolioExtras?.lastSyncedFromResumeAt ?? null}
              portfolioSummary={portfolioSummary}
              onPortfolioSummaryChange={setPortfolioSummary}
              bio={bio}
              caseStudies={caseStudies}
              onCaseStudiesChange={setCaseStudies}
              services={services}
              onServicesChange={setServices}
              testimonials={testimonials}
              onTestimonialsChange={setTestimonials}
              onGenerateTestimonialPrompt={handleGenerateTestimonialPrompt}
              highlights={highlights}
              onHighlightsChange={setHighlights}
              sectionOrder={sectionOrder}
              onSectionOrderChange={setSectionOrder}
              pinnedProject={pinnedProject}
              onPinnedProjectChange={setPinnedProject}
              portfolioCertifications={portfolioCertifications}
              onPortfolioCertificationsChange={setPortfolioCertifications} />

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
              scrollEffect={scrollEffect}
              onScrollEffectChange={setScrollEffect}
              abChallengerTheme={abChallengerTheme}
              onAbChallengerThemeChange={setAbChallengerTheme}
              userName={profile?.fullName || undefined}
              userAvatarUrl={profile?.avatarUrl || undefined} />

            }

            {activeTab === 'visitors' &&
            <VisitorsTab
              username={username || null}
              portfolioCanonicalUrl={portfolioCanonicalUrl}
              onShare={handleShareQR}
              portfolioStyle={portfolioStyle}
              abChallengerTheme={abChallengerTheme || undefined}
              userId={user?.id}
              onPickWinner={(winnerId) => {
                setPortfolioStyle(winnerId as import('@/components/portfolio/editor/AppearanceSection').PortfolioStyle);
                setAbChallengerTheme('');
                handleSave({ portfolioStyleOverride: winnerId, abChallengerThemeOverride: '' });
              }}
            />

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
              toggleSection={toggleSection}
              portfolioPrimaryLanguage={portfolioPrimaryLanguage}
              onPortfolioPrimaryLanguageChange={setPortfolioPrimaryLanguage}
              portfolioSecondaryLanguage={portfolioSecondaryLanguage}
              onPortfolioSecondaryLanguageChange={setPortfolioSecondaryLanguage}
              schedulingUrl={schedulingUrl}
              onSchedulingUrlChange={setSchedulingUrl}
              onTranslate={handleTranslate}
              translating={translating}
              passwordEnabled={passwordEnabled}
              onPasswordEnabledChange={setPasswordEnabled}
              portfolioPasswordSet={!!passwordHash}
              onPortfolioPasswordChange={setPortfolioPassword}
              customDomain={customDomain}
              onCustomDomainChange={setCustomDomain}
              isPaidUser={isPaidUser}
              contactFormEnabled={contactFormEnabled}
              onContactFormEnabledChange={setContactFormEnabled} />

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
        onPortfolioEnabledChange={setPortfolioEnabled}
        portfolioUrl={portfolioCanonicalUrl || undefined}
        hasUnpublishedChanges={!!(profile?.portfolioDraft || (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot))}
        onSaveDraft={handleSaveDraft}
        savingDraft={savingDraft} />
      

      {/* Sheets */}
      <QRGeneratorSheet
        open={showQR}
        onOpenChange={setShowQR}
        portfolioUrl={portfolioCanonicalUrl}
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

      <AICritiqueSheet
        open={showCritique}
        onOpenChange={setShowCritique}
        items={critiqueItems}
        loading={generatingCritique}
        onRunCritique={handleGetCritique}
        hasRun={critiqueHasRun}
        error={critiqueError}
      />
      
      <UsernameRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        requestedUsername={username}
        checkReason={usernameCheckStatus?.reason}
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
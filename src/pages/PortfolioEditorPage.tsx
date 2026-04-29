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
import { validateCustomDomain } from '@/hooks/usePublicPortfolio';
import { VisitorsTab } from '@/components/portfolio/editor/VisitorsTab';
import type { ScrollEffect } from '@/components/portfolio/editor/ScrollEffectPicker';
import { AICritiqueSheet, type CritiqueItem } from '@/components/portfolio/editor/AICritiqueSheet';
import { CompletionScoreBar, buildCompletionItems } from '@/components/portfolio/editor/CompletionScoreBar';
import { Monitor, Smartphone } from 'lucide-react';


// Minimum portfolio-password length enforced both client- and server-side.
// The server (set_portfolio_password RPC) rejects anything shorter; this
// constant keeps the editor and the public unlock gate consistent.
const PORTFOLIO_PASSWORD_MIN_LENGTH = 8;

// Hard byte budget for the portfolio_extras JSONB column at publish time AND
// for the portfolio_draft JSONB column at autosave time.  Hoisted to module
// scope so the two enforcement points (handleSave below + the autosave
// useEffect) cannot drift — Phase 4 introduced the publish-side cap; Phase
// 5 / Task #20 extends the same budget to the autosave path so a runaway
// translations / case-studies blob can't silently spam multi-megabyte
// writes to portfolio_draft on every keystroke (and then ambush the user
// at publish time, far from where the bloat was introduced).
const PORTFOLIO_EXTRAS_MAX_BYTES = 200_000;

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

  // Fires the over-budget toast at most once per editor session so a user who
  // is actively editing a too-large draft doesn't get a spam-storm of warnings
  // every 3 s.  Resets only on full unmount (i.e. leaving the editor page).
  const draftOverflowToastedRef = useRef(false);

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
        // ── Draft size guard (mirrors the publish-side cap) ──
        // Skip the network write if the serialized draft would balloon the
        // portfolio_draft JSONB column past the same ~200 KB budget that
        // publish enforces on portfolio_extras.  We measure the whole
        // snapshot string (which is already JSON.stringified by
        // getCurrentSnapshot) because the runaway-blob-prone fields
        // (caseStudies, services, testimonials, highlights, translations,
        // certifications) all live inside it and dominate the byte count.
        // Uses string `.length` to match the publish-side measurement
        // exactly — same yardstick, no drift between the two guards.
        // Critically: we do NOT touch in-memory editor state — the user
        // keeps their work, they just don't get cross-session draft
        // restoration until they trim the payload back under the cap.
        // The toast is gated to one fire per editor session via the ref so
        // continued typing doesn't trigger a spam-storm every 3 s.
        if (currentSnapshot.length > PORTFOLIO_EXTRAS_MAX_BYTES) {
          if (!draftOverflowToastedRef.current) {
            draftOverflowToastedRef.current = true;
            toast.warning(
              `Draft is too large to autosave (${Math.round(currentSnapshot.length / 1024)} KB / ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB max). Your edits are still here, but they won't be restored after a refresh until you trim some services, case studies, testimonials, or translations.`,
              { duration: 8000 }
            );
          }
          return;
        }
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

    if (!selectedResume) {
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
    // Differentiate the two failure modes so the user knows what to fix:
    //   1. No resume on the account at all → tell them to create one first.
    //   2. A resume exists but every signal we'd feed the model is blank →
    //      tell them to fill in the resume so AI has something to work with.
    if (!currentResume) {
      toast.error('Create a resume first — bio generation needs work history or a job title to draw from.');
      return;
    }
    const hasUsableSignal =
      !!currentResume.summary?.trim() ||
      !!profile?.jobTitle?.trim() ||
      (Array.isArray(currentResume.experience) && (currentResume.experience as unknown[]).length > 0);
    if (!hasUsableSignal) {
      toast.error('Selected resume is empty — add a summary, job title, or work history before generating a bio.');
      return;
    }
    setGeneratingBio(true);
    haptics.light();
    try {
      const { bio: generatedBio } = await callPortfolioAI('bio', currentResumeId);
      setBio(generatedBio);
      toast.success('Bio generated!');
    } catch (err) {
      const msg = err instanceof Error && err.message.startsWith('Resume data not available')
        ? err.message
        : 'Failed to generate bio. Please try again later.';
      toast.error(msg);
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
    } catch (err) {
      const msg = err instanceof Error && err.message.startsWith('Resume data not available')
        ? err.message
        : 'Failed to generate SEO meta. Please try again later.';
      toast.error(msg);
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
    } catch (err) {
      const msg = err instanceof Error && err.message.startsWith('Resume data not available')
        ? err.message
        : 'Failed to generate headline. Please try again later.';
      toast.error(msg);
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
    } catch (err) {
      const msg = err instanceof Error && err.message.startsWith('Resume data not available')
        ? err.message
        : 'Failed to run critique. Please try again.';
      toast.error(msg);
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

    // ── Portfolio password validation (Phase 1: server-side bcrypt) ──
    // Hashing happens entirely on the server (set_portfolio_password RPC).
    // Block save here so the user gets immediate feedback rather than a
    // generic backend error after a network round-trip.  We read the
    // CURRENT state from the live profile cache only as a fast-path hint;
    // the authoritative read happens below before we compose the payload,
    // so a stale cache cannot cause us to write `passwordHash: null` over
    // a real hash that exists in the DB.
    const cachedPasswordEnabled = !!profile?.portfolioExtras?.passwordEnabled;
    const cachedPasswordHash = (profile?.portfolioExtras?.passwordHash as string | undefined) || '';
    const hasNewPassword = portfolioPassword.length > 0;
    const isEnablingPassword =
      overrides?.portfolioEnabled !== false && passwordEnabled;

    // Only enforce the 8-char rule when the user is actually trying to set
    // a password.  If protection is disabled, any leftover characters in
    // the (now-hidden) input must not block the publish — the RPC call
    // below is gated on pwdStateChanged + isEnablingPassword anyway, so a
    // stale value cannot reach the server.  This check is purely on
    // user-typed input and does not depend on cached/DB state, so it can
    // safely fire before the authoritative DB read below.
    if (isEnablingPassword && hasNewPassword && portfolioPassword.length < PORTFOLIO_PASSWORD_MIN_LENGTH) {
      toast.error(`Password must be at least ${PORTFOLIO_PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    // ── Custom domain validation ──
    // Only paid users can set a custom domain; reject obviously invalid hostnames
    // and any host that resolves to our own app/preview infrastructure (a CNAME
    // pointing those at us would create a routing loop). The same validator is
    // used inline in MoreTab so the field shows an error the moment the user
    // types something wrong, without waiting for save.
    if (isPaidUser) {
      const domainError = validateCustomDomain(customDomain);
      if (domainError) {
        toast.error(domainError);
        return;
      }
    }
    // The "enable without new password requires existing hash" guard is
    // deliberately deferred until AFTER the authoritative DB read inside
    // the try block — a stale React Query cache that shows no hash while
    // the DB still has one would otherwise produce a false negative and
    // block a legitimate save.

    setSavingPortfolio(true);
    haptics.light();
    try {
      // Authoritative read of the password-protection state straight from
      // the DB.  The editor never touches passwordHash anywhere else, but
      // our updateProfile call below performs a full overwrite of
      // portfolio_extras — if we copied a stale `null`/`false` from the
      // React Query cache, that would silently disable the gate.  Reading
      // here closes that common case.  The two extra columns are tiny so
      // the round-trip cost is negligible compared to the safety win.
      //
      // Known residual race (Phase 2 follow-up): a concurrent tab that
      // mutates the password between this read and the updateProfile call
      // below can still have its change overwritten.  The proper fix is
      // an optimistic concurrency guard on profile updates or moving the
      // entire portfolio_extras merge server-side; both are out of scope
      // for the current task.  The window is one network round-trip wide
      // and requires two tabs actively editing the password simultaneously.
      const supabaseUserIdForPwd = await getUserId();
      let dbPasswordEnabled = cachedPasswordEnabled;
      let dbPasswordHash = cachedPasswordHash;
      if (supabaseUserIdForPwd) {
        const { data: freshExtras } = await supabase
          .from('profiles')
          .select('portfolio_extras')
          .eq('user_id', supabaseUserIdForPwd)
          .maybeSingle();
        const fe = (freshExtras?.portfolio_extras as Record<string, unknown> | null) ?? {};
        dbPasswordEnabled = !!fe.passwordEnabled;
        dbPasswordHash = typeof fe.passwordHash === 'string' ? fe.passwordHash : '';
      }

      // Deferred guard: enabling password protection without a stored hash
      // and without a new password is invalid.  Run this AFTER the fresh DB
      // read so a stale React Query cache cannot block a legitimate save.
      if (isEnablingPassword && !dbPasswordHash && !hasNewPassword) {
        toast.error('Set a password before enabling password protection.');
        setSavingPortfolio(false);
        return;
      }

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
        portfolioExtras: {
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
          // Preserve existing password fields untouched — set_portfolio_password
          // (called after updateProfile below) is the SOLE writer of these two
          // keys.  We use the FRESH DB read above (not the React Query cache)
          // so a stale snapshot can never overwrite a real hash with null.
          passwordEnabled: dbPasswordEnabled,
          passwordHash: dbPasswordHash || null,
          customDomain: isPaidUser ? (customDomain.trim() || null) : null,
          contactFormEnabled,
        }
      };

      // ── portfolio_extras size guard ──
      // Reject saves that would balloon the JSONB column past ~200 KB.  A run-away
      // extras blob bloats every profile read (and every public portfolio fetch)
      // for that user, and we don't want a single huge translations / case-studies
      // payload to silently degrade the API.  The cap is generous enough for
      // dozens of services + multi-language translations.  Uses the shared
      // module-scope PORTFOLIO_EXTRAS_MAX_BYTES so the publish-side limit and
      // the autosave-side limit (in the autosave useEffect above) can never
      // drift apart.
      const extrasBytes = JSON.stringify(updates.portfolioExtras ?? {}).length;
      if (extrasBytes > PORTFOLIO_EXTRAS_MAX_BYTES) {
        toast.error(
          `Portfolio content is too large (${Math.round(extrasBytes / 1024)} KB / ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB max). Remove some services, case studies, testimonials, or translations.`
        );
        setSavingPortfolio(false);
        return;
      }

      // Clear the persisted draft in the same write as the live-column promotion
      // so publish is atomic — no fire-and-forget second mutation that could fail silently.
      (updates as Record<string, unknown>).portfolioDraft = null;
      (updates as Record<string, unknown>).portfolioDraftSavedAt = null;

      await updateProfile(updates as Parameters<typeof updateProfile>[0]);

      // ── Apply password changes via the dedicated server-side RPC ──
      // The RPC bcrypts the raw password on the server (no client hashing)
      // and merges only the passwordEnabled / passwordHash keys, leaving the
      // portfolio_extras JSONB column we just wrote untouched in every other
      // respect.  Called only when the password state actually changed so a
      // routine save never bumps the bcrypt hash.
      const pwdStateChanged = passwordEnabled !== dbPasswordEnabled || hasNewPassword;
      let pwdRpcFailed = false;
      if (pwdStateChanged) {
        try {
          const { error: rpcError } = await supabase.rpc('set_portfolio_password', {
            p_password: hasNewPassword ? portfolioPassword : null,
            p_enabled: passwordEnabled,
          });
          if (rpcError) throw rpcError;
          // Reflect the new server state locally:
          //  - on enable+new pwd: we now have a stored hash (sentinel value;
          //    the actual hash never returns to the browser)
          //  - on disable: the hash was cleared
          //  - on enable without new pwd (toggle on existing): hash unchanged
          if (passwordEnabled && hasNewPassword) {
            setPasswordHash('set');
          } else if (!passwordEnabled) {
            setPasswordHash('');
          }
          setPortfolioPassword('');
          // Refresh the profile cache so next render reads back the merged extras.
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        } catch (rpcErr) {
          console.error('set_portfolio_password failed', rpcErr);
          pwdRpcFailed = true;
          toast.error('Portfolio saved, but the password update failed. Please try again.');
        }
      }

      // Save history snapshot (fire and forget to not block UI)
      if (overrides?.portfolioEnabled === undefined) {
        saveSnapshot(updates as Record<string, unknown>).catch(() => {});
      }

      const newSnapshot = getCurrentSnapshot();
      setLastSavedSnapshot(newSnapshot);
      // After publish the persisted draft column was cleared above.  Reset the
      // dedup ref so the next divergence from the just-published snapshot
      // triggers a fresh autosave (otherwise a coincidental match against a
      // stale pre-publish ref value would suppress the first draft write).
      lastDraftPersistedSnapshotRef.current = newSnapshot;

      // Invalidate public portfolio cache to reflect changes immediately
      queryClient.invalidateQueries({ queryKey: ['public-portfolio'] });
      if (overrides?.portfolioEnabled !== undefined) {
        setPortfolioEnabled(overrides.portfolioEnabled);
      }
      // Suppress the generic success toast when the password RPC failed —
      // the error toast emitted above is the authoritative outcome and a
      // contradictory "Published!" alongside it would confuse the user
      // about whether protection is actually in effect.
      if (!pwdRpcFailed) {
        toast.success('Published! Your portfolio is now live.');
      }

      // Auto-translate all sections on save when secondary language is configured.
      // Use the already-committed extras (updates.portfolioExtras) as the base
      // so the second patch never overwrites freshly saved fields with stale values.
      // The same PORTFOLIO_EXTRAS_MAX_BYTES cap as the primary publish write
      // applies here — adding a fresh language entry can push a near-full
      // payload over the limit, and silently dropping the write would leave
      // the user staring at a stale translation. We skip the write and toast
      // in that case so they can trim something else first.
      if (portfolioSecondaryLanguage) {
        const savedExtras = updates.portfolioExtras as Record<string, unknown>;
        runTranslation(portfolioSecondaryLanguage, true).then((newTranslations) => {
          if (newTranslations) {
            const nextExtras = {
              ...savedExtras,
              portfolioTranslations: {
                ...(savedExtras.portfolioTranslations as Record<string, unknown> || {}),
                [portfolioSecondaryLanguage]: newTranslations,
              },
            };
            const nextBytes = new Blob([JSON.stringify(nextExtras)]).size;
            if (nextBytes > PORTFOLIO_EXTRAS_MAX_BYTES) {
              toast.error(
                `Translation skipped: payload would exceed ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB (${Math.round(nextBytes / 1024)} KB). Trim some sections and republish.`
              );
              return;
            }
            updateProfile({ portfolioExtras: nextExtras } as Parameters<typeof updateProfile>[0]).catch(() => {});
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
        // Match the clipboard fallback's UX: confirm to the user that the
        // share sheet's chosen target accepted the URL (the Web Share API
        // resolves on success, rejects on cancel/abort).
        toast.success('Shared!');
      } catch (err) {
        // AbortError = user dismissed the share sheet — gentle info toast,
        // not an error, since "I changed my mind" isn't a failure state.
        // Some engines (Safari, older WebViews) reject with a plain Error
        // whose `.name` is still 'AbortError', so a permissive duck-typed
        // check is more reliable than `instanceof DOMException`.
        const isAbort =
          !!err &&
          typeof err === 'object' &&
          (err as { name?: unknown }).name === 'AbortError';
        if (isAbort) {
          toast('Share cancelled.');
        } else {
          // Anything else (permission denied, no targets, etc.) is a real
          // failure — fall back to the clipboard so the user still gets the
          // URL without having to retry.
          try {
            await navigator.clipboard.writeText(portfolioCanonicalUrl);
            toast.success('Link copied to clipboard instead.');
          } catch {
            toast.error('Could not share or copy the link. Please try again.');
          }
        }
      }
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
  // Live skill count (capped at the threshold for messaging clarity).  Driving
  // the tip text from this lets the strength card show "1 more skill needed"
  // immediately as the user edits, instead of only after they save.
  const skillsCount = Array.isArray(selectedResume?.skills)
    ? (selectedResume?.skills as unknown[]).length
    : 0;
  const SKILL_THRESHOLD = 3;
  const skillsRemaining = Math.max(0, SKILL_THRESHOLD - skillsCount);
  const skillsTip =
    skillsRemaining > 0
      ? `${skillsRemaining} more skill${skillsRemaining === 1 ? '' : 's'} needed for full strength (${skillsCount}/${SKILL_THRESHOLD})`
      : `Add at least ${SKILL_THRESHOLD} skills to your resume`;
  const strengthChecks = [
    { ok: !!profile?.avatarUrl, tip: 'Add a profile photo in Settings → Profile' },
    { ok: bio.length >= 50, tip: 'Write a bio (at least 50 characters)' },
    { ok: username.length >= usernameRules.min_length, tip: 'Set a portfolio username' },
    { ok: !!(linkedinUrl || githubUrl || websiteUrl || twitterUrl || contactEmail), tip: 'Add at least one social link or contact email' },
    { ok: availabilityHeadline.length > 0, tip: 'Set an availability headline' },
    { ok: metaTitle.length > 0, tip: 'Add a custom page title for SEO' },
    { ok: metaDescription.length > 0, tip: 'Add a meta description for SEO' },
    { ok: Array.isArray(selectedResume?.experience) && (selectedResume?.experience as unknown[]).length >= 1, tip: 'Add work experience to your resume' },
    { ok: skillsCount >= SKILL_THRESHOLD, tip: skillsTip },
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
  // Decoupled labels: "Live" reflects the publish state; "Ready to publish"
  // reflects content completeness while still in draft.  Previously these were
  // conflated ("Publish to go live" appeared even when score was 100), which
  // confused users into thinking they still had unfinished work.
  const strengthLabel = portfolioEnabled
    ? 'Live'
    : strengthScore === 100
    ? 'Ready to publish'
    : strengthScore >= 70
    ? 'Almost ready'
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
                    <p className="text-xs text-muted-foreground">
                      {!username
                        ? 'Set a username to see a mobile preview'
                        : 'Publish your portfolio to preview on mobile'}
                    </p>
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
              onPasswordEnabledChange={(checked) => {
                setPasswordEnabled(checked);
                // Disabling protection? Drop any password the user had typed
                // but not yet saved.  Otherwise that stale value would still
                // be tracked as an "unsaved change" and could leak into the
                // next enable cycle.
                if (!checked) setPortfolioPassword('');
              }}
              portfolioPasswordSet={!!passwordHash}
              onPortfolioPasswordChange={setPortfolioPassword}
              customDomain={customDomain}
              onCustomDomainChange={setCustomDomain}
              customDomainError={isPaidUser ? validateCustomDomain(customDomain) : null}
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
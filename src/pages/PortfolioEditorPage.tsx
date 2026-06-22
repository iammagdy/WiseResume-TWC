import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CareerCardSheet } from '@/components/portfolio/CareerCardSheet';
import { QRGeneratorSheet } from '@/components/portfolio/qr/QRGeneratorSheet';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { useProfile } from '@/hooks/useProfile';
import { useResumes, type DatabaseResume } from '@/hooks/useResumes';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { invalidateAiCreditQueries } from '@/lib/invalidate-ai-credit-queries';
import { PortfolioEditorSkeleton } from '@/components/layout/PageSkeletons';

import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';
import { Smartphone, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { UsernameRequestDialog } from '@/components/settings/UsernameRequestDialog';
import { usePortfolioUsernameRules } from '@/hooks/usePortfolioUsernameRules';
import { getPortfolioUrl, getPortfolioDisplayUrl, getPortfolioCanonicalUrl } from '@/lib/portfolioUrl';
import { databases, DATABASE_ID, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { openExternal } from '@/lib/openExternal';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { normalizeUrl } from '@/lib/urlUtils';
import { ensureLinkedinUrl, ensureGithubUrl } from '@/components/templates/shared/contactUtils';

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
import {
  clearLocalPortfolioDraft,
  getMergedPortfolioDraftBytes,
  parsePortfolioExtrasField,
  persistPortfolioDraftToProfile,
} from '@/lib/portfolioDraftStorage';
import { VisitorsTab } from '@/components/portfolio/editor/VisitorsTab';
import type { ScrollEffect } from '@/components/portfolio/editor/ScrollEffectPicker';
import { AICritiqueSheet, type CritiqueItem } from '@/components/portfolio/editor/AICritiqueSheet';
import { CompletionScoreBar, buildCompletionItems } from '@/components/portfolio/editor/CompletionScoreBar';
import { PortfolioEditorHeader } from '@/components/portfolio/editor/PortfolioEditorHeader';
import { PortfolioTabStrip, type PortfolioEditorTab } from '@/components/portfolio/editor/PortfolioTabStrip';
import { PortfolioQuickActions } from '@/components/portfolio/editor/PortfolioQuickActions';
import { PortfolioPreviewPanel } from '@/components/portfolio/editor/PortfolioPreviewPanel';
import '@/components/portfolio/editor/portfolio-editor-workspace.css';


// Minimum portfolio-password length enforced both client- and server-side.
// The same constant is checked on the public unlock page so both sides stay in sync.
const PORTFOLIO_PASSWORD_MIN_LENGTH = 8;

// Hard byte budget for the portfolio_extras JSONB column at publish time AND
// for the portfolio_draft JSONB column at autosave time.  Hoisted to module
// scope so the two enforcement points (handleSave below + the autosave
// useEffect) cannot drift - Phase 4 introduced the publish-side cap; Phase
// 5 / Task #20 extends the same budget to the autosave path so a runaway
// translations / case-studies blob can't silently spam multi-megabyte
// writes to portfolio_draft on every keystroke (and then ambush the user
// at publish time, far from where the bloat was introduced).
const PORTFOLIO_EXTRAS_MAX_BYTES = 200_000;

export default function PortfolioEditorPage() {
  const { user } = useAuth();
  const { isPro, isPremium } = usePlan();
  const isPaidUser = isPro || isPremium;
  const { profile, loading, updateProfile } = useProfile(user?.id);
  const { data: resumeDocuments = [] } = useResumes();
  const resumes = useMemo(
    () =>
      resumeDocuments.map((doc: DatabaseResume) => ({
        ...doc,
        id: doc.$id,
      })),
    [resumeDocuments],
  );
  const usernameRules = usePortfolioUsernameRules(user?.id);
  const { saveSnapshot } = usePortfolioHistory(user?.id);
  const queryClient = useQueryClient();

  // Collapsible sections state - all collapsed by default
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
  const [generatingAll, setGeneratingAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
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
  const [activeTab, setActiveTab] = useState<PortfolioEditorTab>('setup');
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

  // Mobile preview toggle (local UI state only - not persisted)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  // -- Unsaved changes tracking --
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

  const handleTabChange = useCallback((tab: PortfolioEditorTab) => {
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

  // Sync profile -> local state
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
      // PORT-P2-01: never load the real bcrypt hash into client state. Keep only a
      // boolean-style sentinel so the "password is set" indicator still works
      // (legacy docs may still carry extras.passwordHash; new docs use passwordEnabled).
      setPasswordHash((extras.passwordHash || extras.passwordEnabled) ? 'set' : '');
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
        if ('passwordHash' in d) setPasswordHash(d.passwordHash ? 'set' : ''); // PORT-P2-01: sentinel only, never the real hash
        if ('customDomain' in d) setCustomDomain(String(d.customDomain ?? ''));
        if ('contactFormEnabled' in d) setContactFormEnabled(Boolean(d.contactFormEnabled));
      }
    }
  }, [profile]);

  // Fetch available premium handles for the user-facing upgrade card
  useEffect(() => {
    let cancelled = false;
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.portfolio_premium_usernames, [
        Query.equal('status', 'available'),
        Query.orderAsc('price_cents'),
        Query.limit(50),
      ])
      .then((result) => {
        if (!cancelled) {
          const handles: PremiumHandle[] = result.documents.map((doc) => ({
            username: doc['username'] as string,
            price_cents: doc['price_cents'] as number,
            currency: doc['currency'] as string,
          }));
          setPremiumHandles(handles);
        }
      })
      .catch(() => { /* non-critical - leave premiumHandles empty on error */ });
    return () => { cancelled = true; };
  }, []);

  // Track premium handle interest - fire once per session when available
  // handles are shown to a logged-in user. Fire-and-forget; never surfaces
  // errors to the user.
  useEffect(() => {
    if (!premiumHandles || premiumHandles.length === 0) return;
    const DEDUP_KEY = 'handle-interest-tracked';
    if (sessionStorage.getItem(DEDUP_KEY)) return;
    sessionStorage.setItem(DEDUP_KEY, '1');
    databases
      .createDocument(DATABASE_ID, COLLECTIONS.usage_events, ID.unique(), {
        event_name: 'handle_interest',
        user_id: user?.id ?? null,
      })
      .catch(() => { /* fire-and-forget - ignore errors */ });
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

  // Debounced autosave to portfolioDraft - persists working copy to Appwrite so
  // drafts survive page closes.
  // IMPORTANT: writes directly via databases.updateDocument (bypassing the
  // useProfile mutation / queryClient.invalidateQueries) so the profile
  // refetch -> state sync effect is NOT triggered and can never roll back the
  // user's active edits.
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
        if (!user?.id) return;
        const currentSnapshot = getCurrentSnapshot();
        // Re-check dedup inside the async callback (snapshot may have changed)
        if (currentSnapshot === lastDraftPersistedSnapshotRef.current) return;
        // -- Draft size guard (mirrors the publish-side cap) --
        // Skip the network write if the serialized draft would balloon the
        // portfolio_draft JSONB column past the same ~200 KB budget that
        // publish enforces on portfolio_extras.  We measure the whole
        // snapshot string (which is already JSON.stringified by
        // getCurrentSnapshot) because the runaway-blob-prone fields
        // (caseStudies, services, testimonials, highlights, translations,
        // certifications) all live inside it and dominate the byte count.
        // Uses string `.length` to match the publish-side measurement
        // exactly - same yardstick, no drift between the two guards.
        // Critically: we do NOT touch in-memory editor state - the user
        // keeps their work, they just don't get cross-session draft
        // restoration until they trim the payload back under the cap.
        // The toast is gated to one fire per editor session via the ref so
        // continued typing doesn't trigger a spam-storm every 3 s.
        // PORT-P3-08: UTF-8 byte size, consistent with the publish-side guard.
        const snapshotBytes = new Blob([currentSnapshot]).size;
        if (snapshotBytes > PORTFOLIO_EXTRAS_MAX_BYTES) {
          if (!draftOverflowToastedRef.current) {
            draftOverflowToastedRef.current = true;
            toast.warning(
              `Draft is too large to autosave (${Math.round(snapshotBytes / 1024)} KB / ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB max). Your edits are still here, but they won't be restored after a refresh until you trim some services, case studies, testimonials, or translations.`,
              { duration: 8000 }
            );
          }
          return;
        }
        const parsed = JSON.parse(currentSnapshot) as Record<string, unknown>;
        const now = new Date().toISOString();
        const profileDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('user_id', user.id),
          Query.limit(1),
        ]);
        if (profileDocs.total > 0) {
          const profileDoc = profileDocs.documents[0] as Record<string, unknown>;
          const existingExtras = parsePortfolioExtrasField(profileDoc.portfolio_extras);
          const mergedDraftBytes = getMergedPortfolioDraftBytes(existingExtras, parsed, now);
          if (mergedDraftBytes > PORTFOLIO_EXTRAS_MAX_BYTES) {
            if (!draftOverflowToastedRef.current) {
              draftOverflowToastedRef.current = true;
              toast.warning(
                `Draft is too large to autosave (${Math.round(mergedDraftBytes / 1024)} KB / ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB max). Your edits are still here, but they won't be restored after a refresh until you trim some services, case studies, testimonials, or translations.`,
                { duration: 8000 }
              );
            }
            return;
          }
          await persistPortfolioDraftToProfile(profileDoc.$id as string, user.id, existingExtras, parsed, now);
          lastDraftPersistedSnapshotRef.current = currentSnapshot;
          queryClient.setQueriesData<Profile | null>({ queryKey: ['profile'] }, (old) =>
            old ? { ...old, portfolioDraft: parsed, portfolioDraftSavedAt: now } : old
          );
        }
      } catch {
        // Silent - draft autosave is best-effort
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
        const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('username', username.toLowerCase()),
          Query.limit(1),
        ]);
        const takenByOther =
          result.total > 0 &&
          (result.documents[0] as unknown as { user_id: string }).user_id !== user!.id;
        const status = takenByOther ? 'taken' : 'available';
        setUsernameAvailable(!takenByOther);
        setUsernameCheckStatus({ status });
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

    const { data, error } = await appwriteFunctions.invoke('generate-portfolio-bio', {
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
    invalidateAiCreditQueries(queryClient);
    return data;
  };

  const handleGenerateBio = async () => {
    // Capture the resume ID at the moment the button is clicked to avoid stale closures
    const currentResumeId = selectedResumeId;
    const currentResume = resumes.find((r) => r.id === currentResumeId) || resumes[0];
    // Differentiate the two failure modes so the user knows what to fix:
    //   1. No resume on the account at all -> tell them to create one first.
    //   2. A resume exists but every signal we'd feed the model is blank ->
    //      tell them to fill in the resume so AI has something to work with.
    if (!currentResume) {
      toast.error('Create a resume first - bio generation needs work history or a job title to draw from.');
      return;
    }
    const hasUsableSignal =
      !!currentResume.summary?.trim() ||
      !!profile?.jobTitle?.trim() ||
      (Array.isArray(currentResume.experience) && (currentResume.experience as unknown[]).length > 0);
    if (!hasUsableSignal) {
      toast.error('Selected resume is empty - add a summary, job title, or work history before generating a bio.');
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
      const { data, error } = await appwriteFunctions.invoke('generate-portfolio-bio', {
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
      invalidateAiCreditQueries(queryClient);
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

  const handleGenerateAll = async () => {
    const currentResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];
    if (!currentResume) {
      toast.error('Create a resume first - AI generation needs work history or a job title.');
      return;
    }
    setGeneratingAll(true);
    haptics.light();
    let completed = 0;
    const toastId = toast.loading('Generating portfolio content (1/3)...');
    try {
      const { bio: generatedBio } = await callPortfolioAI('bio', selectedResumeId);
      if (generatedBio) setBio(generatedBio);
      completed++;
      toast.loading(`Generating portfolio content (${completed + 1}/3)...`, { id: toastId });

      const { metaTitle: t, metaDescription: d } = await callPortfolioAI('seo');
      if (t) setMetaTitle(t);
      if (d) setMetaDescription(d);
      completed++;
      toast.loading(`Generating portfolio content (${completed + 1}/3)...`, { id: toastId });

      const { headline } = await callPortfolioAI('availability');
      if (headline) setAvailabilityHeadline(headline);

      toast.success('Portfolio content generated! Review and publish when ready.', { id: toastId });
    } catch (err) {
      const msg = err instanceof Error && err.message.startsWith('Resume data not available')
        ? err.message
        : `Generated ${completed}/3 sections. Some failed - try again individually.`;
      toast.error(msg, { id: toastId });
    } finally {
      setGeneratingAll(false);
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

  const handleSaveDraft = async () => {
    haptics.light();
    setSavingDraft(true);
    try {
      if (!user?.id) throw new Error('Not authenticated');
      const currentSnapshot = getCurrentSnapshot();
      // PORT-P3-08: UTF-8 byte size, consistent with the publish-side guard.
      const currentSnapshotBytes = new Blob([currentSnapshot]).size;
      if (currentSnapshotBytes > PORTFOLIO_EXTRAS_MAX_BYTES) {
        toast.error(
          `Draft is too large to save (${Math.round(currentSnapshotBytes / 1024)} KB / ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB max). Trim some services, case studies, testimonials, or translations.`
        );
        return;
      }
      const snapshot = JSON.parse(currentSnapshot) as Record<string, unknown>;
      const now = new Date().toISOString();
      // Direct write - bypass mutation invalidation to avoid clobbering active edits
      const profileDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
        Query.equal('user_id', user.id),
        Query.limit(1),
      ]);
      if (profileDocs.total === 0) throw new Error('Profile not found');
      const profileDoc = profileDocs.documents[0] as Record<string, unknown>;
      const existingExtras = parsePortfolioExtrasField(profileDoc.portfolio_extras);
      const mergedDraftBytes = getMergedPortfolioDraftBytes(existingExtras, snapshot, now);
      if (mergedDraftBytes > PORTFOLIO_EXTRAS_MAX_BYTES) {
        toast.error(
          `Draft is too large to save (${Math.round(mergedDraftBytes / 1024)} KB / ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB max). Trim some services, case studies, testimonials, or translations.`
        );
        return;
      }
      await persistPortfolioDraftToProfile(
        profileDoc.$id as string,
        user.id,
        existingExtras,
        snapshot,
        now,
      );
      lastDraftPersistedSnapshotRef.current = currentSnapshot;
      queryClient.setQueriesData<Profile | null>({ queryKey: ['profile'] }, (old) =>
        old ? { ...old, portfolioDraft: snapshot, portfolioDraftSavedAt: now } : old
      );
      setLastSavedSnapshot(currentSnapshot);
      toast.success('Draft saved. Turn on Live or use Save & Publish when you\'re ready to go public.');
    } catch (err) {
      console.error('portfolio draft save failed', err);
      const msg = err instanceof Error ? err.message : 'Failed to save draft. Please try again.';
      toast.error(msg.length > 120 ? 'Failed to save draft. Please try again.' : msg);
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

    // -- Portfolio password validation --
    // Block save here so the user gets immediate feedback rather than a
    // silent failure after the Appwrite write.  We read the CURRENT state
    // from the live profile cache only as a fast-path hint; the authoritative
    // read happens below before we compose the payload, so a stale cache
    // cannot cause us to write `passwordHash: null` over a real hash that
    // exists in the DB.
    const cachedPasswordEnabled = !!profile?.portfolioExtras?.passwordEnabled;
    const cachedPasswordHash = (profile?.portfolioExtras?.passwordHash as string | undefined) || '';
    const hasNewPassword = portfolioPassword.length > 0;
    const isEnablingPassword =
      overrides?.portfolioEnabled !== false && passwordEnabled;

    // Only enforce the 8-char rule when the user is actually trying to set
    // a password.  If protection is disabled, any leftover characters in
    // the (now-hidden) input must not block the publish - the password
    // upsert below is gated on pwdStateChanged + isEnablingPassword anyway,
    // so a stale value cannot reach the DB.  This check is purely on
    // user-typed input and does not depend on cached/DB state, so it can
    // safely fire before the authoritative DB read below.
    if (isEnablingPassword && hasNewPassword && portfolioPassword.length < PORTFOLIO_PASSWORD_MIN_LENGTH) {
      toast.error(`Password must be at least ${PORTFOLIO_PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    // -- Custom domain validation --
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
    // the try block - a stale React Query cache that shows no hash while
    // the DB still has one would otherwise produce a false negative and
    // block a legitimate save.

    setSavingPortfolio(true);
    haptics.light();
    try {
      // Authoritative read of the password-protection state straight from
      // the DB.  The editor never touches passwordHash anywhere else, but
      // our updateProfile call below performs a full overwrite of
      // portfolio_extras - if we copied a stale `null`/`false` from the
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
      let dbPasswordEnabled = cachedPasswordEnabled;
      let dbPasswordHash = cachedPasswordHash;
      if (user?.id) {
        try {
          const settingsDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.portfolio_settings, [
            Query.equal('user_id', user.id),
            Query.limit(1),
          ]);
          if (settingsDocs.total > 0) {
            const doc = settingsDocs.documents[0] as unknown as { password_enabled?: boolean; password_hash?: string };
            dbPasswordEnabled = !!doc.password_enabled;
            dbPasswordHash = doc.password_hash ?? '';
          }
        } catch {
          // Fall back to cached values on error
        }
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
        const usernameResult = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('username', username.toLowerCase()),
          Query.limit(1),
        ]);
        const takenByOther =
          usernameResult.total > 0 &&
          (usernameResult.documents[0] as unknown as { user_id: string }).user_id !== user!.id;
        if (takenByOther) {
          setUsernameAvailable(false);
          setUsernameCheckStatus({ status: 'taken' });
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
        githubUrl: ensureGithubUrl(githubUrl) || null,
        websiteUrl: normalizeUrl(websiteUrl) || null,
        twitterUrl: normalizeUrl(twitterUrl) || null,
        linkedinUrl: ensureLinkedinUrl(linkedinUrl) || null,
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
          // PORT-P2-01: the password HASH is intentionally NOT mirrored into
          // portfolio_extras. portfolio_settings is the sole, server-only home
          // for password_hash; echoing it here exposed the bcrypt hash to the
          // owner's browser via the profile document (and into drafts). Any
          // legacy hash in an existing doc is dropped on this republish. The
          // passwordEnabled boolean is kept as a harmless UI hint.
          passwordEnabled: dbPasswordEnabled,
          customDomain: isPaidUser ? (customDomain.trim() || null) : null,
          contactFormEnabled,
        }
      };

      // -- portfolio_extras size guard --
      // Reject saves that would balloon the JSONB column past ~200 KB.  A run-away
      // extras blob bloats every profile read (and every public portfolio fetch)
      // for that user, and we don't want a single huge translations / case-studies
      // payload to silently degrade the API.  The cap is generous enough for
      // dozens of services + multi-language translations.  Uses the shared
      // module-scope PORTFOLIO_EXTRAS_MAX_BYTES so the publish-side limit and
      // the autosave-side limit (in the autosave useEffect above) can never
      // drift apart.
      // PORT-P3-08: measure UTF-8 byte size (not UTF-16 .length) so multi-byte
      // (CJK / emoji) content cannot slip past the column budget.
      const extrasBytes = new Blob([JSON.stringify(updates.portfolioExtras ?? {})]).size;
      if (extrasBytes > PORTFOLIO_EXTRAS_MAX_BYTES) {
        toast.error(
          `Portfolio content is too large (${Math.round(extrasBytes / 1024)} KB / ${Math.round(PORTFOLIO_EXTRAS_MAX_BYTES / 1024)} KB max). Remove some services, case studies, testimonials, or translations.`
        );
        setSavingPortfolio(false);
        return;
      }

      // Clear the persisted draft in the same write as the live-column promotion
      // so publish is atomic - no fire-and-forget second mutation that could fail silently.
      (updates as Record<string, unknown>).portfolioDraft = null;
      (updates as Record<string, unknown>).portfolioDraftSavedAt = null;

      // PORT-P2-07: publish shows its own "Published!" toast below, so suppress
      // the generic "Profile updated" toast to avoid a confusing double notice.
      await updateProfile(updates as Parameters<typeof updateProfile>[0], { silent: true });
      clearLocalPortfolioDraft(user?.id);

      // -- Apply password changes via Appwrite portfolio_settings upsert --
      // The raw password is hashed client-side with SHA-256 before being
      // written to Appwrite.  Only the password_enabled / password_hash keys
      // are touched - the main profile write above is unaffected.
      // Called only when the password state actually changed so a routine
      // save never regenerates the hash.
      const pwdStateChanged = passwordEnabled !== dbPasswordEnabled || hasNewPassword;
      let pwdUpdateFailed = false;
      if (pwdStateChanged) {
        try {
          let finalHash = dbPasswordHash;
          if (passwordEnabled && hasNewPassword) {
            finalHash = await bcrypt.hash(portfolioPassword, 12);
          } else if (!passwordEnabled) {
            finalHash = '';
          }
          const pwdSettingsDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.portfolio_settings, [
            Query.equal('user_id', user!.id),
            Query.limit(1),
          ]);
          const pwdPayload = {
            user_id: user!.id,
            password_enabled: passwordEnabled,
            password_hash: finalHash || null,
          };
          if (pwdSettingsDocs.total > 0) {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.portfolio_settings, pwdSettingsDocs.documents[0].$id, pwdPayload);
          } else {
            await databases.createDocument(DATABASE_ID, COLLECTIONS.portfolio_settings, ID.unique(), pwdPayload);
          }
          // Reflect the new state locally:
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
        } catch (pwdErr) {
          console.error('portfolio_settings password update failed', pwdErr);
          pwdUpdateFailed = true;
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
      queryClient.invalidateQueries({ queryKey: ['portfolio-gate'] });
      if (overrides?.portfolioEnabled !== undefined) {
        setPortfolioEnabled(overrides.portfolioEnabled);
      }
      // Suppress the generic success toast when the password update failed -
      // the error toast emitted above is the authoritative outcome and a
      // contradictory "Published!" alongside it would confuse the user
      // about whether protection is actually in effect.
      if (!pwdUpdateFailed) {
        toast.success('Published! Your portfolio is now live.');
      }

      // Auto-translate all sections on save when secondary language is configured.
      // Use the already-committed extras (updates.portfolioExtras) as the base
      // so the second patch never overwrites freshly saved fields with stale values.
      // The same PORTFOLIO_EXTRAS_MAX_BYTES cap as the primary publish write
      // applies here - adding a fresh language entry can push a near-full
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
            updateProfile({ portfolioExtras: nextExtras } as Parameters<typeof updateProfile>[0], { silent: true }).catch(() => {
              toast.warning('Portfolio published - secondary language content could not be synced. Try saving again.');
            });
          }
        }).catch(() => {});
      }
    } catch (err: unknown) {
      console.error('portfolio save failed', err);
      const pgError = err as { code?: string; message?: string };
      if (pgError?.code === '23505') {
        setUsernameAvailable(false);
        toast.error('This username was just taken. Please choose another.');
      } else {
        const detail = pgError?.message ?? (err instanceof Error ? err.message : '');
        const friendly =
          detail.includes('portfolio_theme') || detail.includes('Unknown attribute')
            ? 'Could not save - a portfolio field is misconfigured. Please refresh and try again.'
            : detail.includes('portfolio_extras') || detail.includes('too large')
              ? `Portfolio content is too large. Trim some sections and try again.`
              : detail.length > 0 && detail.length <= 160
                ? detail
                : 'Failed to save portfolio. Your changes might not be published.';
        toast.error(friendly);
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

  // Display URL label — shows wiseresume.app/p/<username> without protocol
  const portfolioDisplayUrl = username ? getPortfolioDisplayUrl(username) : '';
  // Canonical URL for copy/share/QR — always wiseresume.app so shared links
  // always point to the primary brand domain regardless of which host the editor is on.
  const portfolioCanonicalUrl = username ? getPortfolioCanonicalUrl(username) : '';
  // Navigation URL — uses the runtime domain so preview works in any environment
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
        // AbortError = user dismissed the share sheet - gentle info toast,
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
          // failure - fall back to the clipboard so the user still gets the
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

  // -- Portfolio Strength ----------------------------------------------------
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
    { ok: !!profile?.avatarUrl, tip: 'Add a profile photo in Settings -> Profile' },
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
    <div className="portfolio-editor-workspace flex-1 flex flex-col min-h-0 overflow-hidden">
      <PortfolioEditorHeader
        onBeforeBack={() => {
          if (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot) {
            handleNavigateAway('/dashboard');
            return true;
          }
          return false;
        }}
        portfolioEnabled={portfolioEnabled}
        portfolioCanonicalUrl={portfolioCanonicalUrl}
      />

      <div className="portfolio-editor-workspace__scroll flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 pb-8">
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
          hasUnpublishedChanges={!!(profile?.portfolioDraft || (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot))}
        />

        <PortfolioPreviewPanel
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
        >
          {previewMode === 'mobile' ? (
            <div className="flex justify-center py-2">
              <div
                className="relative rounded-[2.5rem] border-[8px] border-foreground/15 overflow-hidden bg-background shadow-xl"
                style={{ width: 220, height: 396 }}
              >
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
                    <Smartphone className="w-8 h-8 text-muted-foreground/50" aria-hidden />
                    <p className="text-xs text-muted-foreground leading-relaxed">
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
        </PortfolioPreviewPanel>

        {portfolioEnabled && portfolioCanonicalUrl && (
          <Button
            type="button"
            variant="outline"
            className="lg:hidden w-full min-h-[44px] rounded-xl"
            onClick={() => { haptics.light(); setFullPreviewOpen(true); }}
          >
            <Maximize2 className="w-4 h-4 mr-2" aria-hidden />
            Full preview
          </Button>
        )}

        <PortfolioQuickActions
          onQrCode={() => {
            haptics.light();
            handleNavigateAway('/qr-code');
          }}
          onGenerateAll={handleGenerateAll}
          generatingAll={generatingAll}
          generatingBio={generatingBio}
          generatingSEO={generatingSEO}
        />

        <PortfolioTabStrip activeTab={activeTab} onTabChange={handleTabChange} className="portfolio-tab-strip--fade" />

        {/* Completion Score Bar */}
        <CompletionScoreBar score={weightedScore} items={completionItems} />

        {/* Tab Content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            id={`portfolio-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`portfolio-tab-${activeTab}`}
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
      <Sheet open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
        <SheetContent side="bottom" className="h-[90dvh] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
            <SheetTitle>Portfolio preview</SheetTitle>
          </SheetHeader>
          {portfolioCanonicalUrl && (
            <iframe
              src={portfolioCanonicalUrl}
              title="Full portfolio preview"
              sandbox="allow-scripts allow-same-origin"
              className="flex-1 w-full border-0 bg-background"
            />
          )}
        </SheetContent>
      </Sheet>
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

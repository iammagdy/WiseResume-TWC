import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { usePublicPortfolio, usePortfolioGate, type PortfolioSections } from '@/hooks/usePublicPortfolio';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, SearchX, Languages, Heart, Check, Printer, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { StickyHeader } from '@/components/portfolio/public/StickyHeader';
import { useActiveStatus } from '@/hooks/useActiveStatus';
import { getThemeById, buildThemeCSSVars } from '@/lib/portfolioThemes';

import { usePortfolioTracking } from '@/hooks/usePortfolioTracking';
import { usePortfolioSEO } from '@/hooks/usePortfolioSEO';

// Direct import for above-the-fold content
import { PublicHero } from '@/components/portfolio/public/PublicHero';
import { apiFnUrl } from '@/lib/apiFnUrl';

// Lazy load below-the-fold heavy sections
const PublicSections = lazyWithRetry(() => import('@/components/portfolio/public/PublicSections').then(m => ({ default: m.PublicSections })));

// Lazy-loaded ChatWidget
const ChatWidget = lazyWithRetry(() => import('@/components/portfolio/public/ChatWidget').then(m => ({ default: m.ChatWidget })));

// Lazy-loaded Contact Form
const PortfolioContactForm = lazyWithRetry(() => import('@/components/portfolio/public/PortfolioContactForm').then(m => ({ default: m.PortfolioContactForm })));

// ─── helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '239, 68, 68';
}

function hexToRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex)}, ${alpha})`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

function getThemeVars(style: string, accentColor: string | null, font: string): React.CSSProperties {
  const theme = getThemeById(style);
  if (theme) {
    return buildThemeCSSVars(theme, accentColor);
  }

  const accent = accentColor || '#e84545';
  const fontFamilies: Record<string, string> = {
    'inter': 'Inter, system-ui, sans-serif',
    'space-grotesk': '"Space Grotesk", Inter, system-ui, sans-serif',
    'serif': 'Georgia, "Times New Roman", serif',
  };
  const headingFont = fontFamilies[font] || fontFamilies['inter'];

  return {
    '--pf-accent': accent,
    '--pf-heading-font': headingFont,
    '--pf-body-font': font === 'serif' ? headingFont : (fontFamilies['inter']),
  } as React.CSSProperties;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PortfolioSkeleton() {
  return (
    <div className="relative z-[1] min-h-screen bg-[--pf-bg,#0a0a0f] p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-4 pt-16">
        <Skeleton className="h-36 w-36 rounded-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-44 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Slim Sections Skeleton ────────────────────────────────────────────────────
function SectionsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 space-y-3 py-4">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="relative z-[1] min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <SearchX className="w-16 h-16 mx-auto mb-4 text-white/60" />
        <h1 className="text-3xl font-bold text-white">Portfolio Not Found</h1>
        <p className="text-white/60">This portfolio doesn't exist or isn't public yet.</p>
        <a href="https://resume.thewise.cloud" className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#e84545] text-white rounded-full font-medium text-sm hover:bg-[#e84545]/90 transition-colors">
          Create your free portfolio with WiseResume →
        </a>
      </div>
    </div>
  );
}

// ─── Password Gate ────────────────────────────────────────────────────────────
// Password verification is fully server-side. The gate component collects the
// raw password and passes it to the parent; no hashing occurs in the browser.
//
// IMPORTANT: do NOT enforce a minimum length here.  The 8-char minimum applies
// only to passwords being SET (editor + server RPC).  Existing portfolios may
// have been protected with shorter passwords before that rule existed; refusing
// to submit them client-side would lock owners out of their own gate.  We also
// pass the raw value through (no trim) so passwords with intentional leading/
// trailing whitespace round-trip correctly to the server's exact-match check.
function PasswordGate({
  accentColor,
  onSubmit,
  hasError,
  isChecking,
}: {
  accentColor: string;
  onSubmit: (password: string) => void;
  hasError: boolean;
  isChecking: boolean;
}) {
  const [value, setValue] = useState('');
  const canSubmit = value.length > 0 && !isChecking;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(value);
  }, [canSubmit, value, onSubmit]);

  return (
    <div className="relative z-[1] min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)` }}
        >
          <Lock className="w-7 h-7" style={{ color: accentColor }} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Protected Portfolio</h1>
          <p className="text-sm text-white/60">This portfolio is password-protected. Enter the password to view it.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); }}
            placeholder="Enter password"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition-colors"
            autoFocus
            autoComplete="current-password"
          />
          {hasError && <p className="text-sm text-red-400">Incorrect password. Please try again.</p>}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: accentColor }}
          >
            {isChecking ? 'Checking...' : 'Unlock Portfolio'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function PublicPortfolioContent({ usernameOverride }: { usernameOverride?: string }) {
  const { username: usernameParam } = useParams<{ username: string }>();
  const username = usernameOverride || usernameParam;
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref') || undefined;
  const navigate = useNavigate();
  const { user } = useAuth();

  // Phase 1: lightweight gate check — determines if a password is required.
  // The gate RPC never returns the password hash — enforcement is server-side.
  const { data: gateInfo, isLoading: gateLoading } = usePortfolioGate(username);
  const [submittedPassword, setSubmittedPassword] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);

  // Reset password state whenever the portfolio identity changes.
  useEffect(() => {
    setSubmittedPassword(null);
    setPasswordError(false);
  }, [username]);

  const passwordRequired = !!(gateInfo?.passwordEnabled);
  const contentEnabled = !passwordRequired || submittedPassword !== null;

  // Phase 2: full portfolio fetch — only triggered after password is submitted (or if no password).
  // The raw password is sent over HTTPS; the server verifies against its stored hash.
  const { data: portfolio, isLoading: contentLoading, error } = usePublicPortfolio(username, contentEnabled, submittedPassword);

  // Handle wrong-password verdict from the server.
  useEffect(() => {
    if (error && (error as Error).message === 'invalid_password') {
      setPasswordError(true);
      setSubmittedPassword(null); // let user try again
    }
  }, [error]);
  const isLoading = gateLoading || (contentEnabled && contentLoading);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [nearFooter, setNearFooter] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<string>('');
  const [interestSent, setInterestSent] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);

  // Check if interest was already sent for this portfolio (localStorage)
  useEffect(() => {
    if (username) {
      const sent = localStorage.getItem(`portfolio-interest-sent:${username}`);
      if (sent) setInterestSent(true);
    }
  }, [username]);

  const handleInterest = async () => {
    if (!username || interestSent || sendingInterest) return;
    setSendingInterest(true);

    // Retrieve or generate a stable UUID token for this browser+portfolio pair.
    // The token is stored in localStorage so repeat submissions are deduplicated
    // both client-side (interestSent state) and server-side (unique DB constraint).
    const tokenKey = `portfolio-interest-token:${username}`;
    let token = localStorage.getItem(tokenKey);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(tokenKey, token);
    }

    try {
      const res = await fetch(apiFnUrl(`portfolio-interest`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token }),
      });

      if (res.ok) {
        setInterestSent(true);
        localStorage.setItem(`portfolio-interest-sent:${username}`, '1');
        toast.success('Your interest has been sent to the portfolio owner!');
      } else {
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as { error?: string }).error || `Request failed (${res.status})`;
        toast.error(msg === 'Portfolio not found' ? 'Portfolio not found.' : 'Could not send interest — please try again.');
      }
    } catch {
      toast.error('Network error — please check your connection and try again.');
    } finally {
      setSendingInterest(false);
    }
  };

  // A/B variant assignment — only active when a challenger theme is configured.
  // Gating on abChallengerTheme prevents experiment data from being recorded
  // during periods when no test is running, keeping analytics results clean.
  const abVariant = useMemo<'a' | 'b' | null>(() => {
    if (!username) return null;
    const challengerTheme = portfolio?.profile?.abChallengerTheme;
    if (!challengerTheme) return null; // no active experiment — send null to tracking
    const key = `portfolio-ab-variant:${username}`;
    const stored = localStorage.getItem(key);
    if (stored === 'a' || stored === 'b') return stored;
    const assigned: 'a' | 'b' = Math.random() < 0.5 ? 'a' : 'b';
    localStorage.setItem(key, assigned);
    return assigned;
  }, [username, portfolio?.profile?.abChallengerTheme]);

  // Extracted hooks
  usePortfolioSEO(portfolio?.profile);
  const { stickyVisible, heroRef } = usePortfolioTracking({ username, refParam, abVariant });

  const contactHref = useMemo(() => {
    if (portfolio?.profile?.contactEmail) return `mailto:${portfolio.profile.contactEmail}`;
    if (portfolio?.profile?.linkedinUrl) return portfolio.profile.linkedinUrl;
    return null;
  }, [portfolio?.profile?.contactEmail, portfolio?.profile?.linkedinUrl]);

  useEffect(() => {
    // Only run this on the client
    if (typeof window === 'undefined') return;
    
    // Safely check prefers-reduced-motion
    let prefersReduced = false;
    if (typeof window.matchMedia === 'function') {
      prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const onScroll = () => {
      setNearFooter(window.scrollY + window.innerHeight >= document.body.scrollHeight - 200);
      const max = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
      if (!prefersReduced && document.documentElement) {
        document.documentElement.style.setProperty('--pf-scroll', String(window.scrollY));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  
  const ctaVisible = stickyVisible && !nearFooter && !!contactHref;

  // Live active status — polls every 60s, pauses when tab hidden
  const liveLastActiveAt = useActiveStatus(
    username || '',
    portfolio?.profile?.lastActiveAt ?? null,
  );

  // When the browser blocks `window.open`, we surface a persistent inline
  // panel (instead of a transient toast) that hands the user a real escape
  // hatch: a Blob-URL anchor they can click to open the print page in a new
  // tab manually, plus short instructions for unblocking pop-ups for this
  // site.  The panel lives directly under the Print button so it's discovered
  // exactly where the user just looked.
  const [printBlockedUrl, setPrintBlockedUrl] = useState<string | null>(null);

  // Revoke any stale Blob URL on unmount or when a new attempt replaces it,
  // so we don't leak document-scoped object URLs.
  useEffect(() => {
    return () => {
      if (printBlockedUrl) URL.revokeObjectURL(printBlockedUrl);
    };
  }, [printBlockedUrl]);

  const handleDownload = async () => {
    if (!portfolio) return;
    const { generatePortfolioPrintHTML } = await import('@/lib/portfolioPrintLayout');
    const html = generatePortfolioPrintHTML(portfolio.profile, portfolio.resume);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      // Build a Blob URL the user can click manually — modern browsers allow
      // user-initiated anchor clicks even when pop-ups are blocked, so this
      // gives them a guaranteed path to the print page.
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPrintBlockedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      toast.error('Pop-up blocked — see the panel below for how to print.');
      return;
    }
    // Successful open clears any prior fallback panel.
    if (printBlockedUrl) {
      URL.revokeObjectURL(printBlockedUrl);
      setPrintBlockedUrl(null);
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('Print dialog will open — choose "Save as PDF" in your browser.');
  };

  // Show the password gate first (before loading skeleton) so the "Checking…"
  // spinner appears inside the gate UI rather than flashing the full skeleton.
  if (passwordRequired && !portfolio) {
    const accentColor = gateInfo?.accentColor || '#e84545';
    return (
      <PasswordGate
        accentColor={accentColor}
        onSubmit={(password) => {
          setPasswordError(false);
          setSubmittedPassword(password);
        }}
        hasError={passwordError}
        isChecking={contentLoading}
      />
    );
  }

  if (isLoading) return <PortfolioSkeleton />;

  // Password errors are caught by the gate condition above. Only surface NotFound
  // for real missing/disabled-portfolio errors (not wrong-password responses).
  if (error && (error as Error).message !== 'invalid_password') return <NotFound />;
  if (!portfolio) return <NotFound />;

  const { profile, resume } = portfolio;
  // If the owner configured a challenger theme AND this visitor is variant B,
  // swap in the challenger theme so we can measure which performs better.
  const effectiveStyle = (abVariant === 'b' && profile.abChallengerTheme)
    ? profile.abChallengerTheme
    : (profile.portfolioStyle || 'minimal');
  const pStyle = effectiveStyle;
  const pLayout = profile.portfolioLayout || 'single';
  const accentColor = profile.portfolioAccentColor || '#e84545';
  const pFont = profile.portfolioFont || 'inter';
  const sections = profile.portfolioSections;
  
  const show = (key: keyof PortfolioSections) => !sections || sections[key] !== false;

  const validExperience = resume.experience?.filter(e => (e.position?.trim() || e.company?.trim())) || [];
  const validEducation = resume.education?.filter(e => (e.institution?.trim() || e.degree?.trim())) || [];

  const allSkills = Array.from(new Set([
    ...(resume.skills || []).map(s => typeof s === 'string' ? s : (s as any).name),
    ...(resume.experience || []).flatMap(e => (e as any).skills || []),
    ...(resume.projects || []).flatMap(p => (p as any).skills || [])
  ])).filter(Boolean);

  const isTwoCol = (pLayout as string) === 'two-col' || (pLayout as string) === 'two-column';

  const themeVars = getThemeVars(pStyle, accentColor, pFont);
  const themeConfig = getThemeById(pStyle);
  const rootStyle: React.CSSProperties = {
    ...themeVars,
    fontFamily: 'var(--pf-body-font, Inter, system-ui, sans-serif)',
    '--pf-bg-alpha': hexToRgba(themeConfig?.colors.bg || '#0a0a14', 0.88),
    '--pf-success': '#22c55e',
    '--pf-warning': '#f59e0b',
  } as React.CSSProperties;

  const initials = profile.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const portfolioSummary = profile.portfolioSummary;
  const sectionOrder = profile.sectionOrder || undefined;
  const scrollEffect = (profile.scrollEffect as 'fade' | 'parallax' | 'tilt-3d' | 'cinematic') || 'fade';
  const videoIntroUrl = profile.videoIntroUrl || null;
  const schedulingUrl = profile.schedulingUrl || null;
  const primaryLang = profile.portfolioPrimaryLanguage || 'English';
  const secondaryLang = profile.portfolioSecondaryLanguage || '';
  const hasTranslation = secondaryLang && profile.portfolioTranslations && !!profile.portfolioTranslations[secondaryLang];

  // Navigation Highlights
  const highlights = profile.highlights || [];

  const NAV_SECTION_MAP: Record<string, { id: string; label: string; check: boolean }> = {
    experience: { id: 'section-experience', label: 'Experience', check: show('experience') && validExperience.length > 0 },
    projects: { id: 'section-projects', label: 'Projects', check: show('projects') && (resume.projects?.length ?? 0) > 0 },
    skills: { id: 'section-skills', label: 'Skills', check: show('skills') && (resume.skills?.length ?? 0) > 0 },
    education: { id: 'section-education', label: 'Education', check: show('education') && validEducation.length > 0 },
  };

  const NAV_DEFAULT_ORDER = ['experience', 'projects', 'skills', 'education'];
  const navOrder = sectionOrder && sectionOrder.length > 0
    ? [...sectionOrder.filter(k => k in NAV_SECTION_MAP), ...NAV_DEFAULT_ORDER.filter(k => !sectionOrder.includes(k))]
    : NAV_DEFAULT_ORDER;
  const navSections = navOrder
    .map(k => NAV_SECTION_MAP[k])
    .filter(s => s && s.check)
    .map(s => ({ id: s.id, label: s.label }));

  return (
    <div className={`relative z-[1] pf-theme pf-theme-${pStyle} min-h-screen text-[--pf-fg] selection:bg-[--pf-accent] selection:text-white pb-safe overflow-x-hidden max-w-full`} style={rootStyle}>
      <a
        href="#portfolio-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-semibold focus:bg-white focus:text-gray-900 focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>
      {user && (
        <div className="fixed top-4 left-4 z-50" data-pdf-exclude>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-black/60 backdrop-blur-sm text-white/90 hover:bg-black/80 active:scale-95 transition-all touch-manipulation min-h-[44px]"
            aria-label="Back to app"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </button>
        </div>
      )}
      <StickyHeader
        name={profile?.fullName || null}
        avatarUrl={profile?.avatarUrl || null}
        initials={initials}
        contactEmail={profile?.contactEmail || null}
        accentColor={accentColor}
        visible={stickyVisible}
        pStyle={pStyle}
      />

      <motion.div
        id="portfolio-content"
        className="max-w-4xl mx-auto min-h-screen relative w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div data-section="portfolio-hero">
        <PublicHero 
          ref={heroRef}
          profile={profile}
          resume={resume}
          pStyle={pStyle}
          accentColor={accentColor}
          initials={initials}
          liveLastActiveAt={liveLastActiveAt}
          allSkills={allSkills}
          videoIntroUrl={videoIntroUrl}
          schedulingUrl={schedulingUrl}
        />
        </div>

        {hasTranslation && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-4 pb-1"
            data-pdf-exclude
          >
            <button
              onClick={() => setActiveLanguage(lang => lang ? '' : secondaryLang)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-all active:scale-95"
              style={{
                borderColor: activeLanguage ? accentColor : 'var(--pf-border, rgba(255,255,255,0.15))',
                background: activeLanguage ? `color-mix(in srgb, ${accentColor} 12%, transparent)` : 'transparent',
                color: activeLanguage ? accentColor : 'var(--pf-muted, #9ca3af)',
              }}
            >
              <Languages className="w-3.5 h-3.5" />
              {activeLanguage
                ? `${secondaryLang} · Switch to ${primaryLang}`
                : `${primaryLang} · Switch to ${secondaryLang}`}
            </button>
          </motion.div>
        )}

        {/* Recruiter interest CTA — shown to all visitors (no login required) */}
        {(
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center pt-2 pb-1"
            data-pdf-exclude
          >
            <button
              onClick={handleInterest}
              disabled={interestSent || sendingInterest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-70 disabled:cursor-default hover:scale-105"
              data-track="portfolio-interested"
              style={{
                background: interestSent
                  ? 'color-mix(in srgb, var(--pf-success) 15%, transparent)'
                  : `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                border: `1px solid ${interestSent ? 'color-mix(in srgb, var(--pf-success) 35%, transparent)' : `color-mix(in srgb, ${accentColor} 35%, transparent)`}`,
                color: interestSent ? 'var(--pf-success)' : accentColor,
              }}
            >
              {sendingInterest ? (
                <MiniSpinner size={14} />
              ) : interestSent ? (
                <Check className="w-4 h-4" />
              ) : (
                <Heart className="w-4 h-4" />
              )}
              {interestSent ? 'Interest sent!' : "I'm Interested"}
            </button>
          </motion.div>
        )}

        <Suspense fallback={<SectionsSkeleton />}>
          <div data-section="portfolio-sections">
          <PublicSections 
            profile={profile}
            resume={resume}
            pStyle={pStyle}
            accentColor={accentColor}
            isTwoCol={isTwoCol}
            navSections={navSections}
            highlights={highlights}
            allSkills={allSkills}
            portfolioSummary={activeLanguage && profile.portfolioTranslations?.[activeLanguage]?.portfolioSummary
              ? profile.portfolioTranslations[activeLanguage].portfolioSummary
              : portfolioSummary}
            sectionOrder={sectionOrder}
            scrollEffect={scrollEffect}
            videoIntroUrl={videoIntroUrl}
            activeLanguage={activeLanguage || undefined}
          />
          </div>
        </Suspense>

        {/* Contact Form */}
        {profile.contactFormEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="px-4 pb-6 max-w-xl mx-auto w-full"
            data-pdf-exclude
          >
            <Suspense fallback={null}>
              <PortfolioContactForm
                username={username!}
                accentColor={accentColor}
                ownerName={profile.fullName}
              />
            </Suspense>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div variants={fadeUp} className="text-center py-10 border-t space-y-3" style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' }}>
          <button
            onClick={handleDownload}
            aria-label="Print / Save as PDF"
            className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80 min-h-[44px] px-4"
            style={{ color: 'var(--pf-muted, #9ca3af)' }}
            data-pdf-exclude
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>

          {printBlockedUrl && (
            <div
              role="alert"
              data-pdf-exclude
              className="mx-auto max-w-md text-left rounded-xl border p-4 space-y-2"
              style={{
                background: 'var(--pf-card, rgba(255,255,255,0.04))',
                borderColor: 'var(--pf-border, rgba(255,255,255,0.12))',
              }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
                Pop-ups are blocked
              </p>
              <p className="text-[11px]" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                Your browser blocked the print window. You can either allow pop-ups for this
                site (look for a small icon at the right edge of the address bar) and click
                Print again, or open the print page directly with this link:
              </p>
              <a
                href={printBlockedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs underline decoration-1 underline-offset-2"
                style={{ color: accentColor }}
              >
                <Printer className="w-3.5 h-3.5" />
                Open print page in new tab
              </a>
              <p className="text-[10px]" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                Then choose <em>Print → Save as PDF</em> in your browser's print dialog.
              </p>
            </div>
          )}
          <div>
            <a
              href="https://resume.thewise.cloud/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80 underline decoration-1 underline-offset-2 cursor-pointer"
              style={{ color: 'var(--pf-muted, #9ca3af)' }}
            >
              Built with <span className="font-bold" style={{ color: accentColor }}>WiseResume</span> · Create your free portfolio →
            </a>
          </div>
        </motion.div>
      </motion.div>

      <Suspense fallback={null}>
        <ChatWidget
          profile={profile}
          resume={resume}
          accentColor={accentColor}
          pStyle={pStyle}
        />
      </Suspense>
    </div>
  );
}

export default function PublicPortfolioPage({ usernameOverride }: { usernameOverride?: string } = {}) {
  return (
    <ErrorBoundary>
      <PublicPortfolioContent usernameOverride={usernameOverride} />
    </ErrorBoundary>
  );
}

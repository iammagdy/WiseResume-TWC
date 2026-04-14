import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { usePublicPortfolio } from '@/hooks/usePublicPortfolio';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ArrowLeft, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useEffect, useState, useMemo, Suspense } from 'react';
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

// Lazy load below-the-fold heavy sections
const PublicSections = lazyWithRetry(() => import('@/components/portfolio/public/PublicSections').then(m => ({ default: m.PublicSections })));

// Lazy-loaded ChatWidget
const ChatWidget = lazyWithRetry(() => import('@/components/portfolio/public/ChatWidget').then(m => ({ default: m.ChatWidget })));

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
    <div className="min-h-screen bg-[--pf-bg,#0a0a0f] p-6 space-y-6 max-w-4xl mx-auto">
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

// ─── Not Found ────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <SearchX className="w-16 h-16 mx-auto mb-4 text-white/60" />
        <h1 className="text-3xl font-bold text-white">Portfolio Not Found</h1>
        <p className="text-white/60">This portfolio doesn't exist or isn't public yet.</p>
        <a href={window.location.origin} className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#e84545] text-white rounded-full font-medium text-sm hover:bg-[#e84545]/90 transition-colors">
          Create your free portfolio with WiseResume →
        </a>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function PublicPortfolioContent() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref') || undefined;
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: portfolio, isLoading, error } = usePublicPortfolio(username);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [nearFooter, setNearFooter] = useState(false);

  // Extracted hooks
  usePortfolioSEO(portfolio?.profile);
  const { stickyVisible, heroRef } = usePortfolioTracking({ username, refParam });

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

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const portfolioEl = document.getElementById('portfolio-content');
      if (!portfolioEl) throw new Error('Content not found');

      const [{ captureWithRetry }, { PDFDocument }] = await Promise.all([
        import('@/lib/html2canvasRetry'),
        import('pdf-lib').then(m => ({ PDFDocument: m.PDFDocument })),
      ]);

      // @ts-ignore - Vite inline CSS import
      const printSafeMod = await import('@/styles/print-safe.css?inline').catch(() => ({ default: '' }));
      const printSafeCss = printSafeMod.default;

      const canvas = await captureWithRetry(portfolioEl, {
        scale: 1.5,
        foreignObjectRendering: false,
        ignoreElements: (el: Element) => el.hasAttribute('data-pdf-exclude'),
        onclone: (doc: Document) => {
          const clonedEl = doc.getElementById('portfolio-content');
          if (clonedEl) clonedEl.setAttribute('data-pdf-force-layout', 'true');
          
          if (printSafeCss) {
            const style = doc.createElement('style');
            style.innerHTML = printSafeCss;
            doc.head.appendChild(style);
          }
        }
      });

      const pdfDoc = await PDFDocument.create();
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
      const img = await pdfDoc.embedJpg(imgBytes);

      const pageWidth = 595;
      const pageHeight = Math.round((canvas.height / canvas.width) * pageWidth);
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const { downloadFile } = await import('@/lib/downloadUtils');
      const name = portfolio?.profile?.fullName?.replace(/\s+/g, '_') || 'Portfolio';
      await downloadFile({ blob, fileName: `${name}_Portfolio.pdf` });
      toast.success('Portfolio saved as PDF!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF generation failed';
      toast.error(msg, { action: { label: 'Retry', onClick: () => handleDownload() } });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <PortfolioSkeleton />;
  if (error || !portfolio) return <NotFound />;

  const { profile, resume } = portfolio;
  const pStyle = profile.portfolioStyle || 'minimal';
  const pLayout = profile.portfolioLayout || 'single';
  const accentColor = profile.portfolioAccentColor || '#e84545';
  const pFont = profile.portfolioFont || 'inter';
  const sections = profile.portfolioSections;
  
  const show = (key: string) => !sections || (sections as unknown as Record<string, boolean>)[key] !== false;

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
  } as React.CSSProperties;

  const initials = profile.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const portfolioSummary = profile.portfolioSummary;
  const sectionOrder = profile.sectionOrder || undefined;
  const scrollEffect = (profile.scrollEffect as 'fade' | 'parallax' | 'tilt-3d' | 'cinematic') || 'fade';

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
    <div className={`pf-theme pf-theme-${pStyle} min-h-screen text-[--pf-fg] selection:bg-[--pf-accent] selection:text-white pb-safe overflow-x-hidden max-w-full`} style={rootStyle}>
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
        className="max-w-4xl mx-auto min-h-screen relative overflow-x-hidden w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <PublicHero 
          ref={heroRef}
          profile={profile}
          resume={resume}
          pStyle={pStyle}
          accentColor={accentColor}
          initials={initials}
          liveLastActiveAt={liveLastActiveAt}
          allSkills={allSkills}
        />

        <Suspense fallback={<PortfolioSkeleton />}>
          <PublicSections 
            profile={profile}
            resume={resume}
            pStyle={pStyle}
            accentColor={accentColor}
            isTwoCol={isTwoCol}
            navSections={navSections}
            highlights={highlights}
            allSkills={allSkills}
            portfolioSummary={portfolioSummary}
            sectionOrder={sectionOrder}
            scrollEffect={scrollEffect}
          />
        </Suspense>

        {/* Footer */}
        <motion.div variants={fadeUp} className="text-center py-10 border-t space-y-3" style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' }}>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
            style={{ color: 'var(--pf-muted, #9ca3af)' }}
            data-pdf-exclude
          >
            {isDownloading ? <MiniSpinner size={14} /> : <Download className="w-3.5 h-3.5" />}
            {isDownloading ? 'Saving…' : 'Save as PDF'}
          </button>
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

export default function PublicPortfolioPage() {
  return (
    <ErrorBoundary>
      <PublicPortfolioContent />
    </ErrorBoundary>
  );
}

import { useParams, useSearchParams } from 'react-router-dom';
import { EDGE_FUNCTIONS_URL } from '@/lib/supabaseConstants';
import { usePublicPortfolio } from '@/hooks/usePublicPortfolio';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Linkedin, Briefcase, GraduationCap, Award, FolderOpen,
  Github, Globe, Mail, X, Download, ExternalLink,
  Wrench, Layers, Sparkles, BookOpen, Heart, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';
// CareerCardSheet removed from public page — it's a creator tool, not visitor tool
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Extracted components
import { TypewriterText, buildTypewriterPhrases } from '@/components/portfolio/public/TypewriterText';
import { BioReveal } from '@/components/portfolio/public/BioReveal';
import { StickyHeader } from '@/components/portfolio/public/StickyHeader';
import { SectionHeader } from '@/components/portfolio/public/SectionHeader';
import { StatsStrip } from '@/components/portfolio/public/StatsStrip';
import { HighlightsStrip } from '@/components/portfolio/public/HighlightsStrip';
import { SectionNav } from '@/components/portfolio/public/SectionNav';
import { SkillCloud, SKILL_CLOUD_LIMIT } from '@/components/portfolio/public/SkillCloud';
import { ExperienceCard } from '@/components/portfolio/public/cards/ExperienceCard';
import { EducationCard } from '@/components/portfolio/public/cards/EducationCard';
import { ProjectCard } from '@/components/portfolio/public/cards/ProjectCard';
import { CaseStudyCard } from '@/components/portfolio/public/cards/CaseStudyCard';
import { ServiceCard } from '@/components/portfolio/public/cards/ServiceCard';
import { TestimonialCard } from '@/components/portfolio/public/cards/TestimonialCard';
import type { Testimonial } from '@/components/portfolio/public/cards/TestimonialCard';
import { GitHubProjectsSection } from '@/components/portfolio/GitHubProjectsSection';
import type { Highlight } from '@/components/portfolio/public/HighlightsStrip';
import { useActiveStatus, isActiveWithin24h } from '@/hooks/useActiveStatus';

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

// ─── Motion variants (theme-adaptive) ──────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};
const bioFade = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const } },
};

// Theme-specific motion variants
function getThemeItemVariant(style: string) {
  switch (style) {
    case 'developer-terminal':
      return {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
      };
    case 'neon-cyber':
      return {
        hidden: { opacity: 0, scale: 0.92 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
      };
    case 'creative-spotlight':
      return {
        hidden: { opacity: 0, x: 40 },
        visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
      };
    case 'executive-suite':
      return {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
      };
    case 'freelancer-starter':
      return {
        hidden: { opacity: 0, scale: 0.85 },
        visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 15 } },
      };
    default:
      return fadeUp;
  }
}

function getThemeSectionVariant(style: string) {
  switch (style) {
    case 'developer-terminal':
      return {
        hidden: { opacity: 0, x: -30 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, staggerChildren: 0.1 } },
      };
    case 'neon-cyber':
      return {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const, staggerChildren: 0.08 } },
      };
    case 'creative-spotlight':
      return {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 180, damping: 22, staggerChildren: 0.1 } },
      };
    case 'executive-suite':
      return {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, staggerChildren: 0.12 } },
      };
    case 'freelancer-starter':
      return {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 250, damping: 18, staggerChildren: 0.08 } },
      };
    default:
      return stagger;
  }
}

// Theme-aware generic card helper for About, Certifications, Awards, Publications, Volunteering
function getGenericCardProps(style: string): { className: string; style: React.CSSProperties } {
  switch (style) {
    case 'developer-terminal':
      return { className: 'pf-terminal-card', style: {} };
    case 'neon-cyber':
      return { className: 'pf-neon-card', style: {} };
    case 'creative-spotlight':
      return { className: 'pf-spotlight-card', style: {} };
    case 'executive-suite':
      return { className: 'pf-executive-card', style: {} };
    case 'freelancer-starter':
      return { className: 'pf-starter-card', style: {} };
    case 'classic-clean':
      return { className: '', style: { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' } };
    case 'bold-dark':
      return { className: 'rounded-xl p-4', style: { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 20%, transparent)' } };
    case 'glass-pro':
      return { className: 'rounded-xl p-4 backdrop-blur-sm', style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' } };
    default:
      return { className: 'p-4 rounded-xl', style: { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))' } };
  }
}

const LIGHT_THEMES = ['classic-clean', 'executive-suite', 'creative-spotlight', 'freelancer-starter'];

// ─── Theme CSS injection ───────────────────────────────────────────────────────
import { getThemeById, buildThemeCSSVars } from '@/lib/portfolioThemes';

function getThemeVars(style: string, accentColor: string | null, font: string): React.CSSProperties {
  // Try theme registry first
  const theme = getThemeById(style);
  if (theme) {
    return buildThemeCSSVars(theme, accentColor);
  }

  // Fallback for legacy styles
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
        <div className="text-6xl mb-4">🔍</div>
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
  const ref = searchParams.get('ref') || undefined;

  const { data: portfolio, isLoading, error } = usePublicPortfolio(username);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMoreSkills, setShowMoreSkills] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [nearFooter, setNearFooter] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const contactHref = useMemo(() => {
    if (portfolio?.profile?.contactEmail) return `mailto:${portfolio.profile.contactEmail}`;
    if (portfolio?.profile?.linkedinUrl) return portfolio.profile.linkedinUrl;
    return null;
  }, [portfolio?.profile?.contactEmail, portfolio?.profile?.linkedinUrl]);
  const contactIsExternal = !contactHref?.startsWith('mailto:');

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onScroll = () => {
      setNearFooter(window.scrollY + window.innerHeight >= document.body.scrollHeight - 200);
      const max = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
      if (!prefersReduced) {
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

  // Track visited sections via single shared IntersectionObserver
  const sectionsViewedRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());
  const trackSentRef = useRef(false);

  const sendTrackingBeacon = useCallback(() => {
    if (trackSentRef.current) return;
    if (!portfolio?.profile?.username) return;
    trackSentRef.current = true;
    const timeSpentSeconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
    const body = JSON.stringify({
      username: portfolio.profile.username,
      ref,
      sectionsViewed: [...sectionsViewedRef.current],
      timeSpentSeconds,
    });
    const url = `${SUPABASE_URL}/functions/v1/track-portfolio-view`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  }, [portfolio, ref]);

  // Send beacon on page hide / visibility change (removed 30s timer)
  useEffect(() => {
    const onHide = () => sendTrackingBeacon();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      sendTrackingBeacon();
    };
  }, [sendTrackingBeacon]);

  // Section scroll tracking via single IntersectionObserver
  useEffect(() => {
    if (!portfolio) return;
    const sectionNames = ['experience', 'education', 'skills', 'projects', 'github', 'certifications', 'awards', 'publications', 'volunteering', 'case-studies', 'services'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const name = entry.target.id.replace('section-', '');
            sectionsViewedRef.current.add(name);
          }
        }
      },
      { threshold: 0.3 }
    );
    sectionNames.forEach(name => {
      const el = document.getElementById(`section-${name}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [portfolio]);

  // Sticky header observer
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [portfolio]);

  // SEO / theme
  useEffect(() => {
    if (portfolio?.profile) {
      const { profile } = portfolio;
      const name = profile.fullName || profile.username;
      document.title = profile.metaTitle || (profile.jobTitle ? `${name} — ${profile.jobTitle}` : name);

      if (profile.theme) {
        document.documentElement.setAttribute("data-theme", profile.theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }

      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', profile.metaDescription || profile.portfolioBio || `${name}'s professional portfolio`);

      const setMeta = (prop: string, val: string, attr = 'property') => {
        let el = document.querySelector(`meta[${attr}="${prop}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
        el.setAttribute('content', val);
      };
      const ogTitle = profile.metaTitle || (profile.jobTitle ? `${name} — ${profile.jobTitle}` : `${name}'s Portfolio`);
      const ogDesc = profile.metaDescription || profile.portfolioBio || `${name}'s professional portfolio`;
      const ogImageUrl = `${SUPABASE_URL}/functions/v1/og-image?username=${encodeURIComponent(profile.username)}`;
      setMeta('og:title', ogTitle);
      setMeta('og:description', ogDesc);
      setMeta('og:type', 'profile');
      setMeta('og:image', ogImageUrl);
      setMeta('og:image:width', '1200');
      setMeta('og:image:height', '630');
      setMeta('twitter:card', 'summary_large_image', 'name');
      setMeta('twitter:title', ogTitle, 'name');
      setMeta('twitter:description', ogDesc, 'name');
      setMeta('twitter:image', ogImageUrl, 'name');
      // Load Google Fonts for premium themes
      const pStyle = profile.portfolioStyle || 'minimal';
      const needsFiraCode = pStyle === 'developer-terminal' || pStyle === 'neon-cyber';
      const needsSpaceGrotesk = pStyle === 'creative-spotlight' || pStyle === 'neon-cyber';
      const fontFamilies: string[] = [];
      if (needsFiraCode) fontFamilies.push('Fira+Code:wght@400;600;700');
      if (needsSpaceGrotesk) fontFamilies.push('Space+Grotesk:wght@400;500;600;700');
      if (fontFamilies.length > 0) {
        const linkId = 'pf-theme-fonts';
        let link = document.getElementById(linkId) as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?${fontFamilies.map(f => `family=${f}`).join('&')}&display=swap`;
      }
    }
    return () => {
      document.title = 'WiseResume';
      document.documentElement.removeAttribute("data-theme");
      const fontLink = document.getElementById('pf-theme-fonts');
      if (fontLink) fontLink.remove();
    };
  }, [portfolio]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const portfolioEl = document.getElementById('portfolio-content');
      if (!portfolioEl) throw new Error('Content not found');

      const [{ captureWithRetry }, { PDFDocument }] = await Promise.all([
        import('@/lib/html2canvasRetry'),
        import('pdf-lib').then(m => ({ PDFDocument: m.PDFDocument })),
      ]);

      const canvas = await captureWithRetry(portfolioEl, {
        scale: 1.5,
        foreignObjectRendering: false,
        ignoreElements: (el: Element) => el.hasAttribute('data-pdf-exclude'),
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
  const initials = profile.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const show = (key: string) => !sections || (sections as unknown as Record<string, boolean>)[key] !== false;

  // Filter out "ghost" entries where key fields are all empty
  const validExperience = resume.experience?.filter(
    e => (e.position?.trim() || e.company?.trim())
  ) || [];
  const validEducation = resume.education?.filter(
    e => (e.institution?.trim() || e.degree?.trim())
  ) || [];

  const hasExperience = show('experience') && validExperience.length > 0;
  const hasEducation = show('education') && validEducation.length > 0;
  const hasSkills = show('skills') && resume.skills?.length > 0;
  const hasProjects = show('projects') && resume.projects?.length > 0;
  const hasCerts = show('certifications') && resume.certifications?.length > 0;
  const hasAwards = show('awards') && resume.awards?.length > 0;
  const hasPublications = show('publications') && resume.publications?.length > 0;
  const hasVolunteering = show('volunteering') && resume.volunteering?.length > 0;
  const hasGithubProjects = show('githubProjects') && profile.githubProjectsCache?.length > 0;
  const hasCaseStudies = profile.caseStudies?.length > 0;
  const hasServices = profile.services?.length > 0;
  const hasTestimonials = (profile as unknown as Record<string, unknown>).testimonials && ((profile as unknown as Record<string, unknown>).testimonials as Testimonial[])?.length > 0;
  const testimonials = ((profile as unknown as Record<string, unknown>).testimonials as Testimonial[]) || [];
  const highlights = ((profile as unknown as Record<string, unknown>).highlights as Highlight[]) || [];

  const themeVars = getThemeVars(pStyle, accentColor, pFont);

  // Use theme registry for root style vars
  const themeConfig = getThemeById(pStyle);
  const rootStyle: React.CSSProperties = {
    ...themeVars,
    fontFamily: 'var(--pf-body-font, Inter, system-ui, sans-serif)',
    '--pf-bg-alpha': hexToRgba(themeConfig?.colors.bg || '#0a0a14', 0.88),
  } as React.CSSProperties;

  const heroBg: React.CSSProperties = pStyle === 'developer-terminal'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 8%, #1a1b26), #1a1b26 70%)` }
    : pStyle === 'creative-spotlight'
    ? { background: `radial-gradient(ellipse 120% 80% at 30% -10%, color-mix(in srgb, ${accentColor} 18%, transparent), transparent 60%), radial-gradient(ellipse 80% 60% at 80% 20%, rgba(168,85,247,0.08), transparent)` }
    : pStyle === 'executive-suite'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 4%, #ffffff), #ffffff 50%)` }
    : pStyle === 'freelancer-starter'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 6%, #ffffff), #ffffff 60%)` }
    : pStyle === 'neon-cyber'
    ? { background: `radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, ${accentColor} 20%, transparent), transparent)` }
    : pStyle === 'bold-dark'
    ? { background: `radial-gradient(ellipse 90% 50% at 50% 0%, color-mix(in srgb, ${accentColor} 22%, transparent), transparent)` }
    : pStyle === 'glass-pro'
    ? { background: `radial-gradient(ellipse 90% 60% at 50% -5%, color-mix(in srgb, ${accentColor} 16%, transparent), transparent)` }
    : pStyle === 'classic-clean'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 6%, #ffffff), #ffffff 60%)` }
    : { background: `radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in srgb, ${accentColor} 14%, transparent), transparent)` };

  // Hero alignment from theme config
  const heroAlign = themeConfig?.layout.heroAlign || 'center';
  const isSplitHero = heroAlign === 'split';
  const heroAlignClass = heroAlign === 'left' ? 'items-start text-left'
    : isSplitHero ? 'items-center text-center md:flex-row md:items-center md:text-left md:gap-12'
    : 'items-center text-center';
  const heroJustify = heroAlign === 'center' ? 'justify-center' : 'justify-center md:justify-start';

  const isTwoCol = pLayout === 'two-col';

  const allSkills = resume.skills.map((s) => typeof s === 'string' ? s : (s as Record<string, string>).name || String(s));
  const hasMoreSkills = allSkills.length > SKILL_CLOUD_LIMIT;

  // Build nav sections including certifications, awards, publications, volunteering
  const navSections = [
    ...(profile.portfolioBio ? [{ id: 'section-about', label: 'About' }] : []),
    ...(hasExperience ? [{ id: 'section-experience', label: 'Experience' }] : []),
    ...(hasSkills ? [{ id: 'section-skills', label: 'Skills' }] : []),
    ...(hasEducation ? [{ id: 'section-education', label: 'Education' }] : []),
    ...(hasProjects ? [{ id: 'section-projects', label: 'Projects' }] : []),
    ...(hasGithubProjects ? [{ id: 'section-github', label: 'GitHub' }] : []),
    ...(hasCaseStudies ? [{ id: 'section-case-studies', label: 'Case Studies' }] : []),
    ...(hasServices ? [{ id: 'section-services', label: 'Services' }] : []),
    ...(hasTestimonials ? [{ id: 'section-testimonials', label: 'Testimonials' }] : []),
    ...(hasCerts ? [{ id: 'section-certifications', label: 'Certifications' }] : []),
    ...(hasAwards ? [{ id: 'section-awards', label: 'Awards' }] : []),
    ...(hasPublications ? [{ id: 'section-publications', label: 'Publications' }] : []),
    ...(hasVolunteering ? [{ id: 'section-volunteering', label: 'Volunteering' }] : []),
  ];

  return (
    <div
      id="portfolio-content"
      className={`min-h-screen overflow-y-auto ${pStyle === 'neon-cyber' ? 'pf-neon-scanline' : ''}`}
      style={{ ...rootStyle, backgroundColor: 'var(--pf-bg, #0a0a14)', color: 'var(--pf-fg, #f5f5ff)' }}
      data-portfolio-style={pStyle}
    >
      <StickyHeader
        name={profile.fullName}
        avatarUrl={profile.avatarUrl}
        initials={initials}
        contactEmail={profile.contactEmail}
        accentColor={accentColor}
        visible={stickyVisible}
        pStyle={pStyle}
      />

      {/* Scroll progress bar */}
      {stickyVisible && scrollProgress > 0 && (
        <div
          className="fixed left-0 right-0 h-[3px] z-50 pointer-events-none"
          style={{ top: '48px' }}
        >
          <div
            className="h-full transition-[width] duration-75 ease-out"
            style={{ width: `${scrollProgress}%`, backgroundColor: accentColor }}
          />
        </div>
      )}

      {/* Scroll-to-top removed — sticky header handles navigation */}

      <motion.div
        className="max-w-4xl mx-auto px-4 py-0"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <motion.div
          ref={heroRef}
          variants={fadeUp}
          className={`relative flex flex-col ${heroAlignClass} pt-16 pb-12 px-4 ${isSplitHero ? 'md:flex-row md:flex-wrap' : ''}`}
          style={heroBg}
        >
          {pStyle !== 'classic-clean' && (
            <div className="pf-hero-ambient rounded-2xl" aria-hidden="true" />
          )}

          {/* Avatar — animated gradient ring */}
          <div className="relative mb-6">
            <div
              className="pf-avatar-ring"
              style={{ background: `conic-gradient(${accentColor}, transparent, ${accentColor})` }}
            />
            <Avatar className="h-36 w-36 relative z-10 border-[3px]" style={{ borderColor: accentColor }}>
              <AvatarFallback
                className="text-4xl font-black"
                style={{ background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 60%, purple))`, color: '#fff' }}
              >
                {initials}
              </AvatarFallback>
              <AvatarImage src={profile.avatarUrl || undefined} />
            </Avatar>
          </div>

          <h1 className="relative z-[1] text-5xl md:text-6xl font-black leading-tight mb-3" style={{ fontFamily: 'var(--pf-heading-font)' }}>
            {profile.fullName || 'Anonymous'}
          </h1>

          {(() => {
            const nameLen = (profile.fullName || 'Anonymous').length;
            const badgeDelay = nameLen * 35 + 200 + 100;
            const locationDelay = badgeDelay + 200;
            const ctaBaseDelay = badgeDelay + 150;
            let ctaIdx = 0;
            return (<>
          <div className={`flex items-center ${heroJustify} gap-2.5 flex-wrap mb-3 pf-badge-entrance`} style={{ animationDelay: `${badgeDelay}ms` }}>
            {profile.jobTitle && (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, color: accentColor, border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)` }}>
                {profile.jobTitle}
              </span>
            )}
            {profile.openToWork && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                Open to Work
              </span>
            )}
          </div>

          {profile.openToWork && isActiveWithin24h(liveLastActiveAt) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
              style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
              </span>
              Active today — responds within 24h
            </motion.div>
          )}

          {profile.availabilityHeadline && (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{
                background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
              }}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
              <span className="text-xs font-medium" style={{
                color: accentColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {profile.availabilityHeadline}
              </span>
            </div>
          )}

          <div className={`flex items-center ${heroJustify} gap-3 mb-3 flex-wrap pf-fade-entrance`} style={{ animationDelay: `${locationDelay}ms` }}>
            {profile.location && (
              <span className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                <MapPin className="w-3.5 h-3.5" />{profile.location}
              </span>
            )}
            {profile.industry && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{
                background: 'var(--pf-card, rgba(255,255,255,0.06))',
                border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
                color: 'var(--pf-muted, #9ca3af)',
              }}>
                {profile.industry}
              </span>
            )}
          </div>

          <div className="pf-fade-entrance" style={{ animationDelay: `${locationDelay}ms` }}>
            {(() => {
              const phrases = buildTypewriterPhrases(profile, allSkills);
              return phrases.length > 0 ? <TypewriterText phrases={phrases} accentColor={accentColor} /> : null;
            })()}
          </div>

          {(profile.linkedinUrl || profile.githubUrl || profile.websiteUrl || profile.twitterUrl) && (
            <div className={`flex items-center ${heroJustify} gap-2 mb-6`}>
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="LinkedIn">
                  <Linkedin className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="GitHub">
                  <Github className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="Website">
                  <Globe className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.twitterUrl && (
                <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="X / Twitter">
                  <X className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
            </div>
          )}

          <div className={`flex items-center ${heroJustify} gap-3 flex-wrap`}>
            {profile.contactEmail && (
              <a
                href={`mailto:${profile.contactEmail}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg pf-cta-entrance"
                style={{ background: accentColor, color: '#fff', boxShadow: `0 4px 20px -4px ${accentColor}60`, animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
              >
                <Mail className="w-4 h-4" /> Get in Touch
              </a>
            )}
          </div>
            </>);
          })()}
        </motion.div>

        <StatsStrip experience={resume.experience} skillCount={allSkills.length} accentColor={accentColor} />

        {highlights.length > 0 && (
          <HighlightsStrip highlights={highlights} accentColor={accentColor} />
        )}

        <SectionNav sections={navSections} accentColor={accentColor} pStyle={pStyle} />

        {/* ── Body content ─────────────────────────────────────────────── */}
        <div className={`px-2 pb-20 pt-10 ${isTwoCol ? 'md:grid md:grid-cols-5 md:gap-10' : 'space-y-10'}`}>

          <div className={isTwoCol ? 'md:col-span-3 space-y-10' : 'space-y-10'}>

            {/* About */}
            {profile.portfolioBio && (
              <motion.section id="section-about" variants={bioFade} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
                <SectionHeader icon={<Briefcase className="w-5 h-5" />} title="About" style={pStyle} />
                {(() => {
                  const cardProps = getGenericCardProps(pStyle);
                  const isTerminal = pStyle === 'developer-terminal';
                  return (
                    <div className={`${cardProps.className} ${!cardProps.className.includes('p-') && !isTerminal ? 'p-5 rounded-2xl' : ''}`} style={cardProps.style}>
                      {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
                      <div className={isTerminal ? 'pf-terminal-card-body' : ''}>
                        <BioReveal bio={profile.portfolioBio} />
                      </div>
                    </div>
                  );
                })()}
              </motion.section>
            )}

            {/* Experience */}
            {hasExperience && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-experience">
                <SectionHeader icon={<Briefcase className="w-5 h-5" />} title="Experience" style={pStyle} />
                <div className="pf-timeline-container relative" ref={(node) => {
                  if (!node || node.dataset.observed) return;
                  node.dataset.observed = 'true';
                  const obs = new IntersectionObserver(([entry]) => {
                    if (entry.isIntersecting) {
                      node.classList.add('pf-timeline-drawn');
                      node.querySelectorAll('.pf-exp-card').forEach((card, idx) => {
                        (card as HTMLElement).style.animationDelay = `${idx * 100}ms`;
                        card.classList.add('pf-card-revealed');
                      });
                      node.querySelectorAll('.pf-timeline-dot').forEach((dot, idx) => {
                        (dot as HTMLElement).style.transitionDelay = `${idx * 100}ms`;
                        dot.classList.add('pf-dot-visible');
                      });
                      obs.disconnect();
                    }
                  }, { threshold: 0.15 });
                  obs.observe(node);
                }}>
                  <div className="pf-timeline-line" style={{ background: `linear-gradient(to bottom, ${accentColor}, transparent)` }} />
                  <div className="space-y-4 pl-11 md:pl-14">
                    {validExperience.map((exp, i) => (
                      <div key={exp.id || i} className="relative">
                        <div className="pf-timeline-dot" style={{ background: accentColor, borderColor: 'var(--pf-bg, #0a0a1a)' }} />
                        <div className="pf-timeline-connector" style={{ background: accentColor }} />
                        <ExperienceCard exp={exp} style={pStyle} isLast={i === resume.experience.length - 1} index={i} />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}

            {/* Case Studies */}
            {hasCaseStudies && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-case-studies">
                <SectionHeader icon={<Layers className="w-5 h-5" />} title="Case Studies" style={pStyle} />
                <div className="space-y-5">
                  {profile.caseStudies.map((cs) => (
                    <CaseStudyCard key={cs.id} cs={cs} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Projects */}
            {hasProjects && (
              <motion.section id="section-projects" variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
                <SectionHeader icon={<FolderOpen className="w-5 h-5" />} title="Projects" style={pStyle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resume.projects.map((p, i) => (
                    <ProjectCard key={p.id || i} project={p} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* GitHub Projects */}
            {hasGithubProjects && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-github">
                <SectionHeader icon={<Github className="w-5 h-5" />} title="GitHub Projects" style={pStyle} />
                <GitHubProjectsSection projects={profile.githubProjectsCache} accentColor={accentColor} style={pStyle} />
              </motion.section>
            )}

            {/* Services */}
            {hasServices && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-services">
                <SectionHeader icon={<Wrench className="w-5 h-5" />} title="Services" style={pStyle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.services.map((s) => (
                    <ServiceCard key={s.id} service={s} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Testimonials */}
            {hasTestimonials && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-testimonials">
                <SectionHeader icon={<Sparkles className="w-5 h-5" />} title="Testimonials" style={pStyle} />
                <div className="space-y-4">
                  {testimonials.map((t) => (
                    <TestimonialCard key={t.id} testimonial={t} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          <div className={isTwoCol ? 'md:col-span-2 space-y-10' : 'space-y-10'}>

            {/* Skills */}
            {hasSkills && (
              <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className={isTwoCol ? 'md:sticky md:top-8' : ''}
                id="section-skills"
              >
                <SectionHeader icon={<Award className="w-5 h-5" />} title="Skills" style={pStyle} />
                <SkillCloud
                  skills={allSkills}
                  experience={resume.experience}
                  projects={resume.projects}
                  pStyle={pStyle}
                  showMore={showMoreSkills}
                  onToggleMore={() => setShowMoreSkills(v => !v)}
                  hasMore={hasMoreSkills}
                  moreCount={allSkills.length - SKILL_CLOUD_LIMIT}
                />
              </motion.section>
            )}

            {/* Education */}
            {hasEducation && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-education">
                <SectionHeader icon={<GraduationCap className="w-5 h-5" />} title="Education" style={pStyle} />
                <div className="space-y-4" ref={(el) => {
                  if (!el || (el as HTMLElement & { __eduObserved?: boolean }).__eduObserved) return;
                  (el as HTMLElement & { __eduObserved?: boolean }).__eduObserved = true;
                  const observer = new IntersectionObserver(
                    ([entry]) => {
                      if (!entry.isIntersecting) return;
                      const cards = el.querySelectorAll('.pf-edu-card');
                      cards.forEach((card, i) => {
                        (card as HTMLElement).style.animationDelay = `${i * 120}ms`;
                        card.classList.add('pf-edu-revealed');
                      });
                      observer.disconnect();
                    },
                    { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
                  );
                  observer.observe(el);
                }}>
                  {validEducation.map((edu, i) => (
                    <EducationCard key={edu.id || i} edu={edu} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Certifications */}
            {hasCerts && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-certifications">
                <SectionHeader icon={<Award className="w-5 h-5" />} title="Certifications" style={pStyle} />
                <div className="space-y-3">
                  {resume.certifications.map((cert, i) => {
                    const cardProps = getGenericCardProps(pStyle);
                    const isTerminal = pStyle === 'developer-terminal';
                    return (
                      <motion.div key={cert.id || i} variants={getThemeItemVariant(pStyle)} className={cardProps.className} style={cardProps.style}>
                        {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
                        <div className={isTerminal ? 'pf-terminal-card-body' : ''}>
                          <h4 className="font-semibold text-sm" style={{ color: 'var(--pf-fg, inherit)' }}>{cert.name}</h4>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{cert.issuer} · {cert.date}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Awards */}
            {hasAwards && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-awards">
                <SectionHeader icon={<Trophy className="w-5 h-5" />} title="Awards" style={pStyle} />
                <div className="space-y-3">
                  {resume.awards.map((award, i) => {
                    const cardProps = getGenericCardProps(pStyle);
                    const isTerminal = pStyle === 'developer-terminal';
                    return (
                      <motion.div key={award.id || i} variants={getThemeItemVariant(pStyle)} className={cardProps.className} style={cardProps.style}>
                        {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
                        <div className={isTerminal ? 'pf-terminal-card-body' : ''}>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm" style={{ color: 'var(--pf-fg, inherit)' }}>{award.title}</h4>
                            {award.date && <span className="text-xs shrink-0" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{award.date}</span>}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--pf-accent)' }}>{award.issuer}</p>
                          {award.description && (
                            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{award.description}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Publications */}
            {hasPublications && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-publications">
                <SectionHeader icon={<BookOpen className="w-5 h-5" />} title="Publications" style={pStyle} />
                <div className="space-y-3">
                  {resume.publications.map((pub, i) => {
                    const cardProps = getGenericCardProps(pStyle);
                    const isTerminal = pStyle === 'developer-terminal';
                    return (
                      <motion.div key={pub.id || i} variants={getThemeItemVariant(pStyle)} className={cardProps.className} style={cardProps.style}>
                        {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
                        <div className={isTerminal ? 'pf-terminal-card-body' : ''}>
                          {pub.url ? (
                            <a href={pub.url} target="_blank" rel="noopener noreferrer"
                              className="font-semibold text-sm inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                              style={{ color: 'var(--pf-fg, inherit)' }}>
                              {pub.title}
                              <ExternalLink className="w-3 h-3" style={{ color: 'var(--pf-accent)' }} />
                            </a>
                          ) : (
                            <h4 className="font-semibold text-sm" style={{ color: 'var(--pf-fg, inherit)' }}>{pub.title}</h4>
                          )}
                          <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                            {pub.publisher}{pub.date ? ` · ${pub.date}` : ''}
                          </p>
                          {pub.description && (
                            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{pub.description}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Volunteering */}
            {hasVolunteering && (
              <motion.section variants={getThemeSectionVariant(pStyle)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} id="section-volunteering">
                <SectionHeader icon={<Heart className="w-5 h-5" />} title="Volunteering" style={pStyle} />
                <div className="space-y-3">
                  {resume.volunteering.map((vol, i) => {
                    const cardProps = getGenericCardProps(pStyle);
                    const isTerminal = pStyle === 'developer-terminal';
                    return (
                      <motion.div key={vol.id || i} variants={getThemeItemVariant(pStyle)} className={cardProps.className} style={cardProps.style}>
                        {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
                        <div className={isTerminal ? 'pf-terminal-card-body' : ''}>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm" style={{ color: 'var(--pf-fg, inherit)' }}>{vol.role}</h4>
                            <span className="text-xs shrink-0" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                              {vol.startDate} – {vol.endDate || 'Present'}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--pf-accent)' }}>{vol.organization}</p>
                          {vol.description && (
                            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{vol.description}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
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
              href={window.location.origin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--pf-muted, #9ca3af)' }}
            >
              Built with <span className="font-bold" style={{ color: accentColor }}>WiseResume</span> · Create your free portfolio →
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating Contact CTA removed — sticky header handles this */}

      {/* Lazy-loaded ChatWidget — only renders when FAB is clicked */}
      <Suspense fallback={null}>
        <ChatWidget
          profile={profile}
          resume={resume}
          accentColor={accentColor}
          pStyle={pStyle}
        />
      </Suspense>

      {/* CareerCardSheet removed from public page */}
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

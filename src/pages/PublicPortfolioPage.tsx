import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { usePublicPortfolio, PublicResume, PublicProfile } from '@/hooks/usePublicPortfolio';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Linkedin, Briefcase, GraduationCap, Award, FolderOpen,
  Github, Globe, Mail, X, Download, ExternalLink, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { toast } from 'sonner';
import { templateComponents } from '@/components/editor/TemplateThumbnail';
import type { Experience, Education, Project, Certification, ResumeData, TemplateId } from '@/types/resume';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Theme CSS injection ───────────────────────────────────────────────────────
function getThemeVars(style: string, accentColor: string | null, font: string): React.CSSProperties {
  const accent = accentColor || '#e84545';
  const fontFamilies: Record<string, string> = {
    'inter': 'Inter, system-ui, sans-serif',
    'space-grotesk': '"Space Grotesk", Inter, system-ui, sans-serif',
    'serif': 'Georgia, "Times New Roman", serif',
  };
  const headingFont = fontFamilies[font] || fontFamilies['inter'];

  const base: React.CSSProperties = {
    '--pf-accent': accent,
    '--pf-heading-font': headingFont,
    '--pf-body-font': font === 'serif' ? headingFont : (fontFamilies['inter']),
  } as React.CSSProperties;

  return base;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-[--pf-bg,#0a0a0f] p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-4 pt-12">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
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
        <a href="https://wiseresume.lovable.app" className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#e84545] text-white rounded-full font-medium text-sm hover:bg-[#e84545]/90 transition-colors">
          Create your free portfolio with WiseResume →
        </a>
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, style }: { icon: React.ReactNode; title: string; style: string }) {
  if (style === 'classic-clean') {
    return (
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-7 rounded-full" style={{ backgroundColor: 'var(--pf-accent)' }} />
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{title}</h2>
      </div>
    );
  }
  if (style === 'bold-dark') {
    return (
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[var(--pf-accent)] opacity-80">{icon}</span>
        <h2 className="text-xl font-black tracking-tight" style={{
          fontFamily: 'var(--pf-heading-font)',
          background: `linear-gradient(135deg, var(--pf-accent), color-mix(in srgb, var(--pf-accent) 60%, white))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>{title}</h2>
      </div>
    );
  }
  // minimal & glass-pro
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="opacity-60" style={{ color: 'var(--pf-accent)' }}>{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ background: 'var(--pf-border, rgba(255,255,255,0.08))' }} />
    </div>
  );
}

// ─── Experience Card ──────────────────────────────────────────────────────────
function ExperienceCard({ exp, style }: { exp: Experience; style: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasLongContent = (exp.description?.length ?? 0) > 200 || (exp.achievements?.length ?? 0) > 3;

  const cardClass = style === 'bold-dark'
    ? 'rounded-2xl p-5 space-y-3 border transition-all'
    : style === 'glass-pro'
    ? 'rounded-2xl p-5 space-y-3 backdrop-blur-sm'
    : style === 'classic-clean'
    ? 'rounded-none border-l-2 pl-5 py-3 space-y-2'
    : 'rounded-2xl p-5 space-y-3 border';

  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', borderColor: 'color-mix(in srgb, var(--pf-accent) 30%, transparent)' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
    : style === 'classic-clean'
    ? { borderLeftColor: 'var(--pf-accent)' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' };

  return (
    <motion.div variants={fadeUp} className={cardClass} style={cardStyle}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base leading-tight" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
            {exp.position}
          </h4>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--pf-accent)' }}>{exp.company}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {exp.current && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--pf-accent) 20%, transparent)', color: 'var(--pf-accent)' }}>
              NOW
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', color: 'var(--pf-muted, #9ca3af)', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))' }}>
            {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
          </span>
        </div>
      </div>

      {exp.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
          {!expanded && exp.description.length > 200 ? exp.description.slice(0, 200) + '…' : exp.description}
        </p>
      )}

      {exp.achievements?.length > 0 && (expanded || !hasLongContent) && (
        <ul className="space-y-1.5">
          {(expanded ? exp.achievements : exp.achievements.slice(0, 3)).map((a, i) => (
            <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--pf-accent)' }} />
              {a}
            </li>
          ))}
        </ul>
      )}

      {hasLongContent && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--pf-accent)' }}
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show more</>}
        </button>
      )}
    </motion.div>
  );
}

// ─── Education Card ───────────────────────────────────────────────────────────
function EducationCard({ edu, style }: { edu: Education; style: string }) {
  const cardStyle: React.CSSProperties = style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem' }
    : style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)', borderRadius: '1rem', padding: '1.25rem' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };

  return (
    <motion.div variants={fadeUp} style={cardStyle} className="space-y-1">
      <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
        {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
      </h4>
      <p className="text-sm font-medium" style={{ color: 'var(--pf-accent)' }}>{edu.institution}</p>
      <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{edu.startDate} – {edu.endDate}</p>
      {edu.gpa && <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>GPA: {edu.gpa}</p>}
    </motion.div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, style }: { project: Project; style: string }) {
  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 30%, transparent)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };

  return (
    <motion.div variants={fadeUp} style={cardStyle} className="space-y-3">
      <div>
        <h4 className="font-bold text-base" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{project.name}</h4>
        {project.role && <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--pf-accent)' }}>{project.role}</p>}
      </div>
      {project.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{project.description}</p>
      )}
      {project.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.technologies.map((t, i) => (
            <span key={i} className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{
              background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)',
              color: 'var(--pf-accent)',
              border: '1px solid color-mix(in srgb, var(--pf-accent) 30%, transparent)',
            }}>{t}</span>
          ))}
        </div>
      )}
      {(project.url || project.githubUrl) && (
        <div className="flex gap-3">
          {project.url && (
            <a href={project.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'var(--pf-accent)', color: '#fff' }}>
              <ExternalLink className="w-3 h-3" /> Live
            </a>
          )}
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.15))', color: 'var(--pf-fg, inherit)' }}>
              <Github className="w-3 h-3" /> GitHub
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** Maps PublicResume + PublicProfile into a ResumeData for template rendering & PDF generation. */
function toResumeData(profile: PublicProfile, resume: PublicResume): ResumeData {
  return {
    id: resume.id,
    contactInfo: {
      fullName: profile.fullName || '',
      email: '',
      phone: '',
      location: profile.location || '',
      linkedin: profile.linkedinUrl || '',
    },
    summary: resume.summary || '',
    experience: resume.experience || [],
    education: resume.education || [],
    skills: resume.skills || [],
    certifications: resume.certifications || [],
    awards: resume.awards || [],
    projects: resume.projects || [],
    publications: resume.publications || [],
    volunteering: resume.volunteering || [],
    hobbies: resume.hobbies || [],
    templateId: resume.templateId || 'modern',
  };
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function PublicPortfolioContent() {
  const { username } = useParams<{ username: string }>();
  const { data: portfolio, isLoading, error } = usePublicPortfolio(username);
  const [isDownloading, setIsDownloading] = useState(false);
  const hiddenTemplateRef = useRef<HTMLDivElement>(null);

  const resumeData = useMemo(() => {
    if (!portfolio) return null;
    return toResumeData(portfolio.profile, portfolio.resume);
  }, [portfolio]);

  const templateId = (portfolio?.resume?.templateId || 'modern') as TemplateId;
  const TemplateComponent = templateComponents[templateId];

  // Increment view count
  useEffect(() => {
    if (portfolio?.profile?.username) {
      supabase.functions.invoke("track-portfolio-view", {
        body: { username: portfolio.profile.username },
      });
    }
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
    }
    return () => {
      document.title = 'WiseResume';
      document.documentElement.removeAttribute("data-theme");
    };
  }, [portfolio]);

  const handleDownload = async () => {
    if (!resumeData || !hiddenTemplateRef.current) return;
    setIsDownloading(true);
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      const { downloadFile } = await import('@/lib/downloadUtils');
      const pdfBlob = await generatePDF(resumeData, templateId, hiddenTemplateRef.current, undefined, { showPageNumbers: true });
      const fileName = `${resumeData.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`;
      await downloadFile({ blob: pdfBlob, fileName });
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <PortfolioSkeleton />;
  if (error || !portfolio) return <NotFound />;

  const { profile, resume } = portfolio;
  const pStyle = profile.portfolioStyle || 'minimal';
  const pLayout = profile.portfolioLayout || 'single';
  const accentColor = profile.portfolioAccentColor || null;
  const pFont = profile.portfolioFont || 'inter';

  const sections = profile.portfolioSections;
  const initials = profile.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const show = (key: string) => !sections || (sections as unknown as Record<string, boolean>)[key] !== false;
  const hasExperience = show('experience') && resume.experience?.length > 0;
  const hasEducation = show('education') && resume.education?.length > 0;
  const hasSkills = show('skills') && resume.skills?.length > 0;
  const hasProjects = show('projects') && resume.projects?.length > 0;
  const hasCerts = show('certifications') && resume.certifications?.length > 0;

  // Theme-specific vars injected inline
  const themeVars = getThemeVars(pStyle, accentColor, pFont);

  // Theme-specific root styles
  const rootStyle: React.CSSProperties = {
    ...themeVars,
    fontFamily: 'var(--pf-body-font, Inter, system-ui, sans-serif)',
    ...(pStyle === 'bold-dark' ? {
      '--pf-bg': '#0a0a0f',
      '--pf-card': 'rgba(255,255,255,0.03)',
      '--pf-border': 'rgba(255,255,255,0.08)',
      '--pf-fg': '#f8f8ff',
      '--pf-muted': '#9ca3af',
    } as React.CSSProperties : pStyle === 'glass-pro' ? {
      '--pf-bg': '#0d1117',
      '--pf-card': 'rgba(255,255,255,0.06)',
      '--pf-border': 'rgba(255,255,255,0.1)',
      '--pf-fg': '#f0f4ff',
      '--pf-muted': '#a0aec0',
    } as React.CSSProperties : pStyle === 'classic-clean' ? {
      '--pf-bg': '#ffffff',
      '--pf-card': '#f9f9f9',
      '--pf-border': '#e5e7eb',
      '--pf-fg': '#111827',
      '--pf-muted': '#6b7280',
    } as React.CSSProperties : /* minimal default */ {
      '--pf-bg': '#0a0a14',
      '--pf-card': 'rgba(255,255,255,0.04)',
      '--pf-border': 'rgba(255,255,255,0.08)',
      '--pf-fg': '#f5f5ff',
      '--pf-muted': '#9ca3af',
    } as React.CSSProperties),
  };

  // Hero ambient background per theme
  const heroBg: React.CSSProperties = pStyle === 'bold-dark'
    ? { background: `radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in srgb, ${accentColor || '#e84545'} 18%, transparent), transparent)` }
    : pStyle === 'glass-pro'
    ? { background: `radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, ${accentColor || '#e84545'} 12%, transparent), transparent)` }
    : pStyle === 'classic-clean'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor || '#e84545'} 4%, #ffffff), #ffffff)` }
    : { background: `radial-gradient(ellipse 70% 35% at 50% 0%, color-mix(in srgb, ${accentColor || '#e84545'} 10%, transparent), transparent)` };

  const isTwoCol = pLayout === 'two-col';

  return (
    <div
      className="min-h-screen"
      style={{ ...rootStyle, backgroundColor: 'var(--pf-bg, #0a0a14)', color: 'var(--pf-fg, #f5f5ff)' }}
      data-portfolio-style={pStyle}
    >
      <motion.div
        className="max-w-4xl mx-auto px-4 py-0"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="relative flex flex-col items-center text-center pt-16 pb-10 px-4"
          style={heroBg}
        >
          {/* Avatar with accent ring */}
          <div className="relative mb-5">
            <div
              className="absolute inset-0 rounded-full scale-110 opacity-30 blur-sm"
              style={{ background: `radial-gradient(circle, ${accentColor || '#e84545'}, transparent)` }}
            />
            <Avatar className="h-32 w-32 relative z-10 border-[3px]" style={{ borderColor: accentColor || '#e84545' }}>
              <AvatarFallback
                className="text-3xl font-bold"
                style={{ background: `linear-gradient(135deg, ${accentColor || '#e84545'}, color-mix(in srgb, ${accentColor || '#e84545'} 60%, purple))`, color: '#fff' }}
              >
                {initials}
              </AvatarFallback>
              <AvatarImage src={profile.avatarUrl || undefined} />
            </Avatar>
          </div>

          {/* Name */}
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-2" style={{ fontFamily: 'var(--pf-heading-font)' }}>
            {profile.fullName || 'Anonymous'}
          </h1>

          {/* Job Title + Open to Work */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap mb-3">
            {profile.jobTitle && (
              <p className="text-lg font-semibold" style={{ color: accentColor || '#e84545' }}>{profile.jobTitle}</p>
            )}
            {profile.openToWork && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full" style={{
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                Open to Work
              </span>
            )}
          </div>

          {/* Location + Industry */}
          <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
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

          {/* Availability headline */}
          {profile.availabilityHeadline && (
            <p className="text-sm italic mb-4 max-w-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
              "{profile.availabilityHeadline}"
            </p>
          )}

          {/* Social icon buttons */}
          {(profile.linkedinUrl || profile.githubUrl || profile.websiteUrl || profile.twitterUrl) && (
            <div className="flex items-center justify-center gap-2 mb-5">
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))' }}
                  title="LinkedIn">
                  <Linkedin className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))' }}
                  title="GitHub">
                  <Github className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))' }}
                  title="Website">
                  <Globe className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.twitterUrl && (
                <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))' }}
                  title="X / Twitter">
                  <X className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {profile.contactEmail && (
              <a
                href={`mailto:${profile.contactEmail}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: accentColor || '#e84545', color: '#fff' }}
              >
                <Mail className="w-4 h-4" /> Hire Me
              </a>
            )}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 border"
              style={{
                background: 'transparent',
                borderColor: 'var(--pf-border, rgba(255,255,255,0.2))',
                color: 'var(--pf-fg, #f5f5ff)',
              }}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? 'Generating…' : 'Download CV'}
            </button>
          </div>
        </motion.div>

        {/* ── Body content ─────────────────────────────────────────────── */}
        <div className={`px-2 pb-16 pt-8 ${isTwoCol ? 'md:grid md:grid-cols-5 md:gap-8' : 'space-y-8'}`}>

          {/* Left column (or full width in single layout) */}
          <div className={isTwoCol ? 'md:col-span-3 space-y-8' : 'space-y-8'}>

            {/* About */}
            {profile.portfolioBio && (
              <motion.section variants={fadeUp}>
                <SectionHeader icon={<Briefcase className="w-4 h-4" />} title="About" style={pStyle} />
                <p className="text-sm leading-loose" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                  {profile.portfolioBio}
                </p>
              </motion.section>
            )}

            {/* Experience */}
            {hasExperience && (
              <motion.section variants={stagger}>
                <SectionHeader icon={<Briefcase className="w-4 h-4" />} title="Experience" style={pStyle} />
                <div className="space-y-4">
                  {resume.experience.map((exp, i) => (
                    <ExperienceCard key={exp.id || i} exp={exp} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Projects */}
            {hasProjects && (
              <motion.section variants={stagger}>
                <SectionHeader icon={<FolderOpen className="w-4 h-4" />} title="Projects" style={pStyle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resume.projects.map((p, i) => (
                    <ProjectCard key={p.id || i} project={p} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Right column (two-col) or inline below (single) */}
          <div className={isTwoCol ? 'md:col-span-2 space-y-8' : 'space-y-8'}>

            {/* Skills */}
            {hasSkills && (
              <motion.section variants={fadeUp} className={isTwoCol ? 'md:sticky md:top-8' : ''}>
                <SectionHeader icon={<Award className="w-4 h-4" />} title="Skills" style={pStyle} />
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((skill, i) => {
                    const label = typeof skill === 'string' ? skill : (skill as Record<string, string>).name || String(skill);
                    return (
                      <span key={i} className="text-sm px-3 py-1.5 rounded-full font-medium" style={{
                        background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)',
                        color: 'var(--pf-accent)',
                        border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)',
                      }}>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Education */}
            {hasEducation && (
              <motion.section variants={stagger}>
                <SectionHeader icon={<GraduationCap className="w-4 h-4" />} title="Education" style={pStyle} />
                <div className="space-y-4">
                  {resume.education.map((edu, i) => (
                    <EducationCard key={edu.id || i} edu={edu} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Certifications */}
            {hasCerts && (
              <motion.section variants={stagger}>
                <SectionHeader icon={<Award className="w-4 h-4" />} title="Certifications" style={pStyle} />
                <div className="space-y-3">
                  {resume.certifications.map((cert, i) => (
                    <motion.div key={cert.id || i} variants={fadeUp} className="p-4 rounded-xl" style={{
                      background: 'var(--pf-card, rgba(255,255,255,0.04))',
                      border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
                    }}>
                      <h4 className="font-semibold text-sm" style={{ color: 'var(--pf-fg, inherit)' }}>{cert.name}</h4>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{cert.issuer} · {cert.date}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="text-center py-8 border-t" style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' }}>
          <a
            href="https://wiseresume.lovable.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
            style={{ color: 'var(--pf-muted, #9ca3af)' }}
          >
            Built with <span className="font-bold" style={{ color: accentColor || '#e84545' }}>WiseResume</span> · Create your free portfolio →
          </a>
        </motion.div>
      </motion.div>

      {/* Hidden off-screen template for PDF generation */}
      {resumeData && TemplateComponent && (
        <div
          ref={hiddenTemplateRef}
          data-resume-template
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '612px',
            height: '792px',
            overflow: 'visible',
          }}
        >
          <Suspense fallback={null}>
            <TemplateComponent resume={resumeData} />
          </Suspense>
        </div>
      )}
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

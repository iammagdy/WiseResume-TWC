import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Briefcase, Layers, FolderOpen, Github, Wrench, Sparkles, Award, GraduationCap, Trophy, BookOpen, Heart, ExternalLink, Pin } from 'lucide-react';

import type { PublicProfile, PublicResume, PortfolioSections } from '@/hooks/usePublicPortfolio';
import { StatsStrip } from '@/components/portfolio/public/StatsStrip';
import { HighlightsStrip } from '@/components/portfolio/public/HighlightsStrip';
import { SectionNav } from '@/components/portfolio/public/SectionNav';
import { SectionHeader } from '@/components/portfolio/public/SectionHeader';
import { BioReveal } from '@/components/portfolio/public/BioReveal';
import { ExperienceCard } from '@/components/portfolio/public/cards/ExperienceCard';
import { CaseStudyCard } from '@/components/portfolio/public/cards/CaseStudyCard';
import { ProjectCard } from '@/components/portfolio/public/cards/ProjectCard';
import { GitHubProjectsSection } from '@/components/portfolio/GitHubProjectsSection';
import { ServiceCard } from '@/components/portfolio/public/cards/ServiceCard';
import { TestimonialCard } from '@/components/portfolio/public/cards/TestimonialCard';
import { SkillCloud } from '@/components/portfolio/public/SkillCloud';
import { EducationCard } from '@/components/portfolio/public/cards/EducationCard';

const SKILL_CLOUD_LIMIT = 15;


export type ScrollEffect = 'fade' | 'parallax' | 'tilt-3d' | 'cinematic';

const CINEMATIC_DIRECTIONS = [
  { x: -30, y: 0 },
  { x: 30, y: 0 },
  { x: 0, y: -20 },
  { x: 0, y: 20 },
] as const;

const reducedMotionVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const getScrollEffectVariant = (effect: ScrollEffect, index: number): any => {
  if (prefersReducedMotion()) return reducedMotionVariant;

  switch (effect) {
    case 'parallax':
      return {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] } }
      };
    case 'tilt-3d':
      return {
        hidden: { opacity: 0, rotateX: 14, y: 30, scale: 0.96, transformPerspective: 800 },
        visible: { opacity: 1, rotateX: 0, y: 0, scale: 1, transformPerspective: 800, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } }
      };
    case 'cinematic': {
      const dir = CINEMATIC_DIRECTIONS[index % CINEMATIC_DIRECTIONS.length];
      return {
        hidden: { opacity: 0, x: dir.x, y: dir.y, scale: 0.95 },
        visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
      };
    }
    case 'fade':
    default:
      return {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0, 0, 0.2, 1] } }
      };
  }
};

const getThemeSectionVariant = (style: string, scrollEffect?: ScrollEffect, index?: number): any => {
  if (scrollEffect && scrollEffect !== 'fade') {
    return getScrollEffectVariant(scrollEffect, index ?? 0);
  }
  if (style === 'developer-terminal') {
    return {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } }
    };
  }
  if (style === 'bold-dark') {
    return {
      hidden: { opacity: 0, filter: 'grayscale(100%)' },
      visible: { opacity: 1, filter: 'grayscale(0%)', transition: { duration: 0.5 } }
    };
  }
  return {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] } }
  };
};

function ParallaxSection({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);
  return (
    <div ref={ref} className={className} id={id}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}

function Tilt3DSection({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rawRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [10, 0, -4]);
  const rawScale = useTransform(scrollYProgress, [0, 0.4, 1], [0.96, 1, 1]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.25, 1], [0, 1, 1]);
  const rotateX = useSpring(rawRotateX, { stiffness: 120, damping: 20 });
  const scale = useSpring(rawScale, { stiffness: 120, damping: 20 });
  return (
    <div ref={ref} className={className} id={id} style={{ perspective: '800px' }}>
      <motion.div style={{ rotateX, scale, opacity: rawOpacity }}>
        {children}
      </motion.div>
    </div>
  );
}

function SectionWrapper({
  children,
  id,
  className,
  scrollEffect,
  pStyle,
  index,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  scrollEffect?: ScrollEffect;
  pStyle: string;
  index: number;
}) {
  // Fast path: 'fade' (and no-effect / reduced-motion) renders a plain
  // `motion.section` with no scroll subscription.  This explicit short-circuit
  // guarantees we never instantiate a per-card `useScroll` listener for the
  // common case — keeping scroll-thread cost flat on low-end mobile.
  const useScrollEffect =
    !!scrollEffect && scrollEffect !== 'fade' && !prefersReducedMotion();

  if (useScrollEffect && scrollEffect === 'parallax') {
    return <ParallaxSection id={id} className={className}>{children}</ParallaxSection>;
  }
  if (useScrollEffect && scrollEffect === 'tilt-3d') {
    return <Tilt3DSection id={id} className={className}>{children}</Tilt3DSection>;
  }
  return (
    <motion.section
      id={id}
      className={className}
      variants={getThemeSectionVariant(pStyle, scrollEffect, index)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {children}
    </motion.section>
  );
}

const getThemeItemVariant = (style: string): any => {
  return {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
  };
};

const getGenericCardProps = (pStyle: string) => {
  if (pStyle === 'developer-terminal') {
    return { className: 'pf-terminal-card', style: { borderColor: 'var(--pf-border, rgba(255,255,255,0.1))' } };
  }
  return {
    className: 'p-4 rounded-xl transition-all hover:-translate-y-1',
    style: {
      background: 'var(--pf-card, rgba(255,255,255,0.03))',
      border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)'
    }
  };
};

export interface PublicSectionsProps {
  profile: PublicProfile;
  resume: PublicResume;
  pStyle: string;
  accentColor: string;
  isTwoCol: boolean;
  navSections: { id: string; label: string }[];
  highlights: any[];
  allSkills: string[];
  portfolioSummary?: string | null;
  sectionOrder?: string[];
  scrollEffect?: ScrollEffect;
  videoIntroUrl?: string | null;
  activeLanguage?: string;
}

export const PublicSections = ({
  profile,
  resume,
  pStyle,
  accentColor,
  isTwoCol,
  navSections,
  highlights,
  allSkills,
  portfolioSummary,
  sectionOrder,
  scrollEffect,
  videoIntroUrl,
  activeLanguage,
}: PublicSectionsProps) => {
  const [showMoreSkills, setShowMoreSkills] = useState(false);
  const hasMoreSkills = allSkills.length > SKILL_CLOUD_LIMIT;

  const validExperience = resume.experience?.filter(e => e.position && e.company) || [];
  const validEducation = resume.education?.filter(e => e.institution && e.degree) || [];

  // Resolve active translation for all sections
  const activeTrans = (activeLanguage && profile.portfolioTranslations?.[activeLanguage]) || null;
  const testimonials = (profile.testimonials?.filter(t => t.quote && t.authorName) || []).map(t => {
    const translatedQuote = activeTrans?.testimonials?.find((tr: { id: string; quote: string }) => tr.id === t.id)?.quote;
    return translatedQuote ? { ...t, quote: translatedQuote } : t;
  });
  const activeServices = activeTrans?.services
    ? profile.services?.map(s => {
        const ts = activeTrans.services!.find((tr: { id: string; title: string; description?: string }) => tr.id === s.id);
        return ts ? { ...s, title: ts.title || s.title, description: ts.description ?? s.description } : s;
      }) ?? profile.services
    : profile.services;
  const activeHighlights = activeTrans?.highlights ?? highlights;
  const activeCaseStudies = activeTrans?.caseStudies
    ? profile.caseStudies?.map(cs => {
        const tcs = activeTrans.caseStudies!.find((t: { id: string; title: string; challenge: string; outcome: string }) => t.id === cs.id);
        return tcs ? { ...cs, title: tcs.title || cs.title, challenge: tcs.challenge || cs.challenge, outcome: tcs.outcome || cs.outcome } : cs;
      }) ?? profile.caseStudies
    : profile.caseStudies;
  const activePortfolioCerts = activeTrans?.portfolioCertifications
    ? profile.portfolioCertifications?.map(c => {
        const tc = activeTrans.portfolioCertifications!.find((t: { id: string; name: string; issuer: string }) => t.id === c.id);
        return tc ? { ...c, name: tc.name || c.name, issuer: tc.issuer || c.issuer } : c;
      }) ?? profile.portfolioCertifications
    : profile.portfolioCertifications;

  const sections = profile.portfolioSections;
  const show = (key: keyof PortfolioSections) => !sections || sections[key] !== false;

  const hasAbout = show('about') && !!profile.portfolioBio;
  const hasExperience = show('experience') && validExperience.length > 0;
  const hasCaseStudies = show('caseStudies') && profile.caseStudies && profile.caseStudies.length > 0;
  const hasProjects = show('projects') && resume.projects && resume.projects.length > 0;
  const hasGithubProjects = show('githubProjects') && profile.githubProjectsCache && profile.githubProjectsCache.length > 0;
  const hasServices = show('services') && profile.services && profile.services.length > 0;
  const hasTestimonials = show('testimonials') && testimonials.length > 0;
  const hasSkills = show('skills') && allSkills.length > 0;
  const hasEducation = show('education') && validEducation.length > 0;
  const hasCerts = show('certifications') && resume.certifications && resume.certifications.length > 0;
  const hasAwards = show('awards') && resume.awards && resume.awards.length > 0;
  const hasPublications = show('publications') && resume.publications && resume.publications.length > 0;
  const hasVolunteering = show('volunteering') && resume.volunteering && resume.volunteering.length > 0;

  const DEFAULT_ORDER = [
    'about', 'experience', 'caseStudies', 'projects', 'githubProjects',
    'services', 'testimonials', 'skills', 'education',
    'certifications', 'awards', 'publications', 'volunteering',
  ];

  const effectiveOrder = sectionOrder && sectionOrder.length > 0
    ? [
        ...sectionOrder,
        ...DEFAULT_ORDER.filter(k => !sectionOrder.includes(k))
      ]
    : DEFAULT_ORDER;

  const sectionIndexRef = { current: 0 };
  const nextIndex = () => sectionIndexRef.current++;

  const renderSection = (key: string) => {
    switch (key) {
      case 'about': {
        const translatedBio = activeLanguage && profile.portfolioTranslations?.[activeLanguage]?.bio
          ? profile.portfolioTranslations[activeLanguage].bio!
          : profile.portfolioBio;
        return (hasAbout || (activeLanguage && translatedBio)) && translatedBio ? (
          <SectionWrapper key="about" id="section-about" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
            <SectionHeader icon={<Briefcase className="w-5 h-5" />} title="About" style={pStyle} />
            {(() => {
              const cardProps = getGenericCardProps(pStyle);
              const isTerminal = pStyle === 'developer-terminal';
              return (
                <div className={`${cardProps.className} ${!cardProps.className.includes('p-') && !isTerminal ? 'p-5 rounded-2xl' : ''}`} style={cardProps.style}>
                  {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
                  <div className={isTerminal ? 'pf-terminal-card-body' : ''}>
                    <BioReveal bio={translatedBio} />
                  </div>
                </div>
              );
            })()}
          </SectionWrapper>
        ) : null;
      }

      case 'experience':
        return hasExperience ? (
          <SectionWrapper key="experience" id="section-experience" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
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
          </SectionWrapper>
        ) : null;

      case 'caseStudies':
        return hasCaseStudies ? (
          <SectionWrapper key="caseStudies" id="section-case-studies" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
            <SectionHeader icon={<Layers className="w-5 h-5" />} title="Case Studies" style={pStyle} />
            <div className="space-y-5">
              {(activeCaseStudies || profile.caseStudies).map((cs) => (
                <CaseStudyCard key={cs.id} cs={cs} style={pStyle} />
              ))}
            </div>
          </SectionWrapper>
        ) : null;

      case 'projects':
        return hasProjects ? (
          <SectionWrapper key="projects" id="section-projects" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
            <SectionHeader icon={<FolderOpen className="w-5 h-5" />} title="Projects" style={pStyle} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resume.projects.map((p, i) => (
                <ProjectCard key={p.id || i} project={p} style={pStyle} />
              ))}
            </div>
          </SectionWrapper>
        ) : null;

      case 'githubProjects': {
        const githubUsername = profile.githubUrl
          ? profile.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/.*$/, '').replace(/[^a-zA-Z0-9-]/g, '')
          : null;
        const showGithubSection = show('githubProjects') && (hasGithubProjects || !!githubUsername);
        return showGithubSection ? (
          <SectionWrapper key="githubProjects" id="section-github" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
            <SectionHeader icon={<Github className="w-5 h-5" />} title="GitHub Projects" style={pStyle} />
            {githubUsername && (
              <div className="mb-5 overflow-x-auto rounded-xl" style={{ background: 'var(--pf-card, rgba(255,255,255,0.03))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', padding: '12px 16px' }}>
                <img
                  src={`https://ghchart.rshah.org/${githubUsername}`}
                  alt={`${githubUsername}'s GitHub contribution graph`}
                  className="w-full h-auto min-w-[400px]"
                  loading="lazy"
                  style={{ filter: 'opacity(0.9)' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            {hasGithubProjects && (
              <GitHubProjectsSection projects={profile.githubProjectsCache} accentColor={accentColor} style={pStyle} />
            )}
          </SectionWrapper>
        ) : null;
      }

      case 'services':
        return hasServices ? (
          <SectionWrapper key="services" id="section-services" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
            <SectionHeader icon={<Wrench className="w-5 h-5" />} title="Services" style={pStyle} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(activeServices || profile.services).map((s) => (
                <ServiceCard key={s.id} service={s} style={pStyle} />
              ))}
            </div>
          </SectionWrapper>
        ) : null;

      case 'testimonials':
        return hasTestimonials ? (
          <SectionWrapper key="testimonials" id="section-testimonials" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
            <SectionHeader icon={<Sparkles className="w-5 h-5" />} title="Testimonials" style={pStyle} />
            {testimonials.length >= 3 ? (
              <div
                className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory -mx-1 px-1"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {testimonials.map((t) => (
                  <div key={t.id} className="snap-start shrink-0 w-[min(320px,85vw)]">
                    <TestimonialCard testimonial={t} style={pStyle} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map((t) => (
                  <TestimonialCard key={t.id} testimonial={t} style={pStyle} />
                ))}
              </div>
            )}
          </SectionWrapper>
        ) : null;

      case 'skills':
        return hasSkills ? (
          <SectionWrapper
            key="skills"
            id="section-skills"
            scrollEffect={scrollEffect}
            pStyle={pStyle}
            index={nextIndex()}
            className={isTwoCol ? 'md:sticky md:top-8' : undefined}
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
          </SectionWrapper>
        ) : null;

      case 'education':
        return hasEducation ? (
          <SectionWrapper key="education" id="section-education" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
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
          </SectionWrapper>
        ) : null;

      case 'certifications': {
        const portfolioCerts = (activePortfolioCerts || profile.portfolioCertifications)?.filter(c => c.name) || [];
        const hasPortfolioCerts = portfolioCerts.length > 0;
        const showCertsSection = hasCerts || hasPortfolioCerts;
        return showCertsSection ? (
          <SectionWrapper key="certifications" id="section-certifications" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
            <SectionHeader icon={<Award className="w-5 h-5" />} title="Certifications" style={pStyle} />
            {hasPortfolioCerts && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {portfolioCerts.map((cert) => {
                  const cardProps = getGenericCardProps(pStyle);
                  const isTerminal = pStyle === 'developer-terminal';
                  return (
                    <motion.div key={cert.id} variants={getThemeItemVariant(pStyle)} className={cardProps.className} style={cardProps.style}>
                      {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
                      <div className={`flex items-start gap-3 ${isTerminal ? 'pf-terminal-card-body' : ''}`}>
                        {cert.badgeUrl && (
                          <img
                            src={cert.badgeUrl}
                            alt={`${cert.name} badge`}
                            className="w-12 h-12 rounded-lg object-contain shrink-0"
                            loading="lazy"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {cert.credentialUrl ? (
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-sm inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                              style={{ color: 'var(--pf-fg, inherit)' }}
                            >
                              {cert.name}
                              <ExternalLink className="w-3 h-3" style={{ color: 'var(--pf-accent)' }} />
                            </a>
                          ) : (
                            <h4 className="font-semibold text-sm" style={{ color: 'var(--pf-fg, inherit)' }}>{cert.name}</h4>
                          )}
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                            {cert.issuer}{cert.date ? ` · ${cert.date}` : ''}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {hasCerts && (
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
            )}
          </SectionWrapper>
        ) : null;
      }

      case 'awards':
        return hasAwards ? (
          <SectionWrapper key="awards" id="section-awards" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
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
          </SectionWrapper>
        ) : null;

      case 'publications':
        return hasPublications ? (
          <SectionWrapper key="publications" id="section-publications" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
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
          </SectionWrapper>
        ) : null;

      case 'volunteering':
        return hasVolunteering ? (
          <SectionWrapper key="volunteering" id="section-volunteering" scrollEffect={scrollEffect} pStyle={pStyle} index={nextIndex()}>
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
          </SectionWrapper>
        ) : null;

      default:
        return null;
    }
  };

  const orderedSections = effectiveOrder.map(key => renderSection(key)).filter(Boolean);

  const primaryKeys = ['about', 'experience', 'caseStudies', 'projects', 'githubProjects', 'services', 'testimonials'];
  const secondaryKeys = ['skills', 'education', 'certifications', 'awards', 'publications', 'volunteering'];

  return (
    <>
      {portfolioSummary && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto px-6 py-8 md:py-10 text-center"
        >
          <p className="text-lg md:text-xl font-medium leading-relaxed" style={{ color: 'var(--pf-fg, inherit)', opacity: 0.9 }}>
            {portfolioSummary}
          </p>
        </motion.div>
      )}

      {/* Pinned / Featured Project Hero Card */}
      {profile.pinnedProject && profile.pinnedProject.title && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-4 mt-2 mb-4"
        >
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 12%, var(--pf-card, rgba(255,255,255,0.05))), var(--pf-card, rgba(255,255,255,0.03)))`,
              border: `1px solid color-mix(in srgb, ${accentColor} 30%, var(--pf-border, rgba(255,255,255,0.08)))`,
            }}
          >
            <div className="absolute top-3 right-3 opacity-20">
              <Pin className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: `color-mix(in srgb, ${accentColor} 20%, transparent)`, color: accentColor }}
              >
                Featured Project
              </span>
            </div>
            <h3 className="text-lg font-black mb-2" style={{ color: 'var(--pf-fg, #f5f5ff)', fontFamily: 'var(--pf-heading-font)' }}>
              {profile.pinnedProject.title}
            </h3>
            {(activeTrans?.pinnedProjectDescription || profile.pinnedProject.description) && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                {activeTrans?.pinnedProjectDescription || profile.pinnedProject.description}
              </p>
            )}
            {profile.pinnedProject.url && (
              <a
                href={profile.pinnedProject.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-all hover:opacity-90 active:scale-95"
                style={{ background: accentColor, color: '#fff' }}
              >
                View Project <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </motion.div>
      )}

      <StatsStrip experience={resume.experience} skillCount={allSkills.length} accentColor={accentColor} />

      {activeHighlights.length > 0 && (
        <HighlightsStrip highlights={activeHighlights} accentColor={accentColor} />
      )}

      <SectionNav sections={navSections} accentColor={accentColor} pStyle={pStyle} />

      {isTwoCol ? (
        <div className="px-2 pb-20 pt-10 md:grid md:grid-cols-5 md:gap-10">
          <div className="md:col-span-3 space-y-10">
            {effectiveOrder
              .filter(k => primaryKeys.includes(k))
              .map(key => renderSection(key))}
          </div>
          <div className="md:col-span-2 space-y-10">
            {effectiveOrder
              .filter(k => secondaryKeys.includes(k))
              .map(key => renderSection(key))}
          </div>
        </div>
      ) : (
        <div className="px-2 pb-20 pt-10 space-y-10">
          {orderedSections}
        </div>
      )}
    </>
  );
};

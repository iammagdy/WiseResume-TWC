import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Layers, FolderOpen, Github, Wrench, Sparkles, Award, GraduationCap, Trophy, BookOpen, Heart, ExternalLink } from 'lucide-react';

import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';
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

const bioFade = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0, 0, 0.2, 1] } }
} as any;

const getThemeSectionVariant = (style: string): any => {
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
  portfolioSummary
}: PublicSectionsProps) => {
  const [showMoreSkills, setShowMoreSkills] = useState(false);
  const hasMoreSkills = allSkills.length > SKILL_CLOUD_LIMIT;

  const validExperience = resume.experience?.filter(e => e.position && e.company) || [];
  const validEducation = resume.education?.filter(e => e.institution && e.degree) || [];
  const testimonials = profile.testimonials?.filter(t => t.quote && t.authorName) || [];

  const hasExperience = validExperience.length > 0;
  const hasCaseStudies = profile.caseStudies && profile.caseStudies.length > 0;
  const hasProjects = resume.projects && resume.projects.length > 0;
  const hasGithubProjects = profile.githubProjectsCache && profile.githubProjectsCache.length > 0;
  const hasServices = profile.services && profile.services.length > 0;
  const hasTestimonials = testimonials.length > 0;
  const hasSkills = allSkills.length > 0;
  const hasEducation = validEducation.length > 0;
  const hasCerts = resume.certifications && resume.certifications.length > 0;
  const hasAwards = resume.awards && resume.awards.length > 0;
  const hasPublications = resume.publications && resume.publications.length > 0;
  const hasVolunteering = resume.volunteering && resume.volunteering.length > 0;

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

      <StatsStrip experience={resume.experience} skillCount={allSkills.length} accentColor={accentColor} />

      {highlights.length > 0 && (
        <HighlightsStrip highlights={highlights} accentColor={accentColor} />
      )}

      <SectionNav sections={navSections} accentColor={accentColor} pStyle={pStyle} />

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
    </>
  );
};

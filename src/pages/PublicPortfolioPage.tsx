import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { usePublicPortfolio, PublicResume, PublicProfile } from '@/hooks/usePublicPortfolio';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Linkedin, Briefcase, GraduationCap, Award, FolderOpen, Heart, BookOpen, Github, Globe, Mail, X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, lazy, Suspense, useMemo } from 'react';
import { toast } from 'sonner';
import { templateComponents } from '@/components/editor/TemplateThumbnail';
import type { Experience, Education, Project, Certification, ResumeData, TemplateId } from '@/types/resume';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function PortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Portfolio Not Found</h1>
        <p className="text-muted-foreground">This portfolio doesn't exist or isn't public yet.</p>
        <a href="https://wiseresume.lovable.app" className="text-primary underline text-sm">
          Create your own portfolio with WiseResume →
        </a>
      </div>
    </div>
  );
}

function ExperienceCard({ exp }: { exp: Experience }) {
  return (
    <motion.div variants={fadeUp} className="glass-elevated rounded-2xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-foreground">{exp.position}</h4>
          <p className="text-sm text-primary">{exp.company}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
        </span>
      </div>
      {exp.description && <p className="text-sm text-muted-foreground leading-relaxed">{exp.description}</p>}
      {exp.achievements?.length > 0 && (
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          {exp.achievements.slice(0, 4).map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      )}
    </motion.div>
  );
}

function EducationCard({ edu }: { edu: Education }) {
  return (
    <motion.div variants={fadeUp} className="glass-elevated rounded-2xl p-4">
      <h4 className="font-semibold text-foreground">{edu.degree} in {edu.field}</h4>
      <p className="text-sm text-primary">{edu.institution}</p>
      <p className="text-xs text-muted-foreground">{edu.startDate} – {edu.endDate}</p>
      {edu.gpa && <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>}
    </motion.div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div variants={fadeUp} className="glass-elevated rounded-2xl p-4 space-y-2">
      <h4 className="font-semibold text-foreground">{project.name}</h4>
      {project.role && <p className="text-sm text-primary">{project.role}</p>}
      {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
      {project.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.technologies.map((t, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>
      )}
      {(project.url || project.githubUrl) && (
        <div className="flex gap-3 text-xs">
          {project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Live →</a>}
          {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">GitHub →</a>}
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
      }).then(({ data, error }) => {
        if (error) console.error("Error tracking portfolio view:", error);
      });
    }
  }, [portfolio]);

  useEffect(() => {
    if (portfolio?.profile) {
      const name = portfolio.profile.fullName || portfolio.profile.username;
      const title = portfolio.profile.jobTitle;
      // Use custom meta title if set, otherwise default
      document.title = portfolio.profile.metaTitle || (title ? `${name} — ${title}` : name);

      if (portfolio.profile.theme) {
        document.documentElement.setAttribute("data-theme", portfolio.profile.theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }

      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      // Use custom meta description if set, otherwise bio, otherwise default
      meta.setAttribute('content', portfolio.profile.metaDescription || portfolio.profile.portfolioBio || `${name}'s professional portfolio`);
    }
    return () => { document.title = 'WiseResume'; document.documentElement.removeAttribute("data-theme"); };
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
  const sections = profile.portfolioSections;
  const initials = profile.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const show = (key: string) => !sections || (sections as unknown as Record<string, boolean>)[key] !== false;

  const hasExperience = show('experience') && resume.experience?.length > 0;
  const hasEducation = show('education') && resume.education?.length > 0;
  const hasSkills = show('skills') && resume.skills?.length > 0;
  const hasProjects = show('projects') && resume.projects?.length > 0;
  const hasCerts = show('certifications') && resume.certifications?.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        className="max-w-4xl mx-auto px-4 py-8 md:py-16 space-y-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Hero */}
        <motion.div variants={fadeUp} className="flex flex-col items-center text-center gap-4">
          <Avatar className="h-24 w-24 border-2 border-primary/30 shadow-lg">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-fluid-2xl font-bold text-foreground">{profile.fullName || 'Anonymous'}</h1>
            {profile.jobTitle && <p className="text-lg text-primary font-medium">{profile.jobTitle}</p>}
            <div className="flex items-center justify-center gap-3 mt-2 text-sm text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
              )}
              {profile.industry && <Badge variant="outline" className="text-xs">{profile.industry}</Badge>}
            </div>

            {/* Social Links */}
            <div className="flex items-center justify-center gap-3 mt-2">
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Github className="w-4 h-4" /> GitHub
                </a>
              )}
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" /> Website
                </a>
              )}
              {profile.twitterUrl && (
                <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <X className="w-4 h-4" /> X (Twitter)
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Download Resume */}
        <motion.div variants={fadeUp} className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? 'Generating…' : 'Download Resume (PDF)'}
          </Button>
        </motion.div>

        {/* Hire Me CTA */}
        {profile.contactEmail && (
          <motion.div variants={fadeUp} className="text-center mt-4">
            <a href={`mailto:${profile.contactEmail}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-full shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95">
              <Mail className="w-5 h-5" /> Hire Me
            </a>
          </motion.div>
        )}

        {/* About Me */}
        {profile.portfolioBio && (
          <motion.div variants={fadeUp} className="glass-elevated rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">About Me</h2>
            <p className="text-foreground leading-relaxed italic">{profile.portfolioBio}</p>
          </motion.div>
        )}

        {/* Bento Grid: Experience + Skills */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {hasExperience && (
            <motion.div variants={stagger} className="md:col-span-3 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Briefcase className="w-4 h-4" /> Experience
              </h2>
              {resume.experience.map((exp, i) => <ExperienceCard key={exp.id || i} exp={exp} />)}
            </motion.div>
          )}

          {hasSkills && (
            <motion.div variants={fadeUp} className="md:col-span-2">
              <div className="glass-elevated rounded-2xl p-5 sticky top-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tech Stack</h2>
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((skill, i) => {
                    const label = typeof skill === 'string' ? skill : (skill as Record<string, string>).name || String(skill);
                    return <Badge key={i} variant="secondary" className="text-xs">{label}</Badge>;
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Projects */}
        {hasProjects && (
          <motion.div variants={stagger} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <FolderOpen className="w-4 h-4" /> Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resume.projects.map((p, i) => <ProjectCard key={p.id || i} project={p} />)}
            </div>
          </motion.div>
        )}

        {/* Education */}
        {hasEducation && (
          <motion.div variants={stagger} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <GraduationCap className="w-4 h-4" /> Education
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resume.education.map((edu, i) => <EducationCard key={edu.id || i} edu={edu} />)}
            </div>
          </motion.div>
        )}

        {/* Certifications */}
        {hasCerts && (
          <motion.div variants={fadeUp} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Award className="w-4 h-4" /> Certifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resume.certifications.map((cert, i) => (
                <div key={cert.id || i} className="glass-elevated rounded-2xl p-4">
                  <h4 className="font-semibold text-foreground text-sm">{cert.name}</h4>
                  <p className="text-xs text-muted-foreground">{cert.issuer} • {cert.date}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer CTA */}
        <motion.div variants={fadeUp} className="text-center py-8 border-t border-border">
          <a
            href="https://wiseresume.lovable.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
          >
            <span className="font-medium">Built with</span>
            <span className="font-bold text-primary">WiseResume</span>
            <span>— Create your free portfolio →</span>
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
            transform: 'scale(1)',
            transformOrigin: 'top left',
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

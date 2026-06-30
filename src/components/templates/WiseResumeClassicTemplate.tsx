import { memo } from 'react';
import { Github, Linkedin, Mail, MapPin, Phone, Globe } from 'lucide-react';
import type { ResumeData } from '@/types/resume';
import { WISERESUME_CLASSIC_HEIGHT, WISERESUME_CLASSIC_WIDTH } from '@/lib/templateDimensions';
import { safeHref } from '@/lib/urlUtils';

interface TemplateProps { resume: ResumeData; }

type ClassicProfile = { username?: string; url?: string; label?: string };
type ClassicResumeInput = ResumeData & {
  basics?: {
    name?: string;
    location?: string;
    phone?: string;
    emails?: string[];
    profiles?: {
      linkedin?: ClassicProfile;
      github?: ClassicProfile;
      portfolio?: ClassicProfile;
    };
  };
  coreCompetencies?: Record<string, string[]>;
};

interface ClassicExperience {
  id: string;
  title: string;
  company: string;
  detail?: string;
  start: string;
  end: string;
  highlights: string[];
}

interface ClassicEducation {
  id: string;
  field: string;
  institution: string;
  start: string;
  end: string;
}

interface ClassicProject {
  id: string;
  name: string;
  role: string;
  url?: string;
  description: string;
  stack: string[];
}

interface ClassicData {
  name: string;
  location: string;
  phone: string;
  emails: string[];
  linkedin?: ClassicProfile;
  github?: ClassicProfile;
  portfolio?: ClassicProfile;
  summary: string;
  coreCompetencies: Record<string, string[]>;
  experience: ClassicExperience[];
  education: ClassicEducation[];
  projects: ClassicProject[];
}

type PageBlock =
  | { type: 'header' }
  | { type: 'summary' }
  | { type: 'competencies' }
  | { type: 'experience-heading' }
  | { type: 'experience'; item: ClassicExperience }
  | { type: 'education' }
  | { type: 'projects' };

const CONTENT_HEIGHT = 943;
const DOT = ' \u00b7 ';

function usernameFromUrl(url = ''): string {
  const clean = url.replace(/\/$/, '');
  return clean.split('/').filter(Boolean).pop() || clean;
}

function domainFromUrl(url = ''): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

function dateRange(start: string, end: string): string {
  if (!start && !end) return '';
  if (!start) return end;
  if (!end) return start;
  return `${start} - ${end}`;
}

function normalizeClassicData(resume: ClassicResumeInput): ClassicData {
  const basics = resume.basics;
  const contact = resume.contactInfo ?? { fullName: '', email: '', phone: '', location: '' };
  const linkedinUrl = basics?.profiles?.linkedin?.url ?? contact.linkedin ?? '';
  const githubUrl = basics?.profiles?.github?.url ?? contact.github ?? '';
  const portfolioUrl = basics?.profiles?.portfolio?.url ?? contact.portfolio ?? '';

  const emails = [
    ...(basics?.emails ?? []),
    contact.email,
    contact.email2,
  ].filter((email): email is string => Boolean(email?.trim()));

  const skills = Array.isArray(resume.skills) ? resume.skills.filter(Boolean) : [];
  const fallbackCompetencies = skills.length
    ? { 'Core Skills': skills }
    : {};

  return {
    name: basics?.name || contact.fullName || 'Your Name',
    location: basics?.location || contact.location || '',
    phone: basics?.phone || contact.phone || '',
    emails: Array.from(new Set(emails)),
    linkedin: linkedinUrl
      ? {
          username: basics?.profiles?.linkedin?.username || usernameFromUrl(linkedinUrl),
          url: linkedinUrl,
        }
      : undefined,
    github: githubUrl
      ? {
          username: basics?.profiles?.github?.username || usernameFromUrl(githubUrl),
          url: githubUrl,
        }
      : undefined,
    portfolio: portfolioUrl
      ? {
          label: basics?.profiles?.portfolio?.label || domainFromUrl(portfolioUrl),
          url: portfolioUrl,
        }
      : undefined,
    summary: resume.summary || '',
    coreCompetencies: resume.coreCompetencies ?? fallbackCompetencies,
    experience: (resume.experience ?? []).map((exp, index) => ({
      id: exp.id || `experience-${index}`,
      title: exp.position,
      company: exp.company,
      detail: exp.account,
      start: exp.startDate,
      end: exp.current ? 'Present' : exp.endDate,
      highlights: [
        ...(exp.description ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        ...(exp.achievements ?? []),
        ...(exp.responsibilities ?? []),
      ].filter((highlight, highlightIndex, highlights) => highlights.indexOf(highlight) === highlightIndex),
    })),
    education: (resume.education ?? []).map((edu, index) => ({
      id: edu.id || `education-${index}`,
      field: [edu.degree, edu.field].filter(Boolean).join(' '),
      institution: edu.institution,
      start: edu.startDate,
      end: edu.endDate,
    })),
    projects: (resume.projects ?? []).map((project, index) => ({
      id: project.id || `project-${index}`,
      name: project.name,
      role: project.role,
      url: project.url,
      description: project.description,
      stack: project.technologies ?? [],
    })),
  };
}

function estimateBlockHeight(block: PageBlock, data: ClassicData): number {
  switch (block.type) {
    case 'header':
      return 92;
    case 'summary':
      return data.summary ? 70 : 0;
    case 'competencies':
      return Object.keys(data.coreCompetencies).length ? 118 : 0;
    case 'experience-heading':
      return data.experience.length ? 30 : 0;
    case 'experience':
      return 46 + block.item.highlights.length * 18;
    case 'education':
      return data.education.length ? 46 + Math.ceil(data.education.length / 2) * 38 : 0;
    case 'projects':
      return data.projects.length ? 34 + data.projects.length * 47 : 0;
    default:
      return 0;
  }
}

function paginate(data: ClassicData): PageBlock[][] {
  const blocks: PageBlock[] = [
    { type: 'header' },
    { type: 'summary' },
    { type: 'competencies' },
    { type: 'experience-heading' },
    ...data.experience.map((item): PageBlock => ({ type: 'experience', item })),
    { type: 'education' },
    { type: 'projects' },
  ].filter((block) => estimateBlockHeight(block, data) > 0);

  const pages: PageBlock[][] = [[]];
  let used = 0;

  for (const block of blocks) {
    const height = estimateBlockHeight(block, data);
    const current = pages[pages.length - 1];
    if (current.length > 0 && used + height > CONTENT_HEIGHT) {
      pages.push([block]);
      used = height;
    } else {
      current.push(block);
      used += height;
    }
  }

  return pages.length ? pages : [[{ type: 'header' }]];
}

function SectionHeading({ children }: { children: string }) {
  return <h2 className="wrc-section-heading">{children}</h2>;
}

function ContactItem({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <span className="wrc-contact-item">
      <Icon aria-hidden="true" className="wrc-contact-icon" />
      {children}
    </span>
  );
}

function Header({ data }: { data: ClassicData }) {
  return (
    <header className="wrc-header">
      <h1>{data.name}</h1>
      <div className="wrc-contact-row">
        {data.emails.map((email) => (
          <ContactItem key={email} icon={Mail}>
            <a href={`mailto:${email}`}>{email}</a>
          </ContactItem>
        ))}
        {data.phone && (
          <ContactItem icon={Phone}>
            <span>{data.phone}</span>
          </ContactItem>
        )}
        {data.location && (
          <ContactItem icon={MapPin}>
            <span>{data.location}</span>
          </ContactItem>
        )}
        {safeHref(data.linkedin?.url) && (
          <ContactItem icon={Linkedin}>
            <a href={safeHref(data.linkedin.url)} target="_blank" rel="noreferrer">{data.linkedin.username}</a>
          </ContactItem>
        )}
        {safeHref(data.github?.url) && (
          <ContactItem icon={Github}>
            <a href={safeHref(data.github.url)} target="_blank" rel="noreferrer">{data.github.username}</a>
          </ContactItem>
        )}
        {safeHref(data.portfolio?.url) && (
          <ContactItem icon={Globe}>
            <a href={safeHref(data.portfolio.url)} target="_blank" rel="noreferrer">{data.portfolio.label}</a>
          </ContactItem>
        )}
      </div>
    </header>
  );
}

function Summary({ text }: { text: string }) {
  if (!text) return null;
  return (
    <section className="wrc-section" data-section="summary">
      <SectionHeading>Professional Summary</SectionHeading>
      <p className="wrc-summary">{text}</p>
    </section>
  );
}

function Competencies({ groups }: { groups: Record<string, string[]> }) {
  const entries = Object.entries(groups).filter(([, items]) => items.length);
  if (!entries.length) return null;
  return (
    <section className="wrc-section" data-section="skills">
      <SectionHeading>Core Competencies</SectionHeading>
      <div className="wrc-competencies">
        {entries.map(([label, items]) => (
          <p key={label}>
            <strong>{label}: </strong>
            <span>{items.join(', ')}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

function ExperienceItem({ item }: { item: ClassicExperience }) {
  return (
    <article className="wrc-experience-item" data-break-avoid>
      <div className="wrc-entry-row">
        <h3>{item.title}</h3>
        <span>{dateRange(item.start, item.end)}</span>
      </div>
      <p className="wrc-company">{[item.company, item.detail].filter(Boolean).join(DOT)}</p>
      {item.highlights.length > 0 && (
        <ul>
          {item.highlights.map((highlight, index) => (
            <li key={`${item.id}-${index}`}>{highlight}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Education({ items }: { items: ClassicEducation[] }) {
  if (!items.length) return null;
  return (
    <section className="wrc-section" data-section="education">
      <SectionHeading>Education</SectionHeading>
      <div className="wrc-education-grid">
        {items.map((edu) => (
          <article key={edu.id} className="wrc-education-item" data-break-avoid>
            <div>
              <h3>{edu.field}</h3>
              <p>{edu.institution}</p>
            </div>
            <span>{dateRange(edu.start, edu.end)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Projects({ items }: { items: ClassicProject[] }) {
  if (!items.length) return null;
  return (
    <section className="wrc-section" data-section="projects">
      <SectionHeading>Projects</SectionHeading>
      <div className="wrc-project-list">
        {items.map((project) => (
          <article key={project.id} className="wrc-project-item" data-break-avoid>
            <div className="wrc-entry-row">
              <h3>{project.name} | {project.role}</h3>
              {safeHref(project.url) && <a href={safeHref(project.url)} target="_blank" rel="noreferrer">{domainFromUrl(project.url)}</a>}
            </div>
            <p>{project.description}</p>
            {project.stack.length > 0 && <small><strong>Stack:</strong> {project.stack.join(DOT)}</small>}
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <footer className="wrc-footer">
      Page {page} of {total} - Made with{' '}
      <a href="https://wiseresume.app" target="_blank" rel="noreferrer">WiseResume</a>
    </footer>
  );
}

function RenderBlock({ block, data }: { block: PageBlock; data: ClassicData }) {
  switch (block.type) {
    case 'header':
      return <Header data={data} />;
    case 'summary':
      return <Summary text={data.summary} />;
    case 'competencies':
      return <Competencies groups={data.coreCompetencies} />;
    case 'experience-heading':
      return (
        <section className="wrc-section wrc-experience-heading" data-section="experience">
          <SectionHeading>Professional Experience</SectionHeading>
        </section>
      );
    case 'experience':
      return <ExperienceItem item={block.item} />;
    case 'education':
      return <Education items={data.education} />;
    case 'projects':
      return <Projects items={data.projects} />;
    default:
      return null;
  }
}

export const WiseResumeClassicTemplate = memo(function WiseResumeClassicTemplate({ resume }: TemplateProps) {
  const data = normalizeClassicData(resume as ClassicResumeInput);
  const pages = paginate(data);

  return (
    <div className="wrc-document" data-resume-template>
      <style>{`
        @page { size: letter; margin: 0; }
        .wrc-document {
          width: ${WISERESUME_CLASSIC_WIDTH}px;
          background: #f3f4f6;
          display: flex;
          flex-direction: column;
          gap: 32px;
          color: #111114;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .wrc-page {
          width: ${WISERESUME_CLASSIC_WIDTH}px;
          min-height: ${WISERESUME_CLASSIC_HEIGHT}px;
          background: #fff;
          padding: 46px 56px 26px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,.08), 0 4px 6px -4px rgba(0,0,0,.04);
        }
        .wrc-content { flex: 1; }
        .wrc-header {
          padding-bottom: 16px;
          margin-bottom: 12px;
          border-bottom: 2px solid hsl(var(--primary));
        }
        .wrc-header h1 {
          margin: 0 0 5px;
          font-size: 33px;
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #111114;
        }
        .wrc-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          align-items: center;
          font-size: 12.5px;
          line-height: 1.25;
          color: #374151;
        }
        .wrc-contact-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .wrc-contact-icon {
          width: 13px;
          height: 13px;
          color: hsl(var(--primary));
          flex-shrink: 0;
          stroke-width: 1.8;
        }
        .wrc-document a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .wrc-section { margin-bottom: 9px; break-inside: avoid; }
        .wrc-section-heading {
          margin: 0 0 7px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e5e7eb;
          color: hsl(var(--primary));
          font-size: 12px;
          line-height: 1.1;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .wrc-summary {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.42;
          color: #374151;
        }
        .wrc-competencies {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px 28px;
        }
        .wrc-competencies p {
          margin: 0;
          font-size: 11px;
          line-height: 1.4;
          color: #374151;
        }
        .wrc-competencies strong { color: #111114; font-weight: 700; }
        .wrc-experience-heading { margin-bottom: 7px; }
        .wrc-experience-item {
          margin-bottom: 8px;
          break-inside: avoid;
        }
        .wrc-entry-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 16px;
        }
        .wrc-entry-row h3 {
          margin: 0;
          color: #111114;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 700;
        }
        .wrc-entry-row span {
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .wrc-company {
          margin: 2px 0 5px;
          color: hsl(var(--primary));
          font-size: 12.5px;
          line-height: 1.2;
          font-weight: 600;
        }
        .wrc-experience-item ul {
          margin: 0;
          padding-left: 17px;
          color: #374151;
          font-size: 12.5px;
          line-height: 1.42;
        }
        .wrc-experience-item li { margin: 0; }
        .wrc-education-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 28px;
        }
        .wrc-education-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          break-inside: avoid;
        }
        .wrc-education-item h3 {
          margin: 0;
          color: #111114;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 700;
        }
        .wrc-education-item p,
        .wrc-education-item span {
          margin: 1px 0 0;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.25;
        }
        .wrc-education-item span {
          white-space: nowrap;
          text-align: right;
        }
        .wrc-project-list { display: flex; flex-direction: column; gap: 7px; }
        .wrc-project-item {
          break-inside: avoid;
        }
        .wrc-project-item h3 {
          margin: 0;
          color: #111114;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 700;
        }
        .wrc-project-item p {
          margin: 3px 0 0;
          color: #374151;
          font-size: 12px;
          line-height: 1.3;
        }
        .wrc-project-item small {
          display: block;
          margin-top: 2px;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.25;
        }
        .wrc-footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.2;
        }
        .wrc-footer a { font-weight: 600; }
        @media print {
          body { background: #fff !important; }
          .wrc-document {
            background: #fff;
            gap: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .wrc-page {
            box-shadow: none;
          }
          .wrc-page:not(:last-child) {
            break-after: page;
          }
        }
      `}</style>
      {pages.map((page, index) => (
        <article key={index} className="wrc-page">
          <div className="wrc-content">
            {page.map((block, blockIndex) => (
              <RenderBlock key={`${block.type}-${blockIndex}`} block={block} data={data} />
            ))}
          </div>
          <Footer page={index + 1} total={pages.length} />
        </article>
      ))}
    </div>
  );
});

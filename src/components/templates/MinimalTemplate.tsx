import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

type ExperienceItemType = ResumeData['experience'][number];
type EducationItemType = ResumeData['education'][number];

const ExperienceItem = memo(function ExperienceItem({ exp }: { exp: ExperienceItemType }) {
  return (
    <div data-break-avoid>
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="font-medium text-gray-900">{exp.position}</h3>
        <span className="text-xs text-gray-400">
          {formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current, { separator: '—' })}
        </span>
      </div>
      <p className="text-gray-500 text-xs mb-1">{exp.company}</p>
      {exp.description && (
        <p data-break-child className="text-gray-600 text-xs">{exp.description}</p>
      )}
      {exp.achievements && exp.achievements.length > 0 && (
        <ul data-break-child className="mt-1 space-y-0.5 list-none">
          {exp.achievements.map((a, i) => (
            <li key={i} data-break-child className="text-gray-600 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{a}</li>
          ))}
        </ul>
      )}
      {exp.responsibilities && exp.responsibilities.length > 0 && (
        <ul data-break-child className="mt-1 space-y-0.5 list-none">
          {exp.responsibilities.map((r, i) => (
            <li key={i} data-break-child className="text-gray-600 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
});

const EducationItem = memo(function EducationItem({ edu }: { edu: EducationItemType }) {
  return (
    <div data-break-avoid>
      <h3 className="font-medium text-gray-900">
        {edu.degree} {edu.field && `in ${edu.field}`}
      </h3>
      {(() => {
        const eduRange = formatDateRangeDisplay(edu.startDate, edu.endDate, false);
        return <p className="text-gray-500 text-xs">{edu.institution}{eduRange && ` - ${eduRange}`}</p>;
      })()}
      {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
    </div>
  );
});

export const MinimalTemplate = memo(function MinimalTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-10 font-sans text-sm leading-loose">
      <header className="mb-8">
        <h1 className="text-4xl font-light text-gray-900 mb-3">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <ContactLinks contact={resume.contactInfo} className="text-gray-500 text-xs" iconSize={3} />
      </header>

      {resume.summary && (
        <section data-section="summary" className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Summary
          </h2>
          <p data-break-child className="text-gray-600 leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Experience
          </h2>
          <div className="space-y-5">
            {resume.experience.map((exp) => (
              <ExperienceItem key={exp.id} exp={exp} />
            ))}
          </div>
        </section>
      )}

      {resume.education.length > 0 && (
        <section data-section="education" className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Education
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <EducationItem key={edu.id} edu={edu} />
            ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Skills
          </h2>
          <p className="text-gray-600 text-xs">{resume.skills.join(', ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="minimal" />
    </div>
  );
});

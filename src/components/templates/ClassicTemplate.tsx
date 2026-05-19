import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

type ExperienceItemType = ResumeData['experience'][number];
type EducationItemType = ResumeData['education'][number];

const ExperienceItem = memo(function ExperienceItem({ exp }: { exp: ExperienceItemType }) {
  return (
    <div data-break-avoid>
      <div className="flex justify-between">
        <strong className="text-gray-900">{exp.position}</strong>
        <span className="text-xs text-gray-500">{formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current, { separator: '-' })}</span>
      </div>
      <p className="text-gray-600 italic">{exp.company}</p>
      {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
      {exp.achievements && exp.achievements.length > 0 && (
        <ul data-break-child className="mt-1 space-y-0.5 list-none">
          {exp.achievements.map((a, i) => (
            <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{a}</li>
          ))}
        </ul>
      )}
      {exp.responsibilities && exp.responsibilities.length > 0 && (
        <ul data-break-child className="mt-1 space-y-0.5 list-none">
          {exp.responsibilities.map((r, i) => (
            <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
});

const EducationItem = memo(function EducationItem({ edu }: { edu: EducationItemType }) {
  return (
    <div data-break-avoid className="flex justify-between">
      <div>
        <strong className="text-gray-900">{edu.institution}</strong>
        <p className="text-gray-600 text-xs">{formatDegreeAndField(edu.degree, edu.field)}</p>
        {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
      </div>
      <span className="text-xs text-gray-500">{formatDateRangeDisplay(edu.startDate, edu.endDate, edu.endDate === 'Present')}</span>
    </div>
  );
});

export const ClassicTemplate = memo(function ClassicTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-serif text-sm leading-relaxed">
      <header className="text-center border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex justify-center">
          <ContactLinks contact={resume.contactInfo} className="text-gray-600 text-xs" iconSize={3} separator="|" />
        </div>
      </header>

      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">PROFESSIONAL SUMMARY</h2>
          <p data-break-child className="text-gray-700 text-xs">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">WORK EXPERIENCE</h2>
          <div className="space-y-4">
            {resume.experience.map((exp) => (
              <ExperienceItem key={exp.id} exp={exp} />
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">EDUCATION</h2>
          <div className="space-y-2">
            {resume.education.map((edu) => (
              <EducationItem key={edu.id} edu={edu} />
            ))}
          </div>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">SKILLS</h2>
          <p className="text-gray-700 text-xs">{resume.skills.join(', ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="classic" />
    </div>
  );
});

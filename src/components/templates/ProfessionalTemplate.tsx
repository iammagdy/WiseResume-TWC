import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

type ExperienceItemType = ResumeData['experience'][number];
type EducationItemType = ResumeData['education'][number];

const ExperienceItem = memo(function ExperienceItem({ exp }: { exp: ExperienceItemType }) {
  return (
    <div data-break-avoid>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">{exp.position}</h3>
          <p className="text-gray-600 text-xs">{exp.company}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current, { separator: '-' })}
        </span>
      </div>
      {exp.description && (
        <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>
      )}
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
    <div data-break-avoid>
      <p className="font-semibold text-gray-900 text-xs">{edu.degree}</p>
      <p className="text-gray-600 text-xs">{edu.field}</p>
      <p className="text-gray-500 text-xs">{edu.institution}</p>
      <p className="text-gray-400 text-xs">{formatDisplayDate(edu.endDate)}</p>
      {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
    </div>
  );
});

export const ProfessionalTemplate = memo(function ProfessionalTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm">
      <header data-resume-bleed-edge className="bg-gray-900 text-white -m-8 mb-6 p-6">
        <h1 className="text-2xl font-bold mb-2">
          {resume.contactInfo.fullName || 'Your Name'}
        </h1>
        <ContactLinks contact={resume.contactInfo} className="text-gray-300 text-xs" iconSize={3} />
      </header>

      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-gray-900">
            PROFILE
          </h2>
          <p data-break-child className="text-gray-700 text-xs leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-900">
            PROFESSIONAL EXPERIENCE
          </h2>
          <div className="space-y-4">
            {resume.experience.map((exp) => (
              <ExperienceItem key={exp.id} exp={exp} />
            ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section data-section="skills" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-gray-900">
            SKILLS
          </h2>
          <p className="text-xs text-gray-700">{resume.skills.join(', ')}</p>
        </section>
      )}

      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-gray-900">
            EDUCATION
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <EducationItem key={edu.id} edu={edu} />
            ))}
          </div>
        </section>
      )}

      <ExtraSections resume={resume} variant="professional" />
    </div>
  );
});

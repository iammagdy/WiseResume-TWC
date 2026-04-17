import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ContactLinks } from './shared/ContactLinks';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

type ExperienceItemType = ResumeData['experience'][number];
type EducationItemType = ResumeData['education'][number];

const ExperienceItem = memo(function ExperienceItem({ exp }: { exp: ExperienceItemType }) {
  return (
    <div data-break-avoid>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900">{exp.position}</h3>
          <p className="text-gray-600">{exp.company}</p>
        </div>
        <span className="text-xs text-gray-500">{formatDisplayDate(exp.startDate)} - {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span>
      </div>
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
        <h3 className="font-bold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
        <p className="text-gray-600">{edu.institution}</p>
        {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
      </div>
      <span className="text-xs text-gray-500">{formatDisplayDate(edu.endDate)}</span>
    </div>
  );
});

export const ModernTemplate = memo(function ModernTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="border-b-2 border-purple-600 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <ContactLinks contact={resume.contactInfo} className="text-gray-600 text-xs" iconSize={3} />
      </header>

      {resume.summary && (
        <section data-section="summary" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">Summary</h2>
          <p data-break-child className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-3 uppercase tracking-wide">Experience</h2>
          <div className="space-y-4">
            {resume.experience.map((exp) => (
              <ExperienceItem key={exp.id} exp={exp} />
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-3 uppercase tracking-wide">Education</h2>
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <EducationItem key={edu.id} edu={edu} />
            ))}
          </div>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill, i) => (
              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{skill}</span>
            ))}
          </div>
        </section>
      )}

      <ExtraSections resume={resume} variant="default" exclude={['summary', 'experience', 'education', 'skills']} />
    </div>
  );
});

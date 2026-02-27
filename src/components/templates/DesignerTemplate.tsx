import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const DesignerTemplate = memo(function DesignerTemplate({ resume }: TemplateProps) {
  return (
    <div className="min-h-full font-sans text-sm leading-relaxed">
      {/* Header with dark accent */}
      <header className="bg-gray-900 text-white p-6">
        <div className="flex items-center gap-4">
          {resume.contactInfo.photoUrl && (
            <img src={resume.contactInfo.photoUrl} alt="User profile photo" loading="lazy" className="w-20 h-20 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight">{resume.contactInfo.fullName || 'Your Name'}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-300 mt-2">
              {resume.contactInfo.email && <p>{resume.contactInfo.email}</p>}
              {resume.contactInfo.phone && <p>{resume.contactInfo.phone}</p>}
              {resume.contactInfo.location && <p>{resume.contactInfo.location}</p>}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* Summary */}
        {resume.summary && (
          <section data-section="summary">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Profile</h2>
            <p className="text-gray-700 text-xs">{resume.summary}</p>
          </section>
        )}

        {/* Experience */}
        {resume.experience.length > 0 && (
          <section data-section="experience">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Experience</h2>
            <div className="space-y-3">
              {resume.experience.map(exp => (
                <div key={exp.id} data-break-avoid>
                  <h3 className="font-bold text-gray-900 text-xs">{exp.position}</h3>
                  <p className="text-gray-500 text-[10px]">{exp.company} · {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</p>
                  {exp.description && <p data-break-child className="text-gray-700 mt-1 text-[10px]">{exp.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {resume.skills.length > 0 && (
          <section data-section="skills">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((s, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded">{s}</span>)}
            </div>
          </section>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <section data-section="education">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Education</h2>
            {resume.education.map(edu => (
              <div key={edu.id} data-break-avoid className="mb-2">
                <h3 className="font-bold text-gray-900 text-[10px]">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
                <p className="text-gray-500 text-[10px]">{edu.institution} — {formatDisplayDate(edu.endDate)}</p>
                {edu.description && <p className="text-gray-500 text-[10px] mt-0.5">{edu.description}</p>}
              </div>
            ))}
          </section>
        )}

        <ExtraSections resume={resume} />
      </div>
    </div>
  );
});

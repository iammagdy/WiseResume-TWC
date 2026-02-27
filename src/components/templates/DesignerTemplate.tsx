import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const DesignerTemplate = memo(function DesignerTemplate({ resume }: TemplateProps) {
  return (
    <div className="flex min-h-full font-sans text-sm leading-relaxed">
      {/* Sidebar */}
      <div className="w-[180px] bg-gray-900 text-white p-6 flex-shrink-0">
        {resume.contactInfo.photoUrl && (
          <img src={resume.contactInfo.photoUrl} alt="User profile photo" loading="lazy" className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" />
        )}
        <h1 className="text-lg font-bold leading-tight mb-4">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="space-y-1 text-[10px] text-gray-300 mb-6">
          {resume.contactInfo.email && <p>{resume.contactInfo.email}</p>}
          {resume.contactInfo.phone && <p>{resume.contactInfo.phone}</p>}
          {resume.contactInfo.location && <p>{resume.contactInfo.location}</p>}
        </div>
        {resume.skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Skills</h2>
            <div className="space-y-1">{resume.skills.map((s, i) => <p key={i} className="text-[10px]">{s}</p>)}</div>
          </div>
        )}
      </div>
      {/* Main */}
      <div className="flex-1 p-6">
        {resume.summary && (
          <section data-section="summary" className="mb-5">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Profile</h2>
            <p className="text-gray-700 text-xs">{resume.summary}</p>
          </section>
        )}
        {resume.experience.length > 0 && (
          <section data-section="experience" className="mb-5">
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
        {resume.education.length > 0 && (
          <section data-section="education">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Education</h2>
            {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-[10px]">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-500 text-[10px]">{edu.institution} — {formatDisplayDate(edu.endDate)}</p>{edu.description && <p className="text-gray-500 text-[10px] mt-0.5">{edu.description}</p>}</div>))}
          </section>
        )}
        <ExtraSections resume={resume} />
      </div>
    </div>
  );
});
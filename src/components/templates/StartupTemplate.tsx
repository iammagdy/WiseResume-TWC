import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { Rocket, Briefcase, GraduationCap, Zap } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const StartupTemplate = memo(function StartupTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-x-3 text-gray-500 text-xs mt-2">
          {resume.contactInfo.email && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6">
          <h2 className="text-lg font-bold text-emerald-600 mb-2 flex items-center justify-start gap-2"><Rocket className="w-5 h-5" /> About</h2>
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-lg font-bold text-emerald-600 mb-3 flex items-center justify-start gap-2"><Briefcase className="w-5 h-5" /> Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between items-start"><div><h3 className="font-bold text-gray-900">{exp.position}</h3><p className="text-emerald-600 text-xs font-medium">{exp.company}</p></div><span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Now' : formatDisplayDate(exp.endDate)}</span></div>
                {exp.description && <p className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-lg font-bold text-emerald-600 mb-3 flex items-center justify-start gap-2"><GraduationCap className="w-5 h-5" /> Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="flex justify-between mb-2"><div><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div><span className="text-xs text-gray-400">{formatDisplayDate(edu.endDate)}</span></div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-lg font-bold text-emerald-600 mb-2 flex items-center justify-start gap-2"><Zap className="w-5 h-5" /> Stack</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium">{s}</span>)}</div>
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});

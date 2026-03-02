import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const CreativeTemplate = memo(function CreativeTemplate({ resume }: TemplateProps) {
  const initials = resume.contactInfo.fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CV';

  return (
    <div className="min-h-full text-xs font-sans bg-white">
      {/* Header with gradient accent */}
      <header className="bg-gradient-to-r from-violet-600 to-purple-700 text-white p-6">
        <div className="flex items-center gap-4 mb-3">
          {resume.contactInfo.photoUrl ? (
            <img
              src={resume.contactInfo.photoUrl}
              alt={resume.contactInfo.fullName || 'Profile photo'}
              className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold">{initials}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {resume.contactInfo.fullName || 'Your Name'}
            </h1>
            {resume.experience[0]?.position && (
              <p className="text-violet-200 font-medium mt-1">
                {resume.experience[0].position}
              </p>
            )}
          </div>
        </div>

        {/* Contact info in header */}
        <div className="flex flex-wrap gap-3 text-violet-100">
          {resume.contactInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span className="break-all">{resume.contactInfo.email}</span>
            </span>
          )}
          {resume.contactInfo.email2 && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span className="break-all">{resume.contactInfo.email2}</span>
            </span>
          )}
          {resume.contactInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {resume.contactInfo.phone}
            </span>
          )}
          {resume.contactInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {resume.contactInfo.location}
            </span>
          )}
          {resume.contactInfo.linkedin && (
            <span className="flex items-center gap-1">
              <Linkedin className="w-3 h-3" />
              <span className="break-all">{resume.contactInfo.linkedin}</span>
            </span>
          )}
          {resume.contactInfo.portfolio && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span className="break-all">{resume.contactInfo.portfolio}</span>
            </span>
          )}
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Summary */}
        {resume.summary && (
          <section data-section="summary">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-violet-500"></span>
              About Me
            </h2>
            <p className="text-gray-600 leading-relaxed">{resume.summary}</p>
          </section>
        )}

        {/* Experience */}
        {resume.experience.length > 0 && (
          <section data-section="experience">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-violet-500"></span>
              Experience
            </h2>
            <div className="space-y-4">
              {resume.experience.map((exp) => (
                <div key={exp.id} data-break-avoid className="relative pl-4 border-l-2 border-violet-200">
                  <div className="absolute w-2 h-2 bg-violet-500 rounded-full -left-[5px] top-1"></div>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                      <p className="text-violet-600">{exp.company}</p>
                    </div>
                    <span className="text-gray-400 text-xs whitespace-nowrap">
                      {formatDisplayDate(exp.startDate)} - {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                    </span>
                  </div>
                  {exp.description && (
                    <p data-break-child className="text-gray-600 mt-1">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {resume.skills.length > 0 && (
          <section data-section="skills">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-violet-500"></span>
              Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <section data-section="education">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-violet-500"></span>
              Education
            </h2>
            <div className="space-y-3">
              {resume.education.map((edu) => (
                <div key={edu.id} data-break-avoid>
                  <p className="font-semibold text-gray-900">{edu.degree}</p>
                  {edu.field && <p className="text-violet-600 text-xs">{edu.field}</p>}
                  <p className="text-gray-500 text-xs">{edu.institution}</p>
                  <p className="text-gray-400 text-xs">{formatDisplayDate(edu.endDate)}</p>
                  {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications */}
        {resume.certifications && resume.certifications.length > 0 && (
          <section data-section="certifications">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-violet-500"></span>
              Certifications
            </h2>
            <div className="space-y-1">
              {resume.certifications.map((cert) => (
                <p key={cert.id} className="text-gray-600">
                  <span className="font-medium">{cert.name}</span>
                  {cert.issuer && <span className="text-gray-400"> - {cert.issuer}</span>}
                </p>
              ))}
            </div>
          </section>
        )}
        <ExtraSections resume={resume} exclude={['certifications']} variant="creative" />
      </div>
    </div>
  );
});

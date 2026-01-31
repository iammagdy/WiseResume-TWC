import { ResumeData } from '@/types/resume';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';

interface TemplateProps {
  resume: ResumeData;
}

export function CreativeTemplate({ resume }: TemplateProps) {
  const initials = resume.contactInfo.fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CV';

  return (
    <div className="flex min-h-full text-xs font-sans">
      {/* Left Sidebar */}
      <aside className="w-1/3 bg-gradient-to-b from-violet-600 to-purple-700 text-white p-5">
        {/* Large Initials */}
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 mx-auto">
          <span className="text-2xl font-bold">{initials}</span>
        </div>

        {/* Contact */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3 text-violet-200">
            Contact
          </h2>
          <div className="space-y-2 text-violet-100">
            {resume.contactInfo.email && (
              <p className="flex items-center gap-2">
                <Mail className="w-3 h-3" />
                <span className="break-all">{resume.contactInfo.email}</span>
              </p>
            )}
            {resume.contactInfo.phone && (
              <p className="flex items-center gap-2">
                <Phone className="w-3 h-3" />
                {resume.contactInfo.phone}
              </p>
            )}
            {resume.contactInfo.location && (
              <p className="flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                {resume.contactInfo.location}
              </p>
            )}
            {resume.contactInfo.linkedin && (
              <p className="flex items-center gap-2">
                <Linkedin className="w-3 h-3" />
                <span className="break-all">{resume.contactInfo.linkedin}</span>
              </p>
            )}
            {resume.contactInfo.portfolio && (
              <p className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                <span className="break-all">{resume.contactInfo.portfolio}</span>
              </p>
            )}
          </div>
        </section>

        {/* Skills */}
        {resume.skills.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 text-violet-200">
              Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-white/20 rounded-full text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 text-violet-200">
              Education
            </h2>
            <div className="space-y-3">
              {resume.education.map((edu) => (
                <div key={edu.id} data-break-avoid>
                  <p className="font-semibold">{edu.degree}</p>
                  {edu.field && <p className="text-violet-200 text-xs">{edu.field}</p>}
                  <p className="text-violet-300 text-xs">{edu.institution}</p>
                  <p className="text-violet-300 text-xs">{edu.endDate}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-white">
        {/* Header */}
        <header className="mb-6 border-b-2 border-violet-500 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {resume.contactInfo.fullName || 'Your Name'}
          </h1>
          {resume.experience[0]?.position && (
            <p className="text-violet-600 font-medium mt-1">
              {resume.experience[0].position}
            </p>
          )}
        </header>

        {/* Summary */}
        {resume.summary && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-violet-500"></span>
              About Me
            </h2>
            <p className="text-gray-600 leading-relaxed">{resume.summary}</p>
          </section>
        )}

        {/* Experience */}
        {resume.experience.length > 0 && (
          <section className="mb-6">
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
                      {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-gray-600 mt-1">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications if any */}
        {resume.certifications && resume.certifications.length > 0 && (
          <section>
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
      </main>
    </div>
  );
}

import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { Github, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const DeveloperTemplate = memo(function DeveloperTemplate({ resume }: TemplateProps) {
  // Group skills by category (simple heuristic)
  const categorizeSkills = (skills: string[]) => {
    const languages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin'];
    const frameworks = ['React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Rails', 'Laravel', 'Svelte'];
    const databases = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase', 'Supabase', 'DynamoDB', 'Cassandra'];
    const tools = ['Git', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Linux', 'Nginx', 'Terraform'];

    const categorized = {
      languages: [] as string[],
      frameworks: [] as string[],
      databases: [] as string[],
      tools: [] as string[],
      other: [] as string[],
    };

    skills.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      if (languages.some(l => lowerSkill.includes(l.toLowerCase()))) {
        categorized.languages.push(skill);
      } else if (frameworks.some(f => lowerSkill.includes(f.toLowerCase()))) {
        categorized.frameworks.push(skill);
      } else if (databases.some(d => lowerSkill.includes(d.toLowerCase()))) {
        categorized.databases.push(skill);
      } else if (tools.some(t => lowerSkill.includes(t.toLowerCase()))) {
        categorized.tools.push(skill);
      } else {
        categorized.other.push(skill);
      }
    });

    return categorized;
  };

  const skillCategories = categorizeSkills(resume.skills);

  return (
    <div className="font-mono text-xs leading-relaxed bg-white">
      {/* Terminal-style header */}
      <header className="bg-gray-900 text-gray-100 p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-400">&gt;</span>
          <h1 className="text-xl font-bold tracking-tight">
            {resume.contactInfo.fullName?.replace(/\s/g, '_') || 'Your_Name'}
          </h1>
        </div>
        
        {resume.experience[0]?.position && (
          <p className="text-gray-400 ml-4 mb-3">{resume.experience[0].position}</p>
        )}
        
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          {resume.contactInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {resume.contactInfo.email}
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
              <Github className="w-3 h-3" />
              {resume.contactInfo.linkedin}
            </span>
          )}
          {resume.contactInfo.portfolio && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {resume.contactInfo.portfolio}
            </span>
          )}
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* Summary */}
        {resume.summary && (
          <section data-section="summary">
            <h2 className="text-green-600 font-bold mb-2">
              <span className="text-gray-400">//</span> ABOUT
            </h2>
            <div className="border-l-2 border-gray-200 pl-3">
              <p className="text-gray-700">{resume.summary}</p>
            </div>
          </section>
        )}

        {/* Tech Stack */}
        {resume.skills.length > 0 && (
          <section data-section="skills">
            <h2 className="text-green-600 font-bold mb-2">
              <span className="text-gray-400">//</span> TECH_STACK
            </h2>
            <div className="border-l-2 border-gray-200 pl-3 space-y-1">
              {skillCategories.languages.length > 0 && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-purple-600 w-20">Languages:</span>
                  <span className="text-gray-700">{skillCategories.languages.join(' • ')}</span>
                </div>
              )}
              {skillCategories.frameworks.length > 0 && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-purple-600 w-20">Frameworks:</span>
                  <span className="text-gray-700">{skillCategories.frameworks.join(' • ')}</span>
                </div>
              )}
              {skillCategories.databases.length > 0 && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-purple-600 w-20">Databases:</span>
                  <span className="text-gray-700">{skillCategories.databases.join(' • ')}</span>
                </div>
              )}
              {skillCategories.tools.length > 0 && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-purple-600 w-20">Tools:</span>
                  <span className="text-gray-700">{skillCategories.tools.join(' • ')}</span>
                </div>
              )}
              {skillCategories.other.length > 0 && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-purple-600 w-20">Other:</span>
                  <span className="text-gray-700">{skillCategories.other.join(' • ')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Experience */}
        {resume.experience.length > 0 && (
          <section data-section="experience">
            <h2 className="text-green-600 font-bold mb-2">
              <span className="text-gray-400">//</span> EXPERIENCE
            </h2>
            <div className="border-l-2 border-gray-200 pl-3 space-y-4">
              {resume.experience.map((exp) => (
                <div key={exp.id} data-break-avoid>
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <h3 className="text-gray-900">
                      <span className="text-green-500">&gt;</span> {exp.position}
                      <span className="text-gray-500"> @ {exp.company}</span>
                    </h3>
                    <span className="text-gray-400 text-xs">
                      {formatDisplayDate(exp.startDate)} - {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-gray-600 mt-1 ml-4">{exp.description}</p>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="mt-1 ml-4 space-y-0.5">
                      {exp.achievements.map((achievement, i) => (
                        <li key={i} className="text-gray-600">
                          <span className="text-gray-400">-</span> {achievement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <section data-section="education">
            <h2 className="text-green-600 font-bold mb-2">
              <span className="text-gray-400">//</span> EDUCATION
            </h2>
            <div className="border-l-2 border-gray-200 pl-3 space-y-2">
              {resume.education.map((edu) => (
                <div key={edu.id} data-break-avoid className="flex justify-between items-baseline flex-wrap gap-1">
                  <span className="text-gray-900">
                    <span className="text-green-500">&gt;</span> {edu.degree}
                    {edu.field && ` in ${edu.field}`}
                    <span className="text-gray-500"> @ {edu.institution}</span>
                  </span>
                  <span className="text-gray-400 text-xs">{formatDisplayDate(edu.endDate)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <ExtraSections resume={resume} />
      </div>
    </div>
  );
});

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { ResumeData, ContactInfo, Experience, Education, Certification } from '@/types/resume';
import { Json } from '@/integrations/supabase/types';

function parsePublicResume(data: any): { resumeData: ResumeData; title: string; templateId: string } {
  return {
    title: data.title,
    templateId: data.template_id || 'modern',
    resumeData: {
      id: data.id,
      contactInfo: (data.contact_info as unknown as ContactInfo) || { fullName: '', email: '', phone: '', location: '' },
      summary: data.summary || '',
      experience: (data.experience as unknown as Experience[]) || [],
      education: (data.education as unknown as Education[]) || [],
      skills: (data.skills as unknown as string[]) || [],
      certifications: (data.certifications as unknown as Certification[]) || [],
      templateId: data.template_id || 'modern',
    },
  };
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-resume', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', token!)
        .eq('is_public', true)
        .single();
      if (error) throw error;
      return parsePublicResume(data);
    },
    enabled: !!token,
  });

  if (isLoading) return <PageLoadingSpinner />;

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <h1 className="text-xl font-bold mb-2">Resume Not Found</h1>
        <p className="text-muted-foreground text-sm mb-6">This resume may no longer be shared publicly.</p>
        <a href="/" className="text-primary hover:underline text-sm">Create Your Own Resume →</a>
      </div>
    );
  }

  const { resumeData, title } = data;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Resume Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{resumeData.contactInfo.fullName || title}</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
            {resumeData.contactInfo.email && <span>{resumeData.contactInfo.email}</span>}
            {resumeData.contactInfo.phone && <span>· {resumeData.contactInfo.phone}</span>}
            {resumeData.contactInfo.location && <span>· {resumeData.contactInfo.location}</span>}
          </div>
        </div>

        {/* Summary */}
        {resumeData.summary && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Summary</h2>
            <p className="text-sm leading-relaxed">{resumeData.summary}</p>
          </section>
        )}

        {/* Experience */}
        {resumeData.experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Experience</h2>
            <div className="space-y-4">
              {resumeData.experience.map(exp => (
                <div key={exp.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm">{exp.position}</h3>
                      <p className="text-xs text-muted-foreground">{exp.company}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  {exp.achievements.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {exp.achievements.map((a, i) => (
                        <li key={i} className="text-xs text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0">{a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {resumeData.education.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Education</h2>
            {resumeData.education.map(edu => (
              <div key={edu.id} className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{edu.degree} in {edu.field}</h3>
                  <p className="text-xs text-muted-foreground">{edu.institution}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{edu.startDate} – {edu.endDate}</span>
              </div>
            ))}
          </section>
        )}

        {/* Skills */}
        {resumeData.skills.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {resumeData.skills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-muted rounded-full text-xs">{s}</span>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Bar */}
      <footer className="border-t border-border/50 px-4 py-4 bg-card/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline flex-1">
            <Sparkles className="w-4 h-4" /> Create Your Own Resume
          </a>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">Created with WiseResume</p>
      </footer>
    </div>
  );
}

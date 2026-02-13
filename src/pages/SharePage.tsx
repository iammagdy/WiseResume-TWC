import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { usePublicResume, useResumeShareMutations } from '@/hooks/useResumeShares';
import { ContactInfo, Experience, Education, Certification } from '@/types/resume';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicResume(token || null);
  const { incrementViewCount } = useResumeShareMutations();
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);

  // Increment view count once on mount
  useEffect(() => {
    if (token && data && !viewCounted) {
      incrementViewCount.mutate(token);
      setViewCounted(true);
    }
  }, [token, data, viewCounted]);

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

  const { share, resume } = data;

  // Password gate
  if (share.password && !unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="glass-card rounded-2xl p-6 max-w-sm w-full space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Password Required</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center">This resume is password protected.</p>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="text-[16px]"
          />
          <Button
            className="w-full"
            onClick={() => {
              if (password === share.password) setUnlocked(true);
              else alert('Incorrect password');
            }}
          >
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  const contactInfo = (resume.contact_info as unknown as ContactInfo) || { fullName: '', email: '', phone: '', location: '' };
  const summary = resume.summary || '';
  const experience = (resume.experience as unknown as Experience[]) || [];
  const education = (resume.education as unknown as Education[]) || [];
  const skills = (resume.skills as unknown as string[]) || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{contactInfo.fullName || resume.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
            {contactInfo.email && <span>{contactInfo.email}</span>}
            {contactInfo.phone && <span>· {contactInfo.phone}</span>}
            {contactInfo.location && <span>· {contactInfo.location}</span>}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Summary</h2>
            <p className="text-sm leading-relaxed">{summary}</p>
          </section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Experience</h2>
            <div className="space-y-4">
              {experience.map(exp => (
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
        {education.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Education</h2>
            {education.map(edu => (
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
        {skills.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
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

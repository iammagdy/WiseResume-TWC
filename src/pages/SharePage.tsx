import { useState } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { formatDateRangeDisplay } from '@/lib/dateUtils';
import { useParams } from 'react-router-dom';
import { Sparkles, Lock, MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import {
  usePublicResume,
  useUnlockPublicResume,
  type PublicResumeResult,
  type PublicShareResult,
} from '@/hooks/useResumeShares';
import { usePublicShareComments, useAddShareComment, type ShareComment } from '@/hooks/useShareComments';
import type {
  Award,
  Certification,
  ContactInfo,
  Education,
  Experience,
  Hobby,
  Language,
  Project,
  Publication,
  Reference,
  Volunteering,
} from '@/types/resume';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const SECTIONS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'awards',
  'publications',
  'volunteering',
  'languages',
  'hobbies',
  'references',
  'general',
] as const;

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">{children}</h2>;
}

function safeExternalUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordIncorrect, setPasswordIncorrect] = useState(false);
  const [unlockedData, setUnlockedData] = useState<PublicShareResult | null>(null);
  const initialShare = usePublicResume(token || null);
  const unlockShare = useUnlockPublicResume();
  const data: PublicResumeResult | undefined = unlockedData ?? initialShare.data;
  const accessToken = data && 'access_token' in data ? data.access_token : null;

  // Feedback state
  const { data: comments = [] } = usePublicShareComments(token || null, accessToken);
  const addComment = useAddShareComment();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSection, setFeedbackSection] = useState<string>('general');

  const submitPassword = async () => {
    const password = passwordInput;
    if (!token || !password.trim()) {
      toast.error('Please enter a password');
      return;
    }
    // Clear the controlled input before the request settles so the credential
    // is not retained in component or query-key state.
    setPasswordInput('');
    setPasswordIncorrect(false);
    try {
      const result = await unlockShare.mutateAsync({ token, password });
      if ('requires_password' in result) {
        setPasswordIncorrect(true);
      } else {
        setUnlockedData(result);
      }
    } catch (unlockError) {
      toast.error(unlockError instanceof Error ? unlockError.message : 'Could not unlock this share.');
    } finally {
      unlockShare.reset();
    }
  };

  // Suspense fallback already shows ShareSkeleton; avoid double skeleton
  if (initialShare.isLoading) return null;

  if (initialShare.error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <h1 className="text-xl font-bold mb-2">Resume Not Found</h1>
        <p className="text-muted-foreground text-sm mb-6">This resume may no longer be shared publicly.</p>
        <a href="/" className="text-primary hover:underline text-sm">Create Your Own Resume →</a>
      </div>
    );
  }

  // Password gate
  if ('requires_password' in data && data.requires_password) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="bg-card border border-border shadow-soft-sm rounded-2xl p-6 max-w-sm w-full space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Password Required</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center">This resume is password protected.</p>
          {passwordIncorrect && (
            <p className="text-sm text-destructive text-center">Incorrect password. Please try again.</p>
          )}
          <Input
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="text-[16px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && passwordInput.trim()) {
                void submitPassword();
              }
            }}
          />
          <Button
            className="w-full"
            disabled={unlockShare.isPending}
            onClick={() => void submitPassword()}
          >
            {unlockShare.isPending ? <MiniSpinner size={16} className="mr-2" /> : null}
            Unlock
          </Button>
          <p className="text-center text-[11px] text-muted-foreground pt-1">
            <a href="/" className="hover:text-foreground transition-colors">← Go to WiseResume</a>
          </p>
        </div>
      </div>
    );
  }

  const { share, resume } = data as PublicShareResult;

  const contactInfo = (resume.contact_info as unknown as ContactInfo) || { fullName: '', email: '', phone: '', location: '' };
  const summary = (resume.summary as string) || '';
  const experience = (resume.experience as unknown as Experience[]) || [];
  const education = (resume.education as unknown as Education[]) || [];
  const skills = (resume.skills as unknown as string[]) || [];
  const projects = (resume.projects as unknown as Project[]) || [];
  const certifications = (resume.certifications as unknown as Certification[]) || [];
  const awards = (resume.awards as unknown as Award[]) || [];
  const publications = (resume.publications as unknown as Publication[]) || [];
  const volunteering = (resume.volunteering as unknown as Volunteering[]) || [];
  const languages = (resume.languages as unknown as Language[]) || [];
  const hobbies = ((resume.hobbies as unknown as Hobby[]) || []).filter(hobby => hobby.visible !== false);
  const references = (resume.references as unknown as Reference[]) || [];

  const handleSubmitFeedback = () => {
    if (!token || !accessToken) return;
    if (!authorName.trim()) { toast.error('Please enter your name'); return; }
    if (!feedbackContent.trim()) { toast.error('Please enter your feedback'); return; }
    addComment.mutate(
      {
        shareToken: token,
        accessToken,
        authorName: authorName.trim(),
        content: feedbackContent.trim(),
        section: feedbackSection,
      },
      {
        onSuccess: () => {
          setFeedbackContent('');
          setFeedbackSection('general');
          addComment.reset();
        },
      }
    );
  };

  const visibleComments = (comments as ShareComment[]).filter(c => !c.is_resolved);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{contactInfo.fullName || (resume.title as string)}</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
            {contactInfo.email && <span>{contactInfo.email}</span>}
            {contactInfo.phone && <span>· {contactInfo.phone}</span>}
            {contactInfo.location && <span>· {contactInfo.location}</span>}
          </div>
        </div>

        {summary && (
          <section className="mb-6">
            <SectionHeading>Summary</SectionHeading>
            <p className="text-sm leading-relaxed">{summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Experience</SectionHeading>
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
                  {exp.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{exp.description}</p>}
                  {(exp.responsibilities || []).length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {(exp.responsibilities || []).map((responsibility, index) => (
                        <li key={index} className="text-xs text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0">{responsibility}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {education.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Education</SectionHeading>
            {education.map(edu => (
              <div key={edu.id} className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{formatDegreeAndField(edu.degree, edu.field)}</h3>
                  <p className="text-xs text-muted-foreground">{edu.institution}</p>
                  {edu.gpa && <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>}
                  {edu.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{edu.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDateRangeDisplay(edu.startDate, edu.endDate, edu.endDate === 'Present')}
                </span>
              </div>
            ))}
          </section>
        )}

        {skills.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Skills</SectionHeading>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-muted rounded-full text-xs">{s}</span>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Projects</SectionHeading>
            <div className="space-y-4">
              {projects.map(project => {
                const projectUrl = safeExternalUrl(project.url || project.githubUrl);
                return (
                  <div key={project.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">{project.name}</h3>
                        {project.role && <p className="text-xs text-muted-foreground">{project.role}</p>}
                      </div>
                      {(project.startDate || project.endDate) && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDateRangeDisplay(project.startDate, project.endDate, project.current === true)}
                        </span>
                      )}
                    </div>
                    {project.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{project.description}</p>}
                    {project.technologies.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{project.technologies.join(' · ')}</p>}
                    {projectUrl && <a href={projectUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">View project</a>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {certifications.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Certifications</SectionHeading>
            <div className="space-y-3">
              {certifications.map(certification => (
                <div key={certification.id} className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">{certification.name}</h3>
                    <p className="text-xs text-muted-foreground">{certification.issuer}</p>
                    {certification.credentialId && <p className="text-xs text-muted-foreground">Credential: {certification.credentialId}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {[certification.date, certification.expiryDate ? `Expires ${certification.expiryDate}` : ''].filter(Boolean).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {awards.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Awards</SectionHeading>
            <div className="space-y-3">
              {awards.map(award => (
                <div key={award.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-sm">{award.title}</h3>
                    <span className="text-xs text-muted-foreground">{award.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{award.issuer}</p>
                  {award.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{award.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {publications.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Publications</SectionHeading>
            <div className="space-y-3">
              {publications.map(publication => {
                const publicationUrl = safeExternalUrl(publication.url);
                return (
                  <div key={publication.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-sm">{publication.title}</h3>
                      <span className="text-xs text-muted-foreground">{publication.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{[publication.publisher, publication.coAuthors].filter(Boolean).join(' · ')}</p>
                    {publication.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{publication.description}</p>}
                    {publicationUrl && <a href={publicationUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">View publication</a>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {volunteering.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Volunteering</SectionHeading>
            <div className="space-y-3">
              {volunteering.map(item => (
                <div key={item.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm">{item.role}</h3>
                      <p className="text-xs text-muted-foreground">{item.organization}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateRangeDisplay(item.startDate, item.endDate, item.current === true)}</span>
                  </div>
                  {item.hours && <p className="text-xs text-muted-foreground">{item.hours}</p>}
                  {item.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{item.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {languages.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Languages</SectionHeading>
            <div className="flex flex-wrap gap-1.5">
              {languages.map(language => (
                <span key={language.id} className="px-2 py-0.5 bg-muted rounded-full text-xs">
                  {language.name}{language.proficiency ? ` · ${language.proficiency}` : ''}
                </span>
              ))}
            </div>
          </section>
        )}

        {hobbies.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Interests</SectionHeading>
            <div className="space-y-2">
              {hobbies.map(hobby => (
                <div key={hobby.id}>
                  <h3 className="font-semibold text-sm">{hobby.name}</h3>
                  {hobby.description && <p className="text-xs text-muted-foreground">{hobby.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {references.length > 0 && (
          <section className="mb-6">
            <SectionHeading>References</SectionHeading>
            <div className="space-y-3">
              {references.map(reference => (
                <div key={reference.id}>
                  {reference.availableOnRequest ? (
                    <p className="text-sm text-muted-foreground">Available on request</p>
                  ) : (
                    <>
                      <h3 className="font-semibold text-sm">{reference.name}</h3>
                      <p className="text-xs text-muted-foreground">{[reference.title, reference.company].filter(Boolean).join(' · ')}</p>
                      <p className="text-xs text-muted-foreground">{[reference.email, reference.phone].filter(Boolean).join(' · ')}</p>
                      {reference.relationship && <p className="text-xs text-muted-foreground">{reference.relationship}</p>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 border-t border-border pt-6">
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border touch-manipulation active:scale-[0.98] min-h-[48px]"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm">Leave Feedback</span>
              {visibleComments.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{visibleComments.length}</Badge>
              )}
            </div>
            {feedbackOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {feedbackOpen && (
            <div className="mt-3 space-y-3">
              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                <Input
                  placeholder="Your name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="text-[16px]"
                />
                <Select value={feedbackSection} onValueChange={setFeedbackSection}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Section (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Your feedback (max 1000 chars)..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value.slice(0, 1000))}
                  className="text-[16px] min-h-[80px]"
                  rows={3}
                />
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={addComment.isPending}
                  className="w-full min-h-[48px]"
                >
                  {addComment.isPending ? <MiniSpinner size={16} className="mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit Feedback
                </Button>
              </div>

              {visibleComments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Recent Feedback</p>
                  {visibleComments.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-xl bg-card border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{comment.author_name}</span>
                        {comment.section && comment.section !== 'general' && (
                          <Badge variant="outline" className="text-[10px] capitalize">{comment.section}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border px-4 py-4 bg-background/95 backdrop-blur-sm">
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

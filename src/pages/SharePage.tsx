import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Lock, MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShareSkeleton } from '@/components/layout/PageSkeletons';
import { usePublicResume, useResumeShareMutations, PublicShareResult } from '@/hooks/useResumeShares';
import { usePublicShareComments, useAddShareComment, type ShareComment } from '@/hooks/useShareComments';
import { ContactInfo, Experience, Education } from '@/types/resume';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const SECTIONS = ['summary', 'experience', 'education', 'skills', 'general'] as const;

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [passwordAttempt, setPasswordAttempt] = useState<string | undefined>(undefined);
  const [passwordInput, setPasswordInput] = useState('');
  const { data, isLoading, error } = usePublicResume(token || null, passwordAttempt);
  const { incrementViewCount } = useResumeShareMutations();
  const [viewCounted, setViewCounted] = useState(false);

  // Feedback state
  const { data: comments = [] } = usePublicShareComments(token || null);
  const addComment = useAddShareComment();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSection, setFeedbackSection] = useState<string>('general');

  // Increment view count once when resume loads successfully
  useEffect(() => {
    if (token && data && 'share' in data && !viewCounted) {
      incrementViewCount.mutate(token);
      setViewCounted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, data, viewCounted]);

  // Suspense fallback already shows ShareSkeleton; avoid double skeleton
  if (isLoading) return null;

  if (error || !data) {
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
    const isWrongPassword = passwordAttempt !== undefined;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="glass-card rounded-2xl p-6 max-w-sm w-full space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Password Required</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center">This resume is password protected.</p>
          {isWrongPassword && (
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
                setPasswordAttempt(passwordInput);
              }
            }}
          />
          <Button
            className="w-full"
            onClick={() => {
              if (!passwordInput.trim()) {
                toast.error('Please enter a password');
                return;
              }
              setPasswordAttempt(passwordInput);
            }}
          >
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

  const handleSubmitFeedback = () => {
    if (!token) return;
    if (!authorName.trim()) { toast.error('Please enter your name'); return; }
    if (!feedbackContent.trim()) { toast.error('Please enter your feedback'); return; }
    addComment.mutate(
      { shareToken: token, authorName: authorName.trim(), content: feedbackContent.trim(), section: feedbackSection },
      {
        onSuccess: () => {
          setFeedbackContent('');
          setFeedbackSection('general');
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Summary</h2>
            <p className="text-sm leading-relaxed">{summary}</p>
          </section>
        )}

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

        <section className="mt-10 border-t border-border pt-6">
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl glass-surface touch-manipulation active:scale-[0.98] min-h-[48px]"
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
              <div className="p-4 rounded-xl glass-surface space-y-3">
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
                    <div key={comment.id} className="p-3 rounded-xl glass-surface">
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

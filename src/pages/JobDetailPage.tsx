import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, Clock, Bell, Share2, Briefcase, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobApplication, useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { useResumes } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'saved', label: 'Saved', color: 'bg-muted text-muted-foreground' },
  { value: 'applied', label: 'Applied', color: 'bg-primary/20 text-primary' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-secondary/20 text-secondary' },
  { value: 'offer', label: 'Offer', color: 'bg-success/20 text-success' },
  { value: 'rejected', label: 'Rejected', color: 'bg-destructive/20 text-destructive' },
];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job, isLoading } = useJobApplication(id || null);
  const { data: resumes } = useResumes();
  const { updateApplication } = useJobApplicationMutations();
  const [notes, setNotes] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) return <PageLoadingSpinner />;
  if (!job) return (
    <div className="flex-1 flex items-center justify-center p-6">
      <p className="text-muted-foreground">Application not found</p>
    </div>
  );

  const currentNotes = notes ?? job.notes ?? '';
  const deadlineDist = job.deadline ? formatDistanceToNow(new Date(job.deadline), { addSuffix: true }) : null;

  const handleSaveNotes = () => {
    updateApplication.mutate({ id: job.id, notes: currentNotes });
    setIsEditingNotes(false);
  };

  const handleStatusChange = (status: ApplicationStatus) => {
    updateApplication.mutate({ id: job.id, status });
  };

  const handleResumeSelect = (resumeId: string) => {
    updateApplication.mutate({ id: job.id, resume_id: resumeId, status: 'applied' });
  };

  const handleShare = async () => {
    const text = `${job.job_title} at ${job.company}`;
    if (job.url && navigator.share) {
      try {
        await navigator.share({ title: text, url: job.url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(job.url || text);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto overscroll-y-contain pb-6"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/applications')} className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold truncate flex-1">{job.job_title}</h1>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Company Card */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{job.job_title}</h2>
                <p className="text-muted-foreground">{job.company}</p>
              </div>
            </div>
            <Badge className={STATUS_OPTIONS.find(s => s.value === job.status)?.color}>
              {STATUS_OPTIONS.find(s => s.value === job.status)?.label}
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-secondary hover:underline">
              <ExternalLink className="w-4 h-4" />
              View Job Posting
            </a>
          )}
          {job.applied_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Applied {format(new Date(job.applied_at), 'MMM d, yyyy')}
            </div>
          )}
          {job.deadline && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Deadline {deadlineDist}
            </div>
          )}
          {job.remind_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="w-4 h-4" />
              Reminder set for {format(new Date(job.remind_at), 'MMM d, h:mm a')}
            </div>
          )}
        </div>

        {/* Apply with Resume (if saved) */}
        {job.status === 'saved' && resumes && resumes.length > 0 && (
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Apply with Resume</h3>
            <Select onValueChange={handleResumeSelect}>
              <SelectTrigger><SelectValue placeholder="Select a resume" /></SelectTrigger>
              <SelectContent>
                {resumes.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notes</h3>
            {!isEditingNotes && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>Edit</Button>
            )}
          </div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <Textarea value={currentNotes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this application..." rows={4} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} disabled={updateApplication.isPending}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditingNotes(false); setNotes(null); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentNotes || 'No notes yet'}</p>
          )}
        </div>

        {/* Share */}
        <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
          <Share2 className="w-4 h-4" /> Share Job
        </Button>

        {/* Update Status */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm px-1">Update Status</h3>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <Button
                key={s.value}
                variant={job.status === s.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => handleStatusChange(s.value)}
                disabled={updateApplication.isPending}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

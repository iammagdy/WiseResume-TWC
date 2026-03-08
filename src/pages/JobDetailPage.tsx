import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Share2, Briefcase, Bookmark, BookmarkCheck, Trash2, DollarSign, Clock } from 'lucide-react';
import { openExternal } from '@/lib/openExternal';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJob, useJobMutations } from '@/hooks/useJobs';
import { useJobApplicationMutations } from '@/hooks/useJobApplications';
import { useResumes } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DetailSkeleton } from '@/components/layout/PageSkeletons';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job, isLoading } = useJob(id || null);
  const { data: resumes } = useResumes();
  const { updateJob, deleteJob } = useJobMutations();
  const { createApplication } = useJobApplicationMutations();
  const [showApply, setShowApply] = useState(false);

  // Auth guard handled by ProtectedRoute
  // Suspense fallback already shows DetailSkeleton; avoid double skeleton
  if (isLoading) return null;
  if (!job) return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <Briefcase className="w-12 h-12 text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground font-medium">Job not found</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate('/applications')}>Go back</Button>
    </div>
  );

  const handleToggleSave = () => {
    updateJob.mutate({ id: job.id, is_saved: !job.is_saved });
  };

  const handleApplyWithResume = (resumeId: string) => {
    createApplication.mutate(
      { job_title: job.title, company: job.company, resume_id: resumeId, status: 'applied', url: job.source_url || undefined },
      { onSuccess: (data) => { navigate(`/application/${data.id}`); } }
    );
    setShowApply(false);
  };

  const handleShare = async () => {
    const text = `${job.title} at ${job.company}`;
    if (job.source_url && navigator.share) {
      try { await navigator.share({ title: text, url: job.source_url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(job.source_url || text);
      toast.success('Copied to clipboard');
    }
  };

  const handleDelete = () => {
    deleteJob.mutate(job.id, { onSuccess: () => navigate('/applications') });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-h-0 h-full overflow-y-auto overscroll-y-contain pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/applications')} className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold truncate flex-1">Job Details</h1>
        <button onClick={handleToggleSave} className="p-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
          {job.is_saved ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Title Card */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{job.title}</h2>
              <p className="text-muted-foreground">{job.company}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{job.job_type}</Badge>
            {job.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> {job.location}
              </span>
            )}
            {job.salary_range && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" /> {job.salary_range}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Posted {format(new Date(job.posted_date), 'MMM d, yyyy')}
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-sm">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-sm">Requirements</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
          </div>
        )}

        {/* Source URL */}
        {job.source_url && (
          <button onClick={() => openExternal(job.source_url!)} className="glass-card rounded-2xl p-4 flex items-center gap-2 text-sm text-secondary hover:underline w-full touch-manipulation">
            <ExternalLink className="w-4 h-4" /> View Original Posting
          </button>
        )}

        {/* Apply with Resume */}
        {showApply && resumes && resumes.length > 0 ? (
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Apply with Resume</h3>
            <Select onValueChange={handleApplyWithResume}>
              <SelectTrigger><SelectValue placeholder="Select a resume" /></SelectTrigger>
              <SelectContent>
                {resumes.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setShowApply(false)}>Cancel</Button>
          </div>
        ) : (
          <Button className="w-full gap-2" onClick={() => setShowApply(true)}>
            <Briefcase className="w-4 h-4" /> Apply with Resume
          </Button>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleShare}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleteJob.isPending}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

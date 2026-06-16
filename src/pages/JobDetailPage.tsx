import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, MapPin, Share2, Briefcase, Bookmark, BookmarkCheck, Trash2, DollarSign, Clock, FileText, PenLine, BarChart2 } from 'lucide-react';
import { openExternal } from '@/lib/openExternal';
import { motion } from 'framer-motion';
import { safeFormatDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJob, useJobMutations } from '@/hooks/useJobs';
import { useJobApplicationMutations } from '@/hooks/useJobApplications';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';

import { DetailSkeleton } from '@/components/layout/PageSkeletons';

function computeMatch(requirements: string, resumeSkills: string[]): { score: number; missing: string[] } {
  if (!requirements || resumeSkills.length === 0) return { score: 0, missing: [] };
  const reqWords = requirements.toLowerCase().match(/\b[a-z][a-z0-9+#._-]{2,}\b/g) || [];
  const skillsLower = resumeSkills.map(s => s.toLowerCase());
  const unique = [...new Set(reqWords)];
  const matched = unique.filter(w => skillsLower.some(s => s.includes(w) || w.includes(s)));
  const missing = unique
    .filter(w => !skillsLower.some(s => s.includes(w) || w.includes(s)))
    .filter(w => w.length > 3)
    .slice(0, 8);
  const score = unique.length > 0 ? Math.round((matched.length / unique.length) * 100) : 0;
  return { score, missing };
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job, isLoading } = useJob(id || null);
  const { data: resumes } = useResumes();
  const { updateJob, deleteJob } = useJobMutations();
  const { createApplication } = useJobApplicationMutations();
  const [showApply, setShowApply] = useState(false);

  const primaryResume = useMemo(
    () => (resumes && resumes.length > 0 ? dbToResumeData(resumes[0]) : null),
    [resumes],
  );
  const { score: matchScore, missing: missingSkills } = useMemo(
    () => computeMatch(job?.requirements ?? '', primaryResume?.skills ?? []),
    [job?.requirements, primaryResume?.skills],
  );

  if (isLoading) return <DetailSkeleton />;
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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <BackButton />
        <h1 className="text-lg font-bold truncate flex-1">Job Details</h1>
        <button onClick={handleToggleSave} className="p-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
          {job.is_saved ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Title Card */}
        <div className="bg-card border border-border shadow-soft-sm rounded-2xl p-5 space-y-3">
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
            Posted {safeFormatDate(job.posted_date, 'MMM d, yyyy')}
          </div>
        </div>

        {/* AI Match Score */}
        {primaryResume && matchScore > 0 && (
          <div className="bg-card border border-border shadow-soft-sm rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Resume Match</span>
              </div>
              <Badge
                variant="outline"
                className={
                  matchScore >= 70
                    ? 'text-green-600 border-green-500/40 bg-green-500/10'
                    : matchScore >= 45
                    ? 'text-amber-600 border-amber-500/40 bg-amber-500/10'
                    : 'text-destructive border-destructive/40 bg-destructive/10'
                }
              >
                {matchScore}% Match
              </Badge>
            </div>
            {missingSkills.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Possible gaps:</p>
                <div className="flex flex-wrap gap-1.5">
                  {missingSkills.map(skill => (
                    <span key={skill} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="flex-col h-auto py-3 gap-1.5 rounded-xl text-xs"
            onClick={() => navigate('/tailor', { state: { jobDescription: job.description + '\n\nRequirements:\n' + job.requirements } })}
          >
            <FileText className="w-4 h-4 text-primary" />
            Tailor Resume
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 gap-1.5 rounded-xl text-xs"
            onClick={() => navigate('/cover-letter/new', { state: { jobTitle: job.title, company: job.company } })}
          >
            <PenLine className="w-4 h-4 text-primary" />
            Cover Letter
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 gap-1.5 rounded-xl text-xs"
            onClick={() => createApplication.mutate({ job_title: job.title, company: job.company, status: 'saved' })}
            disabled={createApplication.isPending}
          >
            <Briefcase className="w-4 h-4 text-primary" />
            Track
          </Button>
        </div>

        {/* Description */}
        {job.description && (
          <div className="bg-card border border-border shadow-soft-sm rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-sm">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="bg-card border border-border shadow-soft-sm rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-sm">Requirements</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
          </div>
        )}

        {/* Source URL */}
        {job.source_url && (
          <button onClick={() => openExternal(job.source_url!)} className="bg-card border border-border shadow-soft-sm rounded-2xl p-4 flex items-center gap-2 text-sm text-secondary hover:underline w-full touch-manipulation">
            <ExternalLink className="w-4 h-4" /> View Original Posting
          </button>
        )}

        {/* Apply with Resume */}
        {showApply && resumes && resumes.length > 0 ? (
          <div className="bg-card border border-border shadow-soft-sm rounded-2xl p-4 space-y-3">
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

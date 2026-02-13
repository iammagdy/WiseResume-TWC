import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Circle, Briefcase, FileText, Bell, Calendar, Trash2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useJobApplication, useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { useCoverLetter } from '@/hooks/useCoverLetters';
import { useResumes } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

const STAGES: { key: ApplicationStatus; label: string }[] = [
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offer', label: 'Offer' },
];

const STAGE_ORDER: Record<string, number> = { saved: 0, applied: 1, screening: 2, interviewing: 3, offer: 4, rejected: -1 };

export default function ApplicationTrackerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: app, isLoading } = useJobApplication(id || null);
  const { data: resumes } = useResumes();
  const { updateApplication, deleteApplication } = useJobApplicationMutations();
  const { data: coverLetter } = useCoverLetter(app?.cover_letter_id || null);
  const [notes, setNotes] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');

  if (!user) { navigate('/auth'); return null; }
  if (isLoading) return <PageLoadingSpinner />;
  if (!app) return (
    <div className="flex-1 flex items-center justify-center p-6">
      <p className="text-muted-foreground">Application not found</p>
    </div>
  );

  const currentNotes = notes ?? app.notes ?? '';
  const currentStageIdx = STAGE_ORDER[app.status] ?? -1;
  const isRejected = app.status === 'rejected';
  const linkedResume = resumes?.find(r => r.id === app.resume_id);

  const handleSaveNotes = () => {
    updateApplication.mutate({ id: app.id, notes: currentNotes });
    setIsEditingNotes(false);
  };

  const handleSetReminder = () => {
    if (!reminderDate) return;
    updateApplication.mutate({ id: app.id, remind_at: new Date(reminderDate).toISOString() });
    setShowReminder(false);
    toast.success('Reminder set!');
  };

  const handleStatusChange = (status: ApplicationStatus) => {
    updateApplication.mutate({ id: app.id, status });
  };

  const handleDelete = () => {
    deleteApplication.mutate(app.id, { onSuccess: () => navigate('/applications') });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-h-0 h-full overflow-y-auto overscroll-y-contain pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/applications')} className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold truncate flex-1">Application Details</h1>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Status Timeline */}
        <div className="glass-card rounded-2xl p-5">
          {isRejected ? (
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">✕</div>
              <span className="font-semibold">Rejected</span>
            </div>
          ) : (
            <div className="space-y-0">
              {STAGES.map((stage, idx) => {
                const isComplete = idx <= currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <div key={stage.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                        isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                        {isComplete ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </div>
                      {idx < STAGES.length - 1 && (
                        <div className={`w-0.5 h-8 ${isComplete ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                    <span className={`text-sm pt-1 ${isCurrent ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Job Summary */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="font-semibold">{app.job_title}</span>
          </div>
          <p className="text-sm text-muted-foreground">{app.company}</p>
          {app.applied_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Applied {format(new Date(app.applied_at), 'MMM d, yyyy')}
            </div>
          )}
          {app.deadline && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Deadline: {format(new Date(app.deadline), 'MMM d, yyyy')}
            </div>
          )}
        </div>

        {/* Linked Resume */}
        {linkedResume && (
          <button
            onClick={() => navigate(`/resume/${linkedResume.id}`)}
            className="glass-card rounded-2xl p-4 flex items-center gap-3 w-full text-left hover:bg-muted/30 transition-colors"
          >
            <FileText className="w-5 h-5 text-secondary" />
            <div>
              <p className="text-sm font-medium">{linkedResume.title}</p>
              <p className="text-xs text-muted-foreground">Linked resume</p>
            </div>
          </button>
        )}

        {/* Linked Cover Letter */}
        {coverLetter && (
          <button
            onClick={() => navigate('/cover-letter')}
            className="glass-card rounded-2xl p-4 flex items-center gap-3 w-full text-left hover:bg-muted/30 transition-colors"
          >
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{coverLetter.title || coverLetter.job_title}</p>
              <p className="text-xs text-muted-foreground">Linked cover letter</p>
            </div>
          </button>
        )}

        {/* Notes */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notes</h3>
            {!isEditingNotes && <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>Edit</Button>}
          </div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <Textarea value={currentNotes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." rows={4} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} disabled={updateApplication.isPending}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditingNotes(false); setNotes(null); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentNotes || 'No notes yet'}</p>
          )}
        </div>

        {/* Set Reminder */}
        <div className="space-y-2">
          {showReminder ? (
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-sm">Set Reminder</h3>
              <Input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="text-[16px]" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSetReminder}>Set</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReminder(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowReminder(true)}>
              <Bell className="w-4 h-4" /> Set Reminder
            </Button>
          )}
        </div>

        {/* Update Status */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm px-1">Update Status</h3>
          <div className="flex flex-wrap gap-2">
            {[...STAGES, { key: 'rejected' as ApplicationStatus, label: 'Rejected' }].map(s => (
              <Button
                key={s.key}
                variant={app.status === s.key ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => handleStatusChange(s.key)}
                disabled={updateApplication.isPending}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Delete */}
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:text-destructive border-destructive/30"
          onClick={handleDelete}
          disabled={deleteApplication.isPending}
        >
          <Trash2 className="w-4 h-4" /> Delete Application
        </Button>
      </div>
    </motion.div>
  );
}

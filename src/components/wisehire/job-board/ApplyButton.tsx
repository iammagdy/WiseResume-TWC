import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, Loader2, CheckCircle2, LogIn } from 'lucide-react';
import { useApplyToRole, useHasApplied } from '@/hooks/wisehire/useApplications';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

interface Props {
  roleId: string;
  roleTitle: string;
}

export function ApplyButton({ roleId, roleTitle }: Props) {
  const { isAuthenticated } = useAuth();
  const { data: hasApplied } = useHasApplied(roleId);
  const applyMutation = useApplyToRole();
  const [open, setOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');

  if (!isAuthenticated) {
    return (
      <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(window.location.pathname)}`}>
        <Button className="gap-2 w-full sm:w-auto">
          <LogIn className="h-4 w-4" />
          Sign in to Apply
        </Button>
      </Link>
    );
  }

  if (hasApplied) {
    return (
      <Button disabled variant="outline" className="gap-2 text-emerald-600 border-emerald-300 dark:border-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Application Submitted
      </Button>
    );
  }

  function handleApply() {
    applyMutation.mutate(
      { role_id: roleId, cover_note: coverNote.trim() || undefined },
      { onSuccess: () => { setOpen(false); setCoverNote(''); } },
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto">
        <Send className="h-4 w-4" />
        Apply Now
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for {roleTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your latest WiseResume profile will be submitted to the hiring team. They will receive your name, email, and resume.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs">Cover note (optional)</Label>
              <Textarea
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Briefly introduce yourself or highlight why you're a great fit…"
                rows={4}
                className="resize-none text-sm"
                disabled={applyMutation.isPending}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={applyMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={applyMutation.isPending} className="gap-2">
                {applyMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
                Submit Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

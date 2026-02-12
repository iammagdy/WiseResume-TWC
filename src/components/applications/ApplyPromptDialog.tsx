import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, X } from 'lucide-react';
import { useJobApplicationMutations } from '@/hooks/useJobApplications';
import { haptics } from '@/lib/haptics';

interface ApplyPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  company: string;
  resumeId?: string;
  jobUrl?: string;
}

export function ApplyPromptDialog({
  open,
  onOpenChange,
  jobTitle,
  company,
  resumeId,
  jobUrl,
}: ApplyPromptDialogProps) {
  const { createApplication } = useJobApplicationMutations();

  const handleYes = async () => {
    haptics.medium();
    await createApplication.mutateAsync({
      job_title: jobTitle,
      company,
      status: 'applied',
      resume_id: resumeId,
      url: jobUrl,
    });
    onOpenChange(false);
  };

  const handleNo = async () => {
    haptics.selection();
    await createApplication.mutateAsync({
      job_title: jobTitle,
      company,
      status: 'saved',
      resume_id: resumeId,
      url: jobUrl,
    });
    onOpenChange(false);
  };

  const handleIWill = async () => {
    haptics.selection();
    const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await createApplication.mutateAsync({
      job_title: jobTitle,
      company,
      status: 'saved',
      resume_id: resumeId,
      url: jobUrl,
      remind_at: remindAt,
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">Did you apply?</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {jobTitle} at {company}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleYes} className="w-full h-12 gap-2" disabled={createApplication.isPending}>
            <CheckCircle className="w-4 h-4" />
            Yes, I applied!
          </Button>
          <Button onClick={handleIWill} variant="outline" className="w-full h-12 gap-2" disabled={createApplication.isPending}>
            <Clock className="w-4 h-4" />
            I will (remind me in 1h)
          </Button>
          <Button onClick={handleNo} variant="ghost" className="w-full h-12 gap-2 text-muted-foreground" disabled={createApplication.isPending}>
            <X className="w-4 h-4" />
            Not yet
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

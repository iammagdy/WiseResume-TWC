import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const { createApplication } = useJobApplicationMutations();
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [date, setDate] = useState('');

  const canSubmit = company.trim() && jobTitle.trim() && !createApplication.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    haptics.medium();
    try {
      await createApplication.mutateAsync({
        job_title: jobTitle.trim(),
        company: company.trim(),
        status,
        deadline: date ? new Date(date).toISOString() : undefined,
      });
      toast.success('Application added!');
      onOpenChange(false);
      setCompany('');
      setJobTitle('');
      setStatus('applied');
      setDate('');
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="shrink-0 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <SheetTitle>Quick Add Application</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="qa-company">Company *</Label>
              <Input
                id="qa-company"
                placeholder="e.g. Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
                autoFocus
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="qa-title">Role Title *</Label>
              <Input
                id="qa-title"
                placeholder="e.g. Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                autoComplete="organization-title"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="interviewing">Interviewing</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qa-date">Deadline</Label>
              <Input
                id="qa-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 pb-safe flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {createApplication.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

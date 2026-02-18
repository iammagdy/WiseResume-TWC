import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardPaste } from 'lucide-react';
import { useJobMutations } from '@/hooks/useJobs';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveJobSheet({ open, onOpenChange }: Props) {
  const { createJob } = useJobMutations();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('full-time');
  const [salaryRange, setSalaryRange] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('http')) {
        setSourceUrl(text);
        haptics.success();
        toast.success('URL pasted');
      } else {
        toast.info('No URL found in clipboard');
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  };

  const handleSave = () => {
    if (!title.trim() || !company.trim()) {
      toast.error('Title and company are required');
      return;
    }

    haptics.success();
    createJob.mutate({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      job_type: jobType,
      salary_range: salaryRange.trim() || undefined,
      source_url: sourceUrl.trim() || undefined,
      description: description.trim(),
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setTitle('');
        setCompany('');
        setLocation('');
        setJobType('full-time');
        setSalaryRange('');
        setSourceUrl('');
        setDescription('');
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-3xl flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>Save Job</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 mt-4 min-h-0">
          <Input placeholder="Job Title *" value={title} onChange={e => setTitle(e.target.value)} autoComplete="organization-title" />
          <Input placeholder="Company *" value={company} onChange={e => setCompany(e.target.value)} autoComplete="organization" />
          <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} autoComplete="address-level2" />
          
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger>
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="Salary Range" value={salaryRange} onChange={e => setSalaryRange(e.target.value)} inputMode="text" />
          
          <div className="flex gap-2">
            <Input placeholder="Source URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="flex-1" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            <Button variant="outline" size="icon" onClick={handlePasteUrl} className="shrink-0 min-w-[48px] min-h-[48px]">
              <ClipboardPaste className="w-4 h-4" />
            </Button>
          </div>

          <Textarea
            placeholder="Job description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div className="shrink-0 pt-3 pb-safe border-t border-border">
          <Button
            onClick={handleSave}
            disabled={!title.trim() || !company.trim() || createJob.isPending}
            className="w-full min-h-[48px] active:scale-95"
          >
            {createJob.isPending ? 'Saving...' : 'Save Job'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

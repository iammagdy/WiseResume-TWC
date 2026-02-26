import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';
import { useAuth } from '@/hooks/useAuth';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { toast } from 'sonner';

interface AddApplicationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: {
    job_title?: string;
    company?: string;
    resume_id?: string;
  };
}

export function AddApplicationSheet({ open, onOpenChange, defaultValues }: AddApplicationSheetProps) {
  const { user } = useAuth();
  const { createApplication } = useJobApplicationMutations();
  const [jobTitle, setJobTitle] = useState(defaultValues?.job_title || '');
  const [company, setCompany] = useState(defaultValues?.company || '');
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState('');
  const [resumeId, setResumeId] = useState(defaultValues?.resume_id || '');
  const [isParsingUrl, setIsParsingUrl] = useState(false);

  const { data: resumes } = useQuery({
    queryKey: ['resumes-list', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('resumes')
        .select('id, title')
        .order('updated_at', { ascending: false });
      return data || [];
    },
    enabled: !!user && open,
  });

  const handleUrlBlur = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith('http')) return;

    setIsParsingUrl(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/parse-job-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ url: trimmed }),
        }
      );
      if (res.ok) {
        const parsed = await res.json();
        if (parsed.title && !jobTitle) setJobTitle(parsed.title);
        if (parsed.company && !company) setCompany(parsed.company);
        if (parsed.deadline) setDeadline(parsed.deadline.split('T')[0]);
      }
    } catch {
      // Silent fail - URL parsing is optional
    } finally {
      setIsParsingUrl(false);
    }
  }, [url, jobTitle, company]);

  const handleSubmit = async () => {
    if (!jobTitle.trim() || !company.trim()) return;

    await createApplication.mutateAsync({
      job_title: jobTitle.trim(),
      company: company.trim(),
      status,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
      resume_id: resumeId || defaultValues?.resume_id,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });

    onOpenChange(false);
    setJobTitle('');
    setCompany('');
    setStatus('applied');
    setUrl('');
    setNotes('');
    setDeadline('');
    setResumeId('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>Track Application</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">Job URL</Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://... (paste to auto-detect details)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
              />
              {isParsingUrl && (
                <MiniSpinner size={16} className="absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-title">Job Title *</Label>
            <Input
              id="job-title"
              placeholder="e.g. Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              autoComplete="organization-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              placeholder="e.g. Google"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interviewing">Interviewing</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {resumes && resumes.length > 0 && (
            <div className="space-y-2">
              <Label>Linked Resume</Label>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resume..." />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this application..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="shrink-0 pt-2 pb-safe">
          <Button
            className="w-full h-12"
            onClick={handleSubmit}
            disabled={!jobTitle.trim() || !company.trim() || createApplication.isPending}
          >
            {createApplication.isPending ? 'Saving...' : 'Track Application'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

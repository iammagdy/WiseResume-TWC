import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickAddInlineProps {
  defaultStatus: ApplicationStatus;
  onClose: () => void;
}

export function QuickAddInline({ defaultStatus, onClose }: QuickAddInlineProps) {
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [url, setUrl] = useState('');
  const { createApplication } = useJobApplicationMutations();
  const companyRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    companyRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = async () => {
    const trimmedCompany = company.trim();
    const trimmedTitle = jobTitle.trim();
    if (!trimmedCompany || !trimmedTitle) {
      toast.error('Company and job title are required');
      return;
    }
    haptics.medium();
    try {
      await createApplication.mutateAsync({
        company: trimmedCompany,
        job_title: trimmedTitle,
        status: defaultStatus,
        url: url.trim() || undefined,
        applied_at: new Date().toISOString(),
      });
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  const inputClass = cn(
    'w-full text-[12px] bg-muted rounded-lg px-3 py-2 outline-none',
    'border border-transparent focus:border-primary/50 transition-colors',
    'placeholder:text-muted-foreground',
  );

  return (
    <div
      ref={containerRef}
      className="mt-2 bg-card border border-border rounded-xl p-3 space-y-2 shadow-lg"
    >
      <input
        ref={companyRef}
        type="text"
        placeholder="Company *"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className={inputClass}
        autoComplete="organization"
      />
      <input
        type="text"
        placeholder="Job title *"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        className={inputClass}
        autoComplete="organization-title"
      />
      <input
        type="url"
        placeholder="Job URL (optional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className={inputClass}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      <div className="flex gap-2 pt-0.5">
        <button
          onClick={handleSubmit}
          disabled={!company.trim() || !jobTitle.trim() || createApplication.isPending}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg',
            'bg-primary text-primary-foreground text-xs font-semibold',
            'disabled:opacity-50 transition-opacity active:scale-95',
          )}
        >
          <Check className="w-3 h-3" />
          {createApplication.isPending ? 'Adding…' : 'Add'}
        </button>
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { FileText, Star } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResumes, dbToResumeData, type DatabaseResume } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';

interface ResumePickerProps {
  /** When true, the picker is disabled (e.g. mid-interview). */
  disabled?: boolean;
  /** Optional callback fired after a successful switch. */
  onChange?: (resumeId: string) => void;
  className?: string;
}

/**
 * Compact in-page resume switcher shown above the Interview setup / preview.
 * Lets the user choose which resume the AI interviewer should know about
 * without leaving the page.
 */
export function ResumePicker({ disabled, onChange, className }: ResumePickerProps) {
  const { data: resumes, isLoading } = useResumes();
  const { currentResumeId, setCurrentResume, setCurrentResumeId } = useResumeStore();

  const sorted = useMemo<DatabaseResume[]>(() => {
    if (!resumes) return [];
    return [...resumes].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [resumes]);

  if (isLoading || sorted.length === 0) return null;

  const handleChange = (id: string) => {
    const picked = sorted.find((r) => r.id === id);
    if (!picked) return;
    setCurrentResumeId(picked.id);
    setCurrentResume(dbToResumeData(picked));
    onChange?.(picked.id);
  };

  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        Practicing as
      </label>
      <Select
        value={currentResumeId ?? undefined}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full bg-card">
          <SelectValue placeholder="Choose a resume" />
        </SelectTrigger>
        <SelectContent>
          {sorted.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              <span className="flex items-center gap-2">
                {r.is_primary ? (
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="truncate">
                  {r.title || 'Untitled resume'}
                  {r.is_primary && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">
                      Master
                    </span>
                  )}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

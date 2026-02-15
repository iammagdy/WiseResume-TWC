import { useNavigate } from 'react-router-dom';
import { Crown, FileText, Scissors, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useResumes, useSetMasterCV } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

type FilterType = 'originals' | 'tailored';

interface ResumeListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: FilterType;
}

export function ResumeListSheet({ open, onOpenChange, filter }: ResumeListSheetProps) {
  const navigate = useNavigate();
  const { data: resumes = [], isLoading } = useResumes();
  const setMasterCV = useSetMasterCV();

  const filtered = resumes.filter((r) =>
    filter === 'originals' ? !r.parent_resume_id : !!r.parent_resume_id
  );

  const title = filter === 'originals' ? 'Resumes Created' : 'Tailored Versions';
  const Icon = filter === 'originals' ? FileText : Scissors;

  const handleTap = (resumeId: string) => {
    haptics.selection();
    onOpenChange(false);
    navigate(`/resume/${resumeId}`);
  };

  const handleSetMaster = (resumeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.medium();
    setMasterCV.mutate(resumeId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col p-0">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <SheetTitle>{title}</SheetTitle>
            <Badge variant="secondary" className="ml-auto">{filtered.length}</Badge>
          </div>
          <SheetDescription>
            {filter === 'originals' ? 'Your base resumes' : 'Resumes tailored for specific jobs'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === 'originals' ? 'No resumes created yet' : 'No tailored versions yet'}
              </p>
            </div>
          ) : (
            filtered.map((resume) => (
              <button
                key={resume.id}
                onClick={() => handleTap(resume.id)}
                className="w-full glass-surface rounded-2xl p-4 border border-border/20 text-left transition-all active:scale-[0.98] hover:border-border/40 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{resume.title}</p>
                    {resume.is_primary && (
                      <Crown className="w-4 h-4 text-warning shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(resume.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {resume.target_job_title && (
                    <Badge variant="glass" className="mt-2 text-[10px]">
                      {resume.target_job_title}
                      {resume.target_company ? ` @ ${resume.target_company}` : ''}
                    </Badge>
                  )}
                </div>
                {filter === 'originals' && !resume.is_primary && (
                  <button
                    onClick={(e) => handleSetMaster(resume.id, e)}
                    className="shrink-0 text-[10px] text-muted-foreground hover:text-primary border border-border/30 rounded-lg px-2 py-1 transition-colors"
                  >
                    Set as Master
                  </button>
                )}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

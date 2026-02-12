import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import { useResumeVersions, useResumeVersionMutations } from '@/hooks/useResumeVersions';
import { useResumeStore } from '@/store/resumeStore';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface VersionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeId: string | null;
}

export function VersionHistorySheet({ open, onOpenChange, resumeId }: VersionHistorySheetProps) {
  const { data: versions, isLoading } = useResumeVersions(resumeId);
  const { deleteVersion } = useResumeVersionMutations();
  const setCurrentResume = useResumeStore((s) => s.setCurrentResume);

  const handleRestore = (version: (typeof versions)[number]) => {
    haptics.medium();
    setCurrentResume(version.snapshot);
    toast.success(`Restored to version ${version.version_number}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70dvh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Version History
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : !versions?.length ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No versions saved yet</p>
              <p className="text-xs text-muted-foreground mt-1">Versions are saved automatically when you edit</p>
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 rounded-xl glass-surface border border-border/20"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">Version {version.version_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                  </p>
                  {version.change_summary && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{version.change_summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(version)}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Restore
                  </Button>
                  <button
                    onClick={() => {
                      haptics.light();
                      deleteVersion.mutate(version.id);
                    }}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

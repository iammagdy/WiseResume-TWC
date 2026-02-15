import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, RotateCcw, Trash2, Pin, Sparkles, GitCompare, Plus } from 'lucide-react';
import { useResumeVersions, useResumeVersionMutations } from '@/hooks/useResumeVersions';
import { useResumeStore } from '@/store/resumeStore';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface VersionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeId: string | null;
  onCompare?: (versionSnapshot: unknown) => void;
}

function formatVersionDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

export function VersionHistorySheet({ open, onOpenChange, resumeId, onCompare }: VersionHistorySheetProps) {
  const { data: versions, isLoading } = useResumeVersions(resumeId);
  const { deleteVersion, saveVersion } = useResumeVersionMutations();
  const setCurrentResume = useResumeStore((s) => s.setCurrentResume);
  const currentResume = useResumeStore((s) => s.currentResume);
  const [showCheckpointInput, setShowCheckpointInput] = useState(false);
  const [checkpointName, setCheckpointName] = useState('');

  const handleRestore = (version: NonNullable<typeof versions>[number]) => {
    haptics.medium();
    setCurrentResume(version.snapshot);
    toast.success(`Restored to version ${version.version_number}`);
    onOpenChange(false);
  };

  const handleCreateCheckpoint = () => {
    if (!resumeId || !currentResume) return;
    haptics.light();
    saveVersion.mutate({
      resumeId,
      snapshot: currentResume,
      changeSummary: checkpointName || 'Manual checkpoint',
    });
    setCheckpointName('');
    setShowCheckpointInput(false);
    toast.success('Checkpoint saved');
  };

  const isManualCheckpoint = (summary: string | null) => summary?.startsWith('Manual checkpoint') || summary?.startsWith('📌');
  const isAICheckpoint = (summary: string | null) => summary?.toLowerCase().includes('ai') || summary?.toLowerCase().includes('tailor');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70dvh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Version History
          </SheetTitle>
        </SheetHeader>

        {/* Create Checkpoint */}
        <div className="shrink-0 pt-2 pb-1">
          {showCheckpointInput ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Checkpoint name (optional)"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                className="h-10 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCheckpoint()}
                autoFocus
              />
              <Button size="sm" onClick={handleCreateCheckpoint} disabled={saveVersion.isPending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCheckpointInput(false)}>
                ✕
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCheckpointInput(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Checkpoint
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 relative">
          {/* Timeline line */}
          {versions && versions.length > 1 && (
            <div className="absolute left-6 top-6 bottom-6 w-px bg-border" />
          )}

          <div className="space-y-3">
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
                  className="flex items-start gap-3 pl-2"
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'w-3 h-3 rounded-full mt-4 shrink-0 z-10 ring-2 ring-background',
                    isManualCheckpoint(version.change_summary)
                      ? 'bg-primary'
                      : isAICheckpoint(version.change_summary)
                        ? 'bg-amber-500'
                        : 'bg-muted-foreground/40'
                  )} />

                  <div className="flex-1 flex items-center justify-between p-3 rounded-xl glass-surface border border-border/20">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isManualCheckpoint(version.change_summary) && (
                          <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        {isAICheckpoint(version.change_summary) && (
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium">Version {version.version_number}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatVersionDate(version.created_at)}
                      </p>
                      {version.change_summary && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{version.change_summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {onCompare && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => { haptics.light(); onCompare(version.snapshot); }}
                        >
                          <GitCompare className="w-3.5 h-3.5 mr-1" />
                          Compare
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
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
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Undo2, Trash2, AlertTriangle } from 'lucide-react';
import { useTrashedResumes, useResumeMutations } from '@/hooks/useResumes';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

interface TrashSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashSheet({ open, onOpenChange }: TrashSheetProps) {
  const { data: trashedResumes = [], isLoading } = useTrashedResumes();
  const { restoreResume, permanentlyDeleteResume, emptyTrash } = useResumeMutations();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const handleRestore = (id: string) => {
    restoreResume.mutate(id, {
      onSuccess: () => toast.success('Resume restored'),
    });
  };

  const handlePermanentDelete = () => {
    if (!confirmDeleteId) return;
    permanentlyDeleteResume.mutate(confirmDeleteId, {
      onSuccess: () => {
        toast.success('Resume permanently deleted');
        setConfirmDeleteId(null);
      },
    });
  };

  const handleEmptyTrash = () => {
    emptyTrash.mutate(undefined, {
      onSuccess: () => {
        toast.success('Trash emptied');
        setConfirmEmptyTrash(false);
      },
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                  Recently Deleted
                </SheetTitle>
                <SheetDescription>
                  Items are permanently deleted after 30 days
                </SheetDescription>
              </div>
              {trashedResumes.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmEmptyTrash(true)}
                  className="shrink-0"
                >
                  Empty Trash
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="overflow-y-auto max-h-[60vh] -mx-4 sm:-mx-6 px-4 sm:px-6 pb-safe">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : trashedResumes.length === 0 ? (
              <div className="text-center py-12">
                <Trash2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">Trash is empty</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trashedResumes.map(resume => (
                  <div
                    key={resume.id}
                    className="flex items-center gap-3 p-3 rounded-xl glass-elevated border border-border/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{resume.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Deleted {formatDistanceToNow(new Date(resume.deleted_at!), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 min-w-[44px] min-h-[44px] text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => handleRestore(resume.id)}
                      aria-label="Restore resume"
                    >
                      <Undo2 className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 min-w-[44px] min-h-[44px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDeleteId(resume.id)}
                      aria-label="Permanently delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm permanent delete single item */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Permanently Delete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The resume will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm empty trash */}
      <AlertDialog open={confirmEmptyTrash} onOpenChange={setConfirmEmptyTrash}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Empty Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All {trashedResumes.length} item{trashedResumes.length !== 1 ? 's' : ''} will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

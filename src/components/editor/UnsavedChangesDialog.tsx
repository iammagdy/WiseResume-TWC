import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

interface UnsavedChangesDialogProps {
  open: boolean;
  isSaving: boolean;
  onSaveAndLeave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  open,
  isSaving,
  onSaveAndLeave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes haven't been saved yet. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
          <AlertDialogCancel onClick={onCancel} disabled={isSaving}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            className="h-12 min-h-[48px] border-destructive text-destructive hover:bg-destructive/10"
            onClick={onDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <AlertDialogAction onClick={onSaveAndLeave} disabled={isSaving}>
            {isSaving ? (
              <>
                <MiniSpinner size={16} className="mr-2" />
                Saving…
              </>
            ) : (
              'Save & Leave'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

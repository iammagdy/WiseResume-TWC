import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteAllUserData } from '@/lib/dataExport';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface DeleteDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  resumeCount: number;
  onDeleted: () => void;
}

export function DeleteDataDialog({
  open,
  onOpenChange,
  userId,
  resumeCount,
  onDeleted,
}: DeleteDataDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    haptics.heavy();

    try {
      await deleteAllUserData(userId);
      toast.success('All data deleted');
      haptics.success();
      onDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete data');
      haptics.error();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmText('');
    }
    onOpenChange(open);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete All Data</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                All your resumes ({resumeCount} resume{resumeCount !== 1 ? 's' : ''})
              </li>
              <li>Your profile information</li>
              <li>All local data and preferences</li>
            </ul>
            <p className="font-medium text-foreground pt-1">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label htmlFor="confirm-delete" className="text-sm font-medium">
            Type <span className="font-mono text-destructive">DELETE</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="mt-2 font-mono"
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Forever'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

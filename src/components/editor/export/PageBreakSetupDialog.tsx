import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ResumeData } from '@/types/resume';
import { ExportPageBreakSetup } from './ExportPageBreakSetup';

interface PageBreakSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateElement?: HTMLElement | null;
  resumeData?: ResumeData | null;
}

export function PageBreakSetupDialog({
  open,
  onOpenChange,
  templateElement,
  resumeData,
}: PageBreakSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Page cut setup</DialogTitle>
          <DialogDescription>
            Choose how many pages your CV has and where each page ends. The last page is trimmed to
            your content — no extra blank space at the bottom.
          </DialogDescription>
        </DialogHeader>
        <ExportPageBreakSetup
          active={open}
          templateElement={templateElement}
          resumeData={resumeData}
        />
      </DialogContent>
    </Dialog>
  );
}

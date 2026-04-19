import { CSSProperties, Suspense, memo, useMemo, useCallback, useRef } from 'react';
import { Eye, X, Download, Loader2 } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumeData, TemplateId } from '@/types/resume';
import { applyCustomizationCSS, generateCustomizationCSS } from '@/lib/templateCustomization';
import haptics from '@/lib/haptics';
import { toast } from 'sonner';
import { useExportProgress } from '@/hooks/useExportProgress';

import templateComponents from '@/components/templates/registry';

function PreviewSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-64 mx-auto" />
      <Skeleton className="h-20 w-full mt-6" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

interface TailorPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Merged resume snapshot to render. Ephemeral — never persisted. */
  resume: ResumeData | null;
  /** Optional override for the template id. Defaults to resume.templateId. */
  templateId?: TemplateId;
  /**
   * Optional callback for an "Apply" CTA inside the preview drawer.
   * If omitted, only a Close button is shown.
   */
  onApply?: () => void;
  isApplying?: boolean;
  applyLabel?: string;
  /** Target job title used for the downloaded PDF filename. */
  jobTitle?: string;
}

/**
 * Ephemeral, full-render preview of a tailored resume. Renders the merged
 * resume snapshot using the same template renderer as the editor — no new
 * resume is created.
 */
export const TailorPreviewSheet = memo(function TailorPreviewSheet({
  open,
  onOpenChange,
  resume,
  templateId,
  onApply,
  isApplying = false,
  applyLabel = 'Apply Changes',
  jobTitle,
}: TailorPreviewSheetProps) {
  const effectiveTemplate = (templateId || resume?.templateId || 'modern') as string;
  const TemplateComponent = templateComponents[effectiveTemplate] || templateComponents.modern;
  const customizationStyle = useMemo(
    () => (resume ? applyCustomizationCSS(resume.customization) : {}),
    [resume],
  );

  const templateRef = useRef<HTMLDivElement>(null);
  const { exportProgress, onProgress, reset: resetProgress } = useExportProgress();
  const isDownloadingPdf = exportProgress.isActive;

  const handleDownloadPdf = useCallback(async () => {
    if (!resume || isDownloadingPdf) return;
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      const { downloadFile } = await import('@/lib/downloadUtils');
      const tid = effectiveTemplate as TemplateId;
      const blob = await generatePDF(resume, tid, templateRef.current, undefined, undefined, onProgress);
      const name = resume.contactInfo?.fullName || 'Resume';
      const jobSuffix = jobTitle ? `_${jobTitle}` : '';
      const fileName = `${name}${jobSuffix}_Tailored.pdf`.replace(/\s+/g, '_');
      await downloadFile({ blob, fileName });
      toast.success('PDF downloaded!');
      haptics.success();
    } catch {
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      resetProgress();
    }
  }, [resume, jobTitle, isDownloadingPdf, effectiveTemplate, onProgress, resetProgress]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95dvh] max-h-[95dvh] flex flex-col">
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 my-2" />

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">Tailored resume preview</h3>
              <p className="text-[11px] text-muted-foreground truncate">
                Preview only — nothing has been saved yet
              </p>
            </div>
          </div>
          <button
            onClick={() => { onOpenChange(false); haptics.light(); }}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation active:scale-95"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resume render */}
        <div className="flex-1 overflow-auto bg-muted p-3 flex justify-center">
          {resume ? (
            <div
              ref={templateRef}
              data-resume-template
              className="bg-white text-black mx-auto shadow-2xl relative"
              style={{
                width: '100%',
                maxWidth: '612px',
                minHeight: '792px',
                ...customizationStyle,
              } as CSSProperties}
            >
              {resume.customization && (
                <style>{generateCustomizationCSS(resume.customization)}</style>
              )}
              <Suspense fallback={<PreviewSkeleton />}>
                <TemplateComponent
                  resume={resume}
                  accentColor={resume.customization?.accentColor}
                />
              </Suspense>
            </div>
          ) : (
            <PreviewSkeleton />
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 pb-safe">
          {exportProgress.isActive && (
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{exportProgress.message}</span>
                <span className="font-medium">{Math.round(exportProgress.progress)}%</span>
              </div>
              <Progress value={exportProgress.progress} className="h-1.5" />
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px] active:scale-95 transition-transform"
              onClick={() => { onOpenChange(false); haptics.light(); }}
            >
              Close preview
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] active:scale-95 transition-transform px-3"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || !resume}
              aria-label="Download PDF"
            >
              {isDownloadingPdf
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
            </Button>
            {onApply && (
              <Button
                className="flex-1 gradient-primary min-h-[44px] active:scale-95 transition-transform"
                onClick={() => { haptics.success(); onApply(); }}
                disabled={isApplying}
              >
                {isApplying ? 'Creating...' : applyLabel}
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
});

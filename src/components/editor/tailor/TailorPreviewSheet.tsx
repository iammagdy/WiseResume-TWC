import { CSSProperties, Suspense, lazy, memo, useMemo } from 'react';
import { Eye, X } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumeData, TemplateId } from '@/types/resume';
import { applyCustomizationCSS, generateCustomizationCSS } from '@/lib/templateCustomization';
import haptics from '@/lib/haptics';

// Lazy-loaded templates — keyed by templateId. Mirrors LivePreviewPanel.
const templateComponents: Record<string, ReturnType<typeof lazy>> = {
  modern: lazy(() => import('@/components/templates/ModernTemplate').then(m => ({ default: m.ModernTemplate }))),
  classic: lazy(() => import('@/components/templates/ClassicTemplate').then(m => ({ default: m.ClassicTemplate }))),
  minimal: lazy(() => import('@/components/templates/MinimalTemplate').then(m => ({ default: m.MinimalTemplate }))),
  professional: lazy(() => import('@/components/templates/ProfessionalTemplate').then(m => ({ default: m.ProfessionalTemplate }))),
  developer: lazy(() => import('@/components/templates/DeveloperTemplate').then(m => ({ default: m.DeveloperTemplate }))),
  creative: lazy(() => import('@/components/templates/CreativeTemplate').then(m => ({ default: m.CreativeTemplate }))),
  executive: lazy(() => import('@/components/templates/ExecutiveTemplate').then(m => ({ default: m.ExecutiveTemplate }))),
  compact: lazy(() => import('@/components/templates/CompactTemplate').then(m => ({ default: m.CompactTemplate }))),
  academic: lazy(() => import('@/components/templates/AcademicTemplate').then(m => ({ default: m.AcademicTemplate }))),
  healthcare: lazy(() => import('@/components/templates/HealthcareTemplate').then(m => ({ default: m.HealthcareTemplate }))),
  sales: lazy(() => import('@/components/templates/SalesTemplate').then(m => ({ default: m.SalesTemplate }))),
  elegant: lazy(() => import('@/components/templates/ElegantTemplate').then(m => ({ default: m.ElegantTemplate }))),
  corporate: lazy(() => import('@/components/templates/CorporateTemplate').then(m => ({ default: m.CorporateTemplate }))),
  banking: lazy(() => import('@/components/templates/BankingTemplate').then(m => ({ default: m.BankingTemplate }))),
  consulting: lazy(() => import('@/components/templates/ConsultingTemplate').then(m => ({ default: m.ConsultingTemplate }))),
  federal: lazy(() => import('@/components/templates/FederalTemplate').then(m => ({ default: m.FederalTemplate }))),
  legal: lazy(() => import('@/components/templates/LegalTemplate').then(m => ({ default: m.LegalTemplate }))),
  marketing: lazy(() => import('@/components/templates/MarketingTemplate').then(m => ({ default: m.MarketingTemplate }))),
  designer: lazy(() => import('@/components/templates/DesignerTemplate').then(m => ({ default: m.DesignerTemplate }))),
  portfolio: lazy(() => import('@/components/templates/PortfolioTemplate').then(m => ({ default: m.PortfolioTemplate }))),
  startup: lazy(() => import('@/components/templates/StartupTemplate').then(m => ({ default: m.StartupTemplate }))),
  infographic: lazy(() => import('@/components/templates/InfographicTemplate').then(m => ({ default: m.InfographicTemplate }))),
  'data-science': lazy(() => import('@/components/templates/DataScienceTemplate').then(m => ({ default: m.DataScienceTemplate }))),
  devops: lazy(() => import('@/components/templates/DevOpsTemplate').then(m => ({ default: m.DevOpsTemplate }))),
  cyber: lazy(() => import('@/components/templates/CyberTemplate').then(m => ({ default: m.CyberTemplate }))),
  product: lazy(() => import('@/components/templates/ProductTemplate').then(m => ({ default: m.ProductTemplate }))),
  clean: lazy(() => import('@/components/templates/CleanTemplate').then(m => ({ default: m.CleanTemplate }))),
  swiss: lazy(() => import('@/components/templates/SwissTemplate').then(m => ({ default: m.SwissTemplate }))),
  mono: lazy(() => import('@/components/templates/MonoTemplate').then(m => ({ default: m.MonoTemplate }))),
  zen: lazy(() => import('@/components/templates/ZenTemplate').then(m => ({ default: m.ZenTemplate }))),
};

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
}: TailorPreviewSheetProps) {
  const effectiveTemplate = (templateId || resume?.templateId || 'modern') as string;
  const TemplateComponent = templateComponents[effectiveTemplate] || templateComponents.modern;
  const customizationStyle = useMemo(
    () => (resume ? applyCustomizationCSS(resume.customization) : {}),
    [resume],
  );

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
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px] active:scale-95 transition-transform"
              onClick={() => { onOpenChange(false); haptics.light(); }}
            >
              Close preview
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

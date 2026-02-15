import { memo, useState, useCallback, Suspense, lazy, useRef, CSSProperties } from 'react';
import { ZoomIn, ZoomOut, Download, Loader2, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { applyCustomizationCSS } from '@/lib/templateCustomization';
import { generatePDF } from '@/lib/pdfGenerator';
import { downloadFile } from '@/lib/downloadUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateId, ResumeData } from '@/types/resume';
import haptics from '@/lib/haptics';

// Lazy-loaded templates — only the selected one loads
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

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25] as const;

const SECTION_LABELS: Record<string, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  awards: 'Awards',
  projects: 'Projects',
  publications: 'Publications',
  volunteering: 'Volunteering',
  hobbies: 'Hobbies',
  references: 'References',
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

/** Filter resume data by hiding toggled-off sections */
function filterResume(resume: ResumeData, hidden: Set<string>): ResumeData {
  if (hidden.size === 0) return resume;
  return {
    ...resume,
    summary: hidden.has('summary') ? '' : resume.summary,
    experience: hidden.has('experience') ? [] : resume.experience,
    education: hidden.has('education') ? [] : resume.education,
    skills: hidden.has('skills') ? [] : resume.skills,
    certifications: hidden.has('certifications') ? [] : resume.certifications,
    awards: hidden.has('awards') ? [] : resume.awards,
    projects: hidden.has('projects') ? [] : resume.projects,
    publications: hidden.has('publications') ? [] : resume.publications,
    volunteering: hidden.has('volunteering') ? [] : resume.volunteering,
    hobbies: hidden.has('hobbies') ? [] : resume.hobbies,
    references: hidden.has('references') ? [] : resume.references,
  };
}

interface LivePreviewPanelProps {
  onClose?: () => void;
  className?: string;
}

export const LivePreviewPanel = memo(function LivePreviewPanel({ onClose, className }: LivePreviewPanelProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const selectedTemplate = useResumeStore(s => s.selectedTemplate);
  const [zoom, setZoom] = useState(0.75);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [showSectionToggles, setShowSectionToggles] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const TemplateComponent = templateComponents[selectedTemplate];

  const toggleSection = useCallback((section: string) => {
    setHiddenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const handleDownload = useCallback(async () => {
    if (!currentResume) return;
    haptics.medium();
    setIsGenerating(true);
    try {
      const pdfBlob = await generatePDF(currentResume, selectedTemplate, resumeRef.current, undefined, { showPageNumbers: true });
      const fileName = `${currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`;
      await downloadFile({ blob: pdfBlob, fileName });
      toast.success('Resume downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [currentResume, selectedTemplate]);

  if (!currentResume || !TemplateComponent) return null;

  const filteredResume = filterResume(currentResume, hiddenSections);
  const customizationStyle = applyCustomizationCSS(currentResume.customization);

  // Determine which sections have content for toggle UI
  const activeSections = Object.keys(SECTION_LABELS).filter(key => {
    const val = (currentResume as any)[key];
    if (typeof val === 'string') return val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return false;
  });

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-muted/30', className)}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          {ZOOM_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => { setZoom(level); haptics.light(); }}
              className={cn(
                'px-2 py-1.5 rounded text-xs font-medium transition-colors min-w-[40px] min-h-[36px] touch-manipulation active:scale-95',
                zoom === level ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Section toggle button */}
          <button
            onClick={() => { setShowSectionToggles(v => !v); haptics.light(); }}
            className={cn(
              'p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation active:scale-95',
              showSectionToggles ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="Toggle section visibility"
          >
            {showSectionToggles ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Download */}
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 touch-manipulation active:scale-95"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="ml-1.5 hidden sm:inline text-xs">PDF</span>
          </Button>

          {/* Close (desktop) */}
          {onClose && (
            <button
              onClick={() => { onClose(); haptics.light(); }}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation active:scale-95"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section visibility toggles */}
      {showSectionToggles && activeSections.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-b border-border bg-background/60">
          {activeSections.map(section => (
            <button
              key={section}
              onClick={() => { toggleSection(section); haptics.light(); }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors touch-manipulation active:scale-95 min-h-[32px]',
                hiddenSections.has(section)
                  ? 'bg-muted text-muted-foreground line-through'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      )}

      {/* Resume preview */}
      <div className="flex-1 overflow-auto p-3">
        <div
          style={{
            transformOrigin: 'top center',
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`,
          }}
        >
          <div
            ref={resumeRef}
            data-resume-template
            className="bg-white text-black mx-auto shadow-2xl"
            style={{
              width: '100%',
              maxWidth: '612px',
              minHeight: '792px',
              ...customizationStyle,
            } as CSSProperties}
          >
            <Suspense fallback={<PreviewSkeleton />}>
              <TemplateComponent resume={filteredResume} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
});

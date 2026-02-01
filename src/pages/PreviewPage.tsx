import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, ArrowLeft, Loader2, Check, Scissors, ChevronDown } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { ModernTemplate } from '@/components/templates/ModernTemplate';
import { ClassicTemplate } from '@/components/templates/ClassicTemplate';
import { MinimalTemplate } from '@/components/templates/MinimalTemplate';
import { ProfessionalTemplate } from '@/components/templates/ProfessionalTemplate';
import { DeveloperTemplate } from '@/components/templates/DeveloperTemplate';
import { CreativeTemplate } from '@/components/templates/CreativeTemplate';
import { ExecutiveTemplate } from '@/components/templates/ExecutiveTemplate';
import { PageBreakIndicator } from '@/components/editor/PageBreakIndicator';
import { PageBreakSheet } from '@/components/editor/PageBreakSheet';
import { ExportOptionsSheet } from '@/components/editor/ExportOptionsSheet';
import { generatePDF, generateCoverLetterPDF, generateCombinedPDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TemplateId, SectionId, ExportType } from '@/types/resume';

const templates: { id: TemplateId; name: string }[] = [
  { id: 'modern', name: 'Modern' },
  { id: 'classic', name: 'Classic' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'professional', name: 'Professional' },
  { id: 'developer', name: 'Developer' },
  { id: 'creative', name: 'Creative' },
  { id: 'executive', name: 'Executive' },
];

export default function PreviewPage() {
  const navigate = useNavigate();
  const { 
    currentResume, 
    selectedTemplate, 
    setSelectedTemplate, 
    pageBreakSettings, 
    setPageBreakSettings,
    generatedCoverLetter,
    coverLetterJobContext,
  } = useResumeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPageBreaks, setShowPageBreaks] = useState(true);
  const [showPageBreakSheet, setShowPageBreakSheet] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 612, height: 792 });

  // Determine which sections exist in resume
  const availableSections = useMemo(() => {
    if (!currentResume) return [];
    const sections: SectionId[] = [];
    if (currentResume.summary) sections.push('summary');
    if (currentResume.experience.length > 0) sections.push('experience');
    if (currentResume.education.length > 0) sections.push('education');
    if (currentResume.skills.length > 0) sections.push('skills');
    if (currentResume.certifications.length > 0) sections.push('certifications');
    return sections;
  }, [currentResume]);

  // Get manual break sections for passing to components
  const manualBreakSections = useMemo(() => {
    if (pageBreakSettings.mode === 'manual' && pageBreakSettings.breakAfterSections.length > 0) {
      return pageBreakSettings.breakAfterSections;
    }
    return undefined;
  }, [pageBreakSettings]);

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    const element = resumeRef.current;
    if (!element) return;

    const updateDimensions = () => {
      setContainerDimensions({
        width: element.offsetWidth || 612,
        height: element.scrollHeight || element.offsetHeight || 792,
      });
    };

    // Initial measurement
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [selectedTemplate]);

  if (!currentResume) {
    navigate('/');
    return null;
  }

  const handleExport = async (type: ExportType, showPageNumbers: boolean) => {
    setIsGenerating(true);
    try {
      let pdfBlob: Blob;
      let fileName: string;
      const baseName = currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Document';
      const pdfOptions = { showPageNumbers, pageNumberFormat: 'full' as const };

      switch (type) {
        case 'cover-letter':
          if (!generatedCoverLetter) {
            toast.error('Generate a cover letter first');
            return;
          }
          pdfBlob = await generateCoverLetterPDF(
            generatedCoverLetter,
            currentResume.contactInfo,
            pdfOptions
          );
          fileName = `${baseName}_Cover_Letter.pdf`;
          break;

        case 'combined':
          if (!generatedCoverLetter) {
            toast.error('Generate a cover letter first');
            return;
          }
          pdfBlob = await generateCombinedPDF(
            currentResume,
            selectedTemplate,
            generatedCoverLetter,
            resumeRef.current,
            manualBreakSections,
            pdfOptions
          );
          fileName = `${baseName}_Application_Package.pdf`;
          break;

        case 'resume':
        default:
          pdfBlob = await generatePDF(
            currentResume,
            selectedTemplate,
            resumeRef.current,
            manualBreakSections,
            pdfOptions
          );
          fileName = `${baseName}_Resume.pdf`;
          break;
      }

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const successMessages: Record<ExportType, string> = {
        'resume': 'Resume downloaded!',
        'cover-letter': 'Cover letter downloaded!',
        'combined': 'Application package downloaded!',
      };
      toast.success(successMessages[type]);
      setShowExportSheet(false);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickDownload = async () => {
    await handleExport('resume', true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const pdfBlob = await generatePDF(
          currentResume,
          selectedTemplate,
          resumeRef.current,
          manualBreakSections,
          { showPageNumbers: true }
        );
        const file = new File([pdfBlob], 'Resume.pdf', { type: 'application/pdf' });
        await navigator.share({
          title: 'My Resume',
          files: [file],
        });
      } catch (error) {
        console.error('Share error:', error);
        toast.error('Failed to share. Try downloading instead.');
      }
    } else {
      toast.info('Share not supported. Downloading instead.');
      handleQuickDownload();
    }
  };

  const TemplateComponent = {
    modern: ModernTemplate,
    classic: ClassicTemplate,
    minimal: MinimalTemplate,
    professional: ProfessionalTemplate,
    developer: DeveloperTemplate,
    creative: CreativeTemplate,
    executive: ExecutiveTemplate,
  }[selectedTemplate];

  return (
    <MobileLayout showHeader headerTitle="Preview" onBack={() => navigate('/editor')}>
      <div className="flex-1 flex flex-col">
        {/* Template Quick Switcher */}
        <motion.div
          className="border-b border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide snap-x snap-mandatory">
            {templates.map((template) => (
              <button
                key={template.id}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all snap-center touch-manipulation',
                  selectedTemplate === template.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                onClick={() => setSelectedTemplate(template.id)}
              >
                {template.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ATS Ready Badge & Page Break Toggle */}
        <div className="px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            <span className="text-success font-medium">ATS-Ready</span>
          </div>
          <button
            onClick={() => setShowPageBreakSheet(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              pageBreakSettings.mode === 'manual'
                ? "bg-blue-100 text-blue-600"
                : showPageBreaks
                  ? "bg-orange-100 text-orange-600"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Scissors className="w-3.5 h-3.5" />
            Page breaks
            {pageBreakSettings.mode === 'manual' && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-200 rounded text-xs">
                {pageBreakSettings.breakAfterSections.length}
              </span>
            )}
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <motion.div
            ref={resumeRef}
            data-resume-template
            data-capturing={isGenerating ? "true" : undefined}
            className="bg-white text-black mx-auto shadow-2xl relative"
            style={{ 
              width: '100%',
              maxWidth: '612px',
              minHeight: '792px',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <TemplateComponent resume={currentResume} />
            {/* Page break indicators - hidden during PDF generation */}
            {!isGenerating && showPageBreaks && (
              <PageBreakIndicator
                containerWidth={containerDimensions.width}
                containerHeight={containerDimensions.height}
                templateRef={resumeRef}
                manualBreakSections={manualBreakSections}
              />
            )}
          </motion.div>
        </div>

        {/* Bottom actions */}
        <motion.div
          className="sticky bottom-0 p-4 pb-safe glass border-t border-border space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-2">
            <Button
              size="lg"
              className="flex-1 h-14 text-lg font-semibold gradient-primary"
              onClick={handleQuickDownload}
              disabled={isGenerating}
              style={{
                boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-4"
              onClick={() => setShowExportSheet(true)}
              disabled={isGenerating}
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={() => navigate('/editor')}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Page Break Settings Sheet */}
      <PageBreakSheet
        open={showPageBreakSheet}
        onOpenChange={setShowPageBreakSheet}
        settings={pageBreakSettings}
        onSettingsChange={setPageBreakSettings}
        availableSections={availableSections}
      />

      {/* Export Options Sheet */}
      <ExportOptionsSheet
        open={showExportSheet}
        onOpenChange={setShowExportSheet}
        hasCoverLetter={!!generatedCoverLetter}
        coverLetterContext={coverLetterJobContext}
        onExport={handleExport}
        isExporting={isGenerating}
      />
    </MobileLayout>
  );
}

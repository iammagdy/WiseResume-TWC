import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, ArrowLeft, Loader2, Check, Scissors, ChevronDown, FileText, Mic, FolderDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { PageBreakIndicator } from '@/components/editor/PageBreakIndicator';

// Lazy-loaded templates (only the selected one loads)
const ModernTemplate = lazy(() => import('@/components/templates/ModernTemplate').then(m => ({ default: m.ModernTemplate })));
const ClassicTemplate = lazy(() => import('@/components/templates/ClassicTemplate').then(m => ({ default: m.ClassicTemplate })));
const MinimalTemplate = lazy(() => import('@/components/templates/MinimalTemplate').then(m => ({ default: m.MinimalTemplate })));
const ProfessionalTemplate = lazy(() => import('@/components/templates/ProfessionalTemplate').then(m => ({ default: m.ProfessionalTemplate })));
const DeveloperTemplate = lazy(() => import('@/components/templates/DeveloperTemplate').then(m => ({ default: m.DeveloperTemplate })));
const CreativeTemplate = lazy(() => import('@/components/templates/CreativeTemplate').then(m => ({ default: m.CreativeTemplate })));
const ExecutiveTemplate = lazy(() => import('@/components/templates/ExecutiveTemplate').then(m => ({ default: m.ExecutiveTemplate })));
const CompactTemplate = lazy(() => import('@/components/templates/CompactTemplate').then(m => ({ default: m.CompactTemplate })));
const AcademicTemplate = lazy(() => import('@/components/templates/AcademicTemplate').then(m => ({ default: m.AcademicTemplate })));
const HealthcareTemplate = lazy(() => import('@/components/templates/HealthcareTemplate').then(m => ({ default: m.HealthcareTemplate })));
const SalesTemplate = lazy(() => import('@/components/templates/SalesTemplate').then(m => ({ default: m.SalesTemplate })));
const ElegantTemplate = lazy(() => import('@/components/templates/ElegantTemplate').then(m => ({ default: m.ElegantTemplate })));

// Lazy-loaded sheets
const PageBreakSheet = lazy(() => import('@/components/editor/PageBreakSheet').then(m => ({ default: m.PageBreakSheet })));
const ExportOptionsSheet = lazy(() => import('@/components/editor/ExportOptionsSheet').then(m => ({ default: m.ExportOptionsSheet })));
const ResumePhotoSheet = lazy(() => import('@/components/editor/ResumePhotoSheet').then(m => ({ default: m.ResumePhotoSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/OnePageWizardSheet').then(m => ({ default: m.OnePageWizardSheet })));
import { generatePDF, generateCoverLetterPDF, generateCombinedPDF, generateOnePagePDF, getSectionsInDOMOrder } from '@/lib/pdfGenerator';
import { getTemplateConfig, filterBreakableSections } from '@/lib/templateConfig';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
import { TemplateId, SectionId, ExportType } from '@/types/resume';
import { useRateApp } from '@/hooks/useRateApp';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/safeClient';

const templates: { id: TemplateId; name: string }[] = [
  { id: 'modern', name: 'Modern' },
  { id: 'classic', name: 'Classic' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'professional', name: 'Professional' },
  { id: 'developer', name: 'Developer' },
  { id: 'creative', name: 'Creative' },
  { id: 'executive', name: 'Executive' },
  { id: 'compact', name: 'Compact' },
  { id: 'academic', name: 'Academic' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'sales', name: 'Sales' },
  { id: 'elegant', name: 'Elegant' },
];

export default function PreviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const { 
    currentResume, 
    selectedTemplate, 
    setSelectedTemplate, 
    pageBreakSettings, 
    setPageBreakSettings,
    generatedCoverLetter,
    coverLetterJobContext,
    updateResume,
  } = useResumeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPageBreaks, setShowPageBreaks] = useState(true);
  const [showPageBreakSheet, setShowPageBreakSheet] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showOnePageWizard, setShowOnePageWizard] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const [domSections, setDomSections] = useState<SectionId[]>([]);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Get template configuration for the selected template
  const templateConfig = useMemo(() => getTemplateConfig(selectedTemplate), [selectedTemplate]);
 
   // Rate app hook
   const { incrementPositiveActions, shouldPromptForRating, openAppStore, dismissRating } = useRateApp();

  // Check if we should show photo prompt when switching to a photo-supporting template
  useEffect(() => {
    if (!currentResume) return;
    
    const config = getTemplateConfig(selectedTemplate);
    if (config.supportsPhoto && !currentResume.contactInfo.photoUrl) {
      // Check if user has dismissed this before
      const dismissed = localStorage.getItem(`photo-prompt-${currentResume.id}`);
      if (!dismissed) {
        setShowPhotoSheet(true);
      }
    }
  }, [selectedTemplate, currentResume?.id]);

  // Update section ordering based on actual DOM layout after render
  // This ensures sections are shown in their visual order (important for multi-column templates)
  useEffect(() => {
    const updateSectionOrder = () => {
      if (!resumeRef.current) return;
      
      // Small delay to ensure template has rendered
      requestAnimationFrame(() => {
        if (resumeRef.current) {
          const orderedSections = getSectionsInDOMOrder(resumeRef.current);
          setDomSections(orderedSections);
        }
      });
    };

    updateSectionOrder();
  }, [currentResume, selectedTemplate]);

  // Use DOM-ordered sections, falling back to data-based ordering if DOM hasn't rendered yet
  const availableSections = useMemo(() => {
    if (domSections.length > 0) {
      return domSections;
    }
    
    // Fallback: data-based order (used before first render)
    if (!currentResume) return [];
    const sections: SectionId[] = [];
    if (currentResume.summary) sections.push('summary');
    if (currentResume.experience.length > 0) sections.push('experience');
    if (currentResume.education.length > 0) sections.push('education');
    if (currentResume.skills.length > 0) sections.push('skills');
    if (currentResume.certifications.length > 0) sections.push('certifications');
    return sections;
  }, [currentResume, domSections]);

  // Get manual break sections for passing to components
  const manualBreakSections = useMemo(() => {
    if (pageBreakSettings.mode === 'manual' && pageBreakSettings.breakAfterSections.length > 0) {
      return pageBreakSettings.breakAfterSections;
    }
    return undefined;
  }, [pageBreakSettings]);


  // Resume guard - redirect to appropriate page based on auth state
  if (!currentResume) {
    navigate(user ? '/dashboard' : '/');
    return null;
  }

  // Photo sheet handlers
  const handleUseProfilePhoto = () => {
    if (profile?.avatarUrl) {
      updateResume({
        contactInfo: {
          ...currentResume.contactInfo,
          photoUrl: profile.avatarUrl,
        },
      });
      toast.success('Profile photo added to resume');
    }
  };

  const handleUploadPhoto = async (blob: Blob) => {
    try {
      // Upload to storage if user is authenticated
      if (user) {
        const fileName = `${user.id}/resume-photo-${Date.now()}.png`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { upsert: true });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        updateResume({
          contactInfo: {
            ...currentResume.contactInfo,
            photoUrl: urlData.publicUrl,
          },
        });
      } else {
        // For non-authenticated users, use blob URL (temporary)
        const url = URL.createObjectURL(blob);
        updateResume({
          contactInfo: {
            ...currentResume.contactInfo,
            photoUrl: url,
          },
        });
      }
      toast.success('Photo added to resume');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    }
  };

  const handleKeepInitials = (dontAskAgain: boolean) => {
    if (dontAskAgain && currentResume?.id) {
      localStorage.setItem(`photo-prompt-${currentResume.id}`, 'true');
    }
  };

  const handleExport = async (type: ExportType, showPageNumbers: boolean, showBranding: boolean = true) => {
    setIsGenerating(true);
    try {
      let pdfBlob: Blob;
      let fileName: string;
      const baseName = currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Document';
      const pdfOptions = { showPageNumbers, pageNumberFormat: 'full' as const, showBranding };

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

        case 'one-page':
          pdfBlob = await generateOnePagePDF(
            currentResume,
            selectedTemplate,
            resumeRef.current,
            pdfOptions
          );
          fileName = `${baseName}_Resume_OnePage.pdf`;
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
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobile = isIOS || /Android/i.test(navigator.userAgent);

      let downloadSucceeded = false;

      if (isIOS) {
        // iOS: navigator.share is the ONLY reliable download method
        try {
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: fileName });
            downloadSucceeded = true;
          } else {
            // Fallback: open blob in new tab with instructions
            const newTab = window.open(url, '_blank');
            if (newTab) {
              toast.info('Tap the share icon in Safari, then "Save to Files"', { duration: 6000 });
            } else {
              // Popup blocked - use anchor download with data URL
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(pdfBlob);
              });
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = fileName;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.info('If the file did not save, tap and hold the download button, then "Download Linked File"', { duration: 6000 });
            }
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            toast.info('Download cancelled. Tap download again to save your PDF.');
          } else {
            toast.error('Could not save PDF. Try using the Share button instead.');
          }
        }
      } else if (isMobile) {
        window.open(url, '_blank');
        downloadSucceeded = true;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        downloadSucceeded = true;
      }

      if (downloadSucceeded) {
        const successMessages: Record<ExportType, string> = {
          'resume': 'Resume downloaded!',
          'cover-letter': 'Cover letter downloaded!',
          'combined': 'Application package downloaded!',
          'one-page': 'One-page resume downloaded!',
        };
        toast.success(successMessages[type]);
      }
      setShowExportSheet(false);
       
       // Track positive action for rate app prompt
       incrementPositiveActions();
       
       // Check if we should prompt for rating
       setTimeout(() => {
         if (shouldPromptForRating()) {
           toast(
             'Enjoying WiseResume?',
             {
               description: 'Rate us on the app store to help others find us!',
               duration: 8000,
               action: {
                 label: 'Rate Now',
                 onClick: openAppStore,
               },
               cancel: {
                 label: 'Later',
                 onClick: dismissRating,
               },
             }
           );
         }
       }, 1500);
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

  const handleSaveToFiles = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob = await generatePDF(
        currentResume,
        selectedTemplate,
        resumeRef.current,
        manualBreakSections,
        { showPageNumbers: true }
      );
      const fileName = `${currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        toast.info('Choose "Save to Files" from the menu', { duration: 5000 });
        await navigator.share({ files: [file], title: fileName });
        toast.success('Resume saved!');
      } else {
        toast.error('Save to Files is not supported on this device');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        toast.info('Cancelled. Tap again to save.');
      } else {
        console.error('Save to Files error:', err);
        toast.error('Failed to save. Try downloading instead.');
      }
    } finally {
      setIsGenerating(false);
    }
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
    compact: CompactTemplate,
    academic: AcademicTemplate,
    healthcare: HealthcareTemplate,
    sales: SalesTemplate,
    elegant: ElegantTemplate,
  }[selectedTemplate];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/editor')}
            className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-semibold truncate">Preview</h1>
        </div>
      </header>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
              // Show different styles based on template support
              !templateConfig.supportsPageBreaks
                ? "bg-muted text-muted-foreground"
                : pageBreakSettings.mode === 'manual'
                  ? "bg-blue-100 text-blue-600"
                  : showPageBreaks
                    ? "bg-orange-100 text-orange-600"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {templateConfig.singlePageOptimized ? (
              <>
                <FileText className="w-3.5 h-3.5" />
                Single-page
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" />
                Page breaks
                {pageBreakSettings.mode === 'manual' && templateConfig.supportsManualBreaks && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-200 rounded text-xs">
                    {pageBreakSettings.breakAfterSections.length}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* AI Tailor Hint Banner */}
        <NextStepBanner variant="tailor" onAction={() => navigate('/editor?openTailor=1')} />

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 bg-muted/30">
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
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading template...</div>}>
              <TemplateComponent resume={currentResume} />
            </Suspense>
            {/* Page break indicators - hidden during PDF generation or for single-page templates */}
            {!isGenerating && showPageBreaks && templateConfig.supportsPageBreaks && (
              <PageBreakIndicator
                templateRef={resumeRef}
                manualBreakSections={manualBreakSections}
                templateConfig={templateConfig}
              />
            )}
          </motion.div>
        </div>

        {/* Bottom actions - flex layout avoids sticky overlap issues */}
        <motion.div
          className="shrink-0 p-3 sm:p-4 glass border-t border-border space-y-2 sm:space-y-3 pb-safe"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-2">
            <Button
              size="lg"
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-semibold gradient-primary touch-manipulation"
              onClick={handleQuickDownload}
              disabled={isGenerating}
              style={{
                boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span className="hidden xs:inline">Generating...</span>
                  <span className="xs:hidden">...</span>
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
              className="h-12 sm:h-14 px-3 sm:px-4 touch-manipulation"
              onClick={() => setShowExportSheet(true)}
              disabled={isGenerating}
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-11 sm:h-12 touch-manipulation"
              onClick={() => navigate('/editor')}
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              <span className="text-sm sm:text-base">Edit</span>
            </Button>
            {isIOS && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-11 sm:h-12 touch-manipulation"
                onClick={handleSaveToFiles}
                disabled={isGenerating}
              >
                <FolderDown className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                <span className="text-sm sm:text-base">Save</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-11 sm:h-12 touch-manipulation"
              onClick={() => navigate('/interview')}
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              <span className="text-sm sm:text-base">Interview</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 sm:h-12 px-3 touch-manipulation"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Sheets - lazy loaded */}
      <Suspense fallback={null}>
        {showPageBreakSheet && (
          <PageBreakSheet
            open={showPageBreakSheet}
            onOpenChange={setShowPageBreakSheet}
            settings={pageBreakSettings}
            onSettingsChange={setPageBreakSettings}
            availableSections={availableSections}
            templateConfig={templateConfig}
            resume={currentResume ?? undefined}
            onSwitchTemplate={setSelectedTemplate}
          />
        )}
        {showExportSheet && (
          <ExportOptionsSheet
            open={showExportSheet}
            onOpenChange={setShowExportSheet}
            hasCoverLetter={!!generatedCoverLetter}
            coverLetterContext={coverLetterJobContext}
            onExport={handleExport}
            isExporting={isGenerating}
            onOnePageWizard={() => setShowOnePageWizard(true)}
            templateElement={resumeRef.current}
          />
        )}
        {showOnePageWizard && (
          <OnePageWizardSheet
            open={showOnePageWizard}
            onOpenChange={setShowOnePageWizard}
          />
        )}
        {showPhotoSheet && (
          <ResumePhotoSheet
            open={showPhotoSheet}
            onOpenChange={setShowPhotoSheet}
            profilePhotoUrl={profile?.avatarUrl || null}
            resumeId={currentResume?.id}
            onUseProfilePhoto={handleUseProfilePhoto}
            onUploadPhoto={handleUploadPhoto}
            onKeepInitials={handleKeepInitials}
          />
        )}
      </Suspense>
    </div>
  );
}

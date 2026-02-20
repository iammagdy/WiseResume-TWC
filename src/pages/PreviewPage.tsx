import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { TemplateSkeleton } from '@/components/layout/PageSkeletons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, ArrowLeft, Loader2, Check, Scissors, FileText, Mic, FolderDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { PageBreakIndicator } from '@/components/editor/PageBreakIndicator';

// Lazy-loaded templates (only the selected one loads)
// Lazy-loaded templates — full set matching LivePreviewPanel
const templateComponentMap: Record<string, ReturnType<typeof lazy>> = {
  modern: lazy(() => import('@/components/templates/ModernTemplate').then((m) => ({ default: m.ModernTemplate }))),
  classic: lazy(() => import('@/components/templates/ClassicTemplate').then((m) => ({ default: m.ClassicTemplate }))),
  minimal: lazy(() => import('@/components/templates/MinimalTemplate').then((m) => ({ default: m.MinimalTemplate }))),
  professional: lazy(() => import('@/components/templates/ProfessionalTemplate').then((m) => ({ default: m.ProfessionalTemplate }))),
  developer: lazy(() => import('@/components/templates/DeveloperTemplate').then((m) => ({ default: m.DeveloperTemplate }))),
  creative: lazy(() => import('@/components/templates/CreativeTemplate').then((m) => ({ default: m.CreativeTemplate }))),
  executive: lazy(() => import('@/components/templates/ExecutiveTemplate').then((m) => ({ default: m.ExecutiveTemplate }))),
  compact: lazy(() => import('@/components/templates/CompactTemplate').then((m) => ({ default: m.CompactTemplate }))),
  academic: lazy(() => import('@/components/templates/AcademicTemplate').then((m) => ({ default: m.AcademicTemplate }))),
  healthcare: lazy(() => import('@/components/templates/HealthcareTemplate').then((m) => ({ default: m.HealthcareTemplate }))),
  sales: lazy(() => import('@/components/templates/SalesTemplate').then((m) => ({ default: m.SalesTemplate }))),
  elegant: lazy(() => import('@/components/templates/ElegantTemplate').then((m) => ({ default: m.ElegantTemplate }))),
  corporate: lazy(() => import('@/components/templates/CorporateTemplate').then((m) => ({ default: m.CorporateTemplate }))),
  banking: lazy(() => import('@/components/templates/BankingTemplate').then((m) => ({ default: m.BankingTemplate }))),
  consulting: lazy(() => import('@/components/templates/ConsultingTemplate').then((m) => ({ default: m.ConsultingTemplate }))),
  federal: lazy(() => import('@/components/templates/FederalTemplate').then((m) => ({ default: m.FederalTemplate }))),
  legal: lazy(() => import('@/components/templates/LegalTemplate').then((m) => ({ default: m.LegalTemplate }))),
  marketing: lazy(() => import('@/components/templates/MarketingTemplate').then((m) => ({ default: m.MarketingTemplate }))),
  designer: lazy(() => import('@/components/templates/DesignerTemplate').then((m) => ({ default: m.DesignerTemplate }))),
  portfolio: lazy(() => import('@/components/templates/PortfolioTemplate').then((m) => ({ default: m.PortfolioTemplate }))),
  startup: lazy(() => import('@/components/templates/StartupTemplate').then((m) => ({ default: m.StartupTemplate }))),
  infographic: lazy(() => import('@/components/templates/InfographicTemplate').then((m) => ({ default: m.InfographicTemplate }))),
  'data-science': lazy(() => import('@/components/templates/DataScienceTemplate').then((m) => ({ default: m.DataScienceTemplate }))),
  devops: lazy(() => import('@/components/templates/DevOpsTemplate').then((m) => ({ default: m.DevOpsTemplate }))),
  cyber: lazy(() => import('@/components/templates/CyberTemplate').then((m) => ({ default: m.CyberTemplate }))),
  product: lazy(() => import('@/components/templates/ProductTemplate').then((m) => ({ default: m.ProductTemplate }))),
  clean: lazy(() => import('@/components/templates/CleanTemplate').then((m) => ({ default: m.CleanTemplate }))),
  swiss: lazy(() => import('@/components/templates/SwissTemplate').then((m) => ({ default: m.SwissTemplate }))),
  mono: lazy(() => import('@/components/templates/MonoTemplate').then((m) => ({ default: m.MonoTemplate }))),
  zen: lazy(() => import('@/components/templates/ZenTemplate').then((m) => ({ default: m.ZenTemplate })))
};

// Lazy-loaded sheets
const PageBreakSheet = lazy(() => import('@/components/editor/PageBreakSheet').then((m) => ({ default: m.PageBreakSheet })));
const ExportOptionsSheet = lazy(() => import('@/components/editor/ExportOptionsSheet').then((m) => ({ default: m.ExportOptionsSheet })));
const ResumePhotoSheet = lazy(() => import('@/components/editor/ResumePhotoSheet').then((m) => ({ default: m.ResumePhotoSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/OnePageWizardSheet').then((m) => ({ default: m.OnePageWizardSheet })));
const ShareSheet = lazy(() => import('@/components/editor/ShareSheet').then((m) => ({ default: m.ShareSheet })));
import { getSectionsInDOMOrder, PdfGenerationError } from '@/lib/pdfUtils';
import { getTemplateConfig, filterBreakableSections } from '@/lib/templateConfig';
import { downloadFile } from '@/lib/downloadUtils';
// docxGenerator is dynamically imported when needed to avoid Vite pre-bundle issues
import { useExportProgress } from '@/hooks/useExportProgress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NextStepBanner } from '@/components/editor/NextStepBanner';
import { TemplateId, SectionId, ExportType } from '@/types/resume';
import { useRateApp } from '@/hooks/useRateApp';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/safeClient';

const templates: {id: TemplateId;name: string;}[] = [
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
{ id: 'corporate', name: 'Corporate' },
{ id: 'banking', name: 'Banking' },
{ id: 'consulting', name: 'Consulting' },
{ id: 'federal', name: 'Federal' },
{ id: 'legal', name: 'Legal' },
{ id: 'marketing', name: 'Marketing' },
{ id: 'designer', name: 'Designer' },
{ id: 'portfolio', name: 'Portfolio' },
{ id: 'startup', name: 'Startup' },
{ id: 'infographic', name: 'Infographic' },
{ id: 'data-science', name: 'Data Science' },
{ id: 'devops', name: 'DevOps' },
{ id: 'cyber', name: 'Cyber' },
{ id: 'product', name: 'Product' },
{ id: 'clean', name: 'Clean' },
{ id: 'swiss', name: 'Swiss' },
{ id: 'mono', name: 'Mono' },
{ id: 'zen', name: 'Zen' }];


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
    updateResume
  } = useResumeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPageBreaks, setShowPageBreaks] = useState(true);
  const [showPageBreakSheet, setShowPageBreakSheet] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showOnePageWizard, setShowOnePageWizard] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const [domSections, setDomSections] = useState<SectionId[]>([]);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const { exportProgress, onProgress, reset: resetProgress } = useExportProgress();
  const guestPreviewHintShown = useRef(false);

  // Get template configuration for the selected template
  const templateConfig = useMemo(() => getTemplateConfig(selectedTemplate), [selectedTemplate]);

  // Rate app hook
  const { incrementPositiveActions, shouldPromptForRating, openAppStore, dismissRating } = useRateApp();

  // Check if we should show photo prompt when switching to a photo-supporting template
  useEffect(() => {
    if (!currentResume) return;

    const config = getTemplateConfig(selectedTemplate);
    if (config.supportsPhoto && !currentResume.contactInfo.photoUrl) {
      const dismissed = localStorage.getItem(`photo-prompt-${currentResume.id}`);
      if (!dismissed) {
        setShowPhotoSheet(true);
      }
    }
  }, [selectedTemplate, currentResume?.id]);

  // Guest preview hint toast
  useEffect(() => {
    if (user || guestPreviewHintShown.current || sessionStorage.getItem('wr-preview-signin-hint') === '1') return;
    guestPreviewHintShown.current = true;
    const timer = setTimeout(() => {
      sessionStorage.setItem('wr-preview-signin-hint', '1');
      toast('Sign in to save and download in multiple formats', {
        action: { label: 'Sign Up', onClick: () => window.location.href = '/auth?mode=signup' },
        duration: 5000
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  // Update section ordering based on actual DOM layout after render
  useEffect(() => {
    const updateSectionOrder = () => {
      if (!resumeRef.current) return;
      requestAnimationFrame(() => {
        if (resumeRef.current) {
          const orderedSections = getSectionsInDOMOrder(resumeRef.current);
          setDomSections(orderedSections);
        }
      });
    };
    updateSectionOrder();
  }, [currentResume, selectedTemplate]);

  // Use DOM-ordered sections, falling back to data-based ordering
  const availableSections = useMemo(() => {
    if (domSections.length > 0) return domSections;
    if (!currentResume) return [];
    const sections: SectionId[] = [];
    if (currentResume.summary) sections.push('summary');
    if (currentResume.experience.length > 0) sections.push('experience');
    if (currentResume.education.length > 0) sections.push('education');
    if (currentResume.skills.length > 0) sections.push('skills');
    if (currentResume.certifications.length > 0) sections.push('certifications');
    if (currentResume.awards && currentResume.awards.length > 0) sections.push('awards');
    if (currentResume.projects && currentResume.projects.length > 0) sections.push('projects');
    if (currentResume.publications && currentResume.publications.length > 0) sections.push('publications');
    if (currentResume.volunteering && currentResume.volunteering.length > 0) sections.push('volunteering');
    if (currentResume.hobbies && currentResume.hobbies.filter((h) => h.visible).length > 0) sections.push('hobbies');
    if (currentResume.references && currentResume.references.length > 0) sections.push('references');
    if (currentResume.languages && currentResume.languages.length > 0) sections.push('languages');
    return sections;
  }, [currentResume, domSections]);

  const manualBreakSections = useMemo(() => {
    if (pageBreakSettings.mode === 'manual' && pageBreakSettings.breakAfterSections.length > 0) {
      return pageBreakSettings.breakAfterSections;
    }
    return undefined;
  }, [pageBreakSettings]);

  // Resume guard
  if (!currentResume) {
    navigate(user ? '/dashboard' : '/');
    return null;
  }

  // Photo sheet handlers
  const handleUseProfilePhoto = () => {
    if (profile?.avatarUrl) {
      updateResume({
        contactInfo: { ...currentResume.contactInfo, photoUrl: profile.avatarUrl }
      });
      toast.success('Profile photo added to resume');
    }
  };

  const handleUploadPhoto = async (blob: Blob) => {
    try {
      if (user) {
        const fileName = `${user.id}/resume-photo-${Date.now()}.png`;
        const { data, error } = await supabase.storage.
        from('avatars').
        upload(fileName, blob, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        updateResume({ contactInfo: { ...currentResume.contactInfo, photoUrl: urlData.publicUrl } });
      } else {
        const url = URL.createObjectURL(blob);
        updateResume({ contactInfo: { ...currentResume.contactInfo, photoUrl: url } });
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
    resetProgress();

    const MAX_RETRIES = 2;
    let attempt = 0;

    const tryExport = async (): Promise<void> => {
      try {
        const { generatePDF, generateCoverLetterPDF, generateCombinedPDF, generateOnePagePDF } = await import('@/lib/pdfGenerator');
        const baseName = currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Document';
        const pdfOptions = { showPageNumbers, pageNumberFormat: 'full' as const, showBranding };

        // DOCX export path
        if (type === 'docx') {
          onProgress('preparing', 10);
          onProgress('finalizing', 50);
          const { generateAndDownloadDOCX } = await import('@/lib/docxGenerator');
          const success = await generateAndDownloadDOCX(currentResume);
          onProgress('downloading', 100);
          if (success) {
            toast.success('Word document downloaded!');
            setShowExportSheet(false);
            incrementPositiveActions();
          }
          return;
        }

        // Text-based exports (no PDF generation needed)
        if (type === 'plain-text') {
          const { generatePlainText } = await import('@/lib/shareUtils');
          const text = generatePlainText(currentResume);
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const fileName = `${baseName}_Resume.txt`;
          const result = await downloadFile({ blob, fileName });
          if (result.success) toast.success('Plain text downloaded!');
          setShowExportSheet(false);
          return;
        }

        if (type === 'linkedin') {
          const { generateLinkedInFormat } = await import('@/lib/shareUtils');
          const sections = generateLinkedInFormat(currentResume);
          const fullText = `=== ABOUT ===\n${sections.about}\n\n=== EXPERIENCE ===\n${sections.experience}\n\n=== EDUCATION ===\n${sections.education}\n\n=== SKILLS ===\n${sections.skills}`;
          await navigator.clipboard.writeText(fullText);
          toast.success('LinkedIn format copied to clipboard!');
          setShowExportSheet(false);
          return;
        }

        if (type === 'share-link') {
          const { shareAsLink } = await import('@/lib/shareUtils');
          if (currentResume.id) {
            await shareAsLink(currentResume.id);
          } else {
            toast.error('Save your resume first to generate a share link');
          }
          setShowExportSheet(false);
          return;
        }

        let pdfBlob: Blob;
        let fileName: string;

        switch (type) {
          case 'cover-letter':
            if (!generatedCoverLetter) {toast.error('Generate a cover letter first');return;}
            pdfBlob = await generateCoverLetterPDF(generatedCoverLetter, currentResume.contactInfo, pdfOptions);
            fileName = `${baseName}_Cover_Letter.pdf`;
            break;

          case 'combined':
            if (!generatedCoverLetter) {toast.error('Generate a cover letter first');return;}
            pdfBlob = await generateCombinedPDF(currentResume, selectedTemplate, generatedCoverLetter, resumeRef.current, manualBreakSections, pdfOptions);
            fileName = `${baseName}_Application_Package.pdf`;
            break;

          case 'one-page':
            pdfBlob = await generateOnePagePDF(currentResume, selectedTemplate, resumeRef.current, pdfOptions, onProgress);
            fileName = `${baseName}_Resume_OnePage.pdf`;
            break;

          case 'ats-pdf':{
              // ATS mode: strip colors, force single column, no photo
              const atsResume = {
                ...currentResume,
                customization: {
                  ...(currentResume.customization || {}),
                  accentColor: '#000000',
                  layout: 'single' as const,
                  fontHeading: 'Arial',
                  fontBody: 'Arial',
                  fontSize: 'medium' as const,
                  spacing: 'normal' as const,
                  margins: 'normal' as const,
                  lineHeight: '1.15' as const,
                  pageFormat: (currentResume.customization?.pageFormat || 'letter') as 'a4' | 'letter'
                },
                contactInfo: { ...currentResume.contactInfo, photoUrl: undefined }
              };
              pdfBlob = await generatePDF(atsResume, 'clean', resumeRef.current, undefined, { ...pdfOptions, showBranding: false }, onProgress);
              fileName = `${baseName}_Resume_ATS.pdf`;
              break;
            }

          case 'resume':
          default:
            pdfBlob = await generatePDF(currentResume, selectedTemplate, resumeRef.current, manualBreakSections, pdfOptions, onProgress);
            fileName = `${baseName}_Resume.pdf`;
            break;
        }

        onProgress('downloading', 95);
        const result = await downloadFile({ blob: pdfBlob, fileName });

        if (result.cancelled) {
          toast.info('Download cancelled. Tap download again to save your PDF.');
          return;
        }

        if (result.success) {
          const successMessages: Record<ExportType, string> = {
            'resume': 'Resume downloaded!',
            'cover-letter': 'Cover letter downloaded!',
            'combined': 'Application package downloaded!',
            'one-page': 'One-page resume downloaded!',
            'docx': 'Word document downloaded!',
            'ats-pdf': 'ATS-optimized PDF downloaded!',
            'linkedin': 'LinkedIn format copied!',
            'plain-text': 'Plain text downloaded!',
            'share-link': 'Share link generated!',
            'interview-prep': 'Starting interview prep...'
          };
          toast.success(successMessages[type]);
          if (result.method === 'data-url' || result.method === 'open') {
            toast.info('If the file did not save, use the share icon to "Save to Files"', { duration: 6000 });
          }
        }

        onProgress('downloading', 100);
        setShowExportSheet(false);
        incrementPositiveActions();

        setTimeout(() => {
          if (shouldPromptForRating()) {
            toast('Enjoying WiseResume?', {
              description: 'Rate us on the app store to help others find us!',
              duration: 8000,
              action: { label: 'Rate Now', onClick: openAppStore },
              cancel: { label: 'Later', onClick: dismissRating }
            });
          }
        }, 1500);

      } catch (error) {
        attempt++;
        const isPdfError = error instanceof PdfGenerationError;
        const errMsg = error instanceof Error ? error.message : '';
        const is401 = errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('jwt expired');

        // Session-expired errors show a specific, actionable message
        if (is401) {
          toast.error('Session expired — please sign in again to generate this export.');
          return;
        }

        const errorMessage = isPdfError && error.code === 'EMPTY_CANVAS' ?
        'Empty canvas captured. Ensure the resume preview is visible.' :
        isPdfError && error.code === 'MISSING_ELEMENT' ?
        'Resume template not found. Please go back and try again.' :
        'Failed to generate PDF.';

        if (attempt < MAX_RETRIES && isPdfError && error.code !== 'MISSING_ELEMENT') {
          toast.error(`${errorMessage} Retrying... (${attempt}/${MAX_RETRIES})`, { duration: 3000 });
          await new Promise((r) => setTimeout(r, 500));
          return tryExport();
        }

        console.error('Export error:', error);
        toast.error(errorMessage, {
          action: attempt >= MAX_RETRIES ? { label: 'Retry', onClick: () => handleExport(type, showPageNumbers, showBranding) } : undefined
        });
      }
    };

    try {
      await tryExport();
    } finally {
      setIsGenerating(false);
      resetProgress();
    }
  };

  const handleQuickDownload = async () => {
    await handleExport('resume', true);
  };

  const handleSaveToFiles = async () => {
    setIsGenerating(true);
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      const pdfBlob = await generatePDF(currentResume, selectedTemplate, resumeRef.current, manualBreakSections, { showPageNumbers: true });
      const fileName = `${currentResume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        toast.info('Choose "Save to Files" from the menu', { duration: 5000 });
        await navigator.share({ files: [file], title: fileName });
        toast.success('Resume saved!');
      } else {
        toast.error('Save to Files is not supported on this device');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
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
        const { generatePDF } = await import('@/lib/pdfGenerator');
        const pdfBlob = await generatePDF(currentResume, selectedTemplate, resumeRef.current, manualBreakSections, { showPageNumbers: true });
        const file = new File([pdfBlob], 'Resume.pdf', { type: 'application/pdf' });
        await navigator.share({ title: 'My Resume', files: [file] });
      } catch (error) {
        console.error('Share error:', error);
        toast.error('Failed to share. Try downloading instead.');
      }
    } else {
      toast.info('Share not supported. Downloading instead.');
      handleQuickDownload();
    }
  };

  const TemplateComponent = templateComponentMap[selectedTemplate];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-2 pt-safe">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/editor')}
            className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back">

            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-page-title truncate">Preview</h1>
        </div>
      </header>

        {/* Template Quick Switcher + ATS Badge */}
        <motion.div
        className="border-b border-border shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}>

          <div
          className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide snap-x snap-mandatory"
          role="radiogroup"
          aria-label="Resume Templates">

            {templates.map((template) =>
          <button
            key={template.id}
            role="radio"
            aria-checked={selectedTemplate === template.id}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all snap-center touch-manipulation min-h-[44px]',
              selectedTemplate === template.id ?
              'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            onClick={() => setSelectedTemplate(template.id)}>

                {template.name}
              </button>
          )}
          </div>
          {/* ATS Ready Badge & Page Break Toggle - merged into template row */}
          <div className="px-3 pb-2 flex items-center justify-between text-xs pt-[8px]">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-success" />
              <span className="text-success font-medium">ATS-Ready</span>
            </div>
            <button
            onClick={() => setShowPageBreakSheet(true)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              !templateConfig.supportsPageBreaks ?
              "bg-muted text-muted-foreground" :
              pageBreakSettings.mode === 'manual' ?
              "bg-blue-100 text-blue-600" :
              showPageBreaks ?
              "bg-orange-100 text-orange-600" :
              "bg-muted text-muted-foreground hover:bg-muted/80"
            )}>

              {templateConfig.singlePageOptimized ?
            <>
                  <FileText className="w-3 h-3" />
                  Single-page
                </> :

            <>
                  <Scissors className="w-3 h-3" />
                  Page breaks
                  {pageBreakSettings.mode === 'manual' && templateConfig.supportsManualBreaks &&
              <span className="ml-0.5 px-1 py-0.5 bg-blue-200 rounded text-xs">
                      {pageBreakSettings.breakAfterSections.length}
                    </span>
              }
                </>
            }
            </button>
          </div>
        </motion.div>

        {/* AI Tailor Hint Banner */}
        <NextStepBanner variant="tailor" onAction={() => navigate('/editor?openTailor=1')} />

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-1 sm:p-4 bg-muted/30">
          <motion.div
          ref={resumeRef}
          data-resume-template
          data-capturing={isGenerating ? "true" : undefined}
          className="bg-white text-black mx-auto shadow-2xl relative"
          style={{
            width: '100%',
            maxWidth: '612px',
            minHeight: '792px'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}>

            <Suspense fallback={<TemplateSkeleton />}>
              <TemplateComponent resume={currentResume} />
            </Suspense>
            {!isGenerating && showPageBreaks && templateConfig.supportsPageBreaks &&
          <PageBreakIndicator
            templateRef={resumeRef}
            manualBreakSections={manualBreakSections}
            templateConfig={templateConfig} />

          }
          </motion.div>
        </div>

        {/* Bottom actions */}
        <motion.div
        className="shrink-0 px-3 py-2 sm:p-4 glass border-t border-border space-y-1.5 sm:space-y-2 pl-[10px] pr-[10px] pb-[max(8px,env(safe-area-inset-bottom))] pt-1 mb-0 mt-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}>

          <div className="gap-2 flex flex-row pl-[5px] pt-[2px] pb-[2px] pr-[5px] mb-0 mt-0 ml-px mr-px">
            <Button
            size="default"
            className="flex-1 h-10 sm:h-12 text-sm sm:text-base font-semibold gradient-primary touch-manipulation shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]"
            onClick={() => setShowExportSheet(true)}
            disabled={isGenerating}>
              <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Export CV
            </Button>
            <Button
            size="default"
            variant="outline"
            className="h-10 sm:h-12 px-3 sm:px-4 touch-manipulation"
            onClick={handleQuickDownload}
            disabled={isGenerating}
            title="Quick PDF download">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <Button
            variant="outline"
            size="sm"
            className="w-auto px-2.5 h-11 sm:h-11 touch-manipulation"
            onClick={() => navigate('/editor')}>

              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="text-xs sm:text-sm">Edit</span>
            </Button>
            {isIOS &&
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 sm:h-11 touch-manipulation"
            onClick={handleSaveToFiles}
            disabled={isGenerating}>

                <FolderDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                <span className="text-xs sm:text-sm">Save</span>
              </Button>
          }
            <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 sm:h-11 touch-manipulation"
            onClick={() => navigate('/interview')}>

              <Mic className="sm:w-4 sm:h-4 mr-1 sm:mr-1.5 w-[20px] h-[20px]" />
              <span className="text-xs sm:text-sm">Interview</span>
            </Button>
            <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 sm:h-11 touch-manipulation"
            onClick={() => setShowShareSheet(true)}>

              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="text-xs sm:text-sm">Share</span>
            </Button>
          </div>
        </motion.div>

      {/* Sheets - lazy loaded */}
      <Suspense fallback={null}>
        {showPageBreakSheet &&
        <PageBreakSheet
          open={showPageBreakSheet}
          onOpenChange={setShowPageBreakSheet}
          settings={pageBreakSettings}
          onSettingsChange={setPageBreakSettings}
          availableSections={availableSections}
          templateConfig={templateConfig}
          resume={currentResume ?? undefined}
          onSwitchTemplate={setSelectedTemplate} />

        }
        {showExportSheet &&
        <ExportOptionsSheet
          open={showExportSheet}
          onOpenChange={setShowExportSheet}
          hasCoverLetter={!!generatedCoverLetter}
          coverLetterContext={coverLetterJobContext}
          onExport={handleExport}
          isExporting={isGenerating}
          templateElement={resumeRef.current}
          exportProgress={exportProgress}
          resumeName={currentResume?.contactInfo?.fullName || 'Resume'}
          templateName={templates.find((t) => t.id === selectedTemplate)?.name || selectedTemplate} />

        }
        {showOnePageWizard &&
        <OnePageWizardSheet
          open={showOnePageWizard}
          onOpenChange={setShowOnePageWizard}
          onExportOnePage={() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                handleExport('one-page', true, true);
              });
            });
          }} />

        }
        {showPhotoSheet &&
        <ResumePhotoSheet
          open={showPhotoSheet}
          onOpenChange={setShowPhotoSheet}
          profilePhotoUrl={profile?.avatarUrl || null}
          resumeId={currentResume?.id}
          onUseProfilePhoto={handleUseProfilePhoto}
          onUploadPhoto={handleUploadPhoto}
          onKeepInitials={handleKeepInitials} />

        }
        {showShareSheet && currentResume &&
        <ShareSheet
          open={showShareSheet}
          onOpenChange={setShowShareSheet}
          resume={currentResume}
          templateId={selectedTemplate}
          templateName={templates.find((t) => t.id === selectedTemplate)?.name || selectedTemplate}
          resumeRef={resumeRef}
          manualBreakSections={manualBreakSections} />

        }
      </Suspense>
    </div>);

}
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Download, FileDown, FileEdit, Loader2 } from 'lucide-react';

import { toast } from 'sonner';

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Progress } from '@/components/ui/progress';

import { Switch } from '@/components/ui/switch';

import templateComponents from '@/components/templates/registry';

import { ExportPageBreakSetup } from '@/components/editor/export/ExportPageBreakSetup';

import { databases, DATABASE_ID } from '@/lib/appwrite';

import { COLLECTIONS } from '@/lib/appwrite-collections';

import { getPageDimensionsForFormat } from '@/lib/pdfUtils';

import { resolvePageBreakTemplate } from '@/lib/resolvePageBreakTemplate';

import { migrateTemplateId } from '@/lib/templateMigration';

import { generateCustomizationCSS } from '@/lib/templateCustomization';

import { sanitizeFileName } from '@/lib/sanitizeFileName';

import { getPdfExportErrorMessage } from '@/lib/pdfExportErrors';

import { buildJobApplicationDisplayName } from '@/lib/tailorJobContext';

import haptics from '@/lib/haptics';

import { useExportProgress } from '@/hooks/useExportProgress';

import { useIsMobile } from '@/hooks/use-mobile';

import { usePlan } from '@/hooks/usePlan';

import { useSettingsStore } from '@/store/settingsStore';

import { useResumeStore } from '@/store/resumeStore';

import type { ResumeData, TemplateId } from '@/types/resume';



interface TailorQuickPdfExportDialogProps {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  resume: ResumeData | null;

  templateId: TemplateId;

  resumeDocId?: string;

  jobTitle?: string;

  company?: string;

}



function MeasureTemplateSkeleton() {

  return <div className="min-h-[792px] bg-white" />;

}



export function TailorQuickPdfExportDialog({

  open,

  onOpenChange,

  resume,

  templateId,

  resumeDocId,

  jobTitle,

  company,

}: TailorQuickPdfExportDialogProps) {

  const resumeRef = useRef<HTMLDivElement>(null);

  const [pageBreakTemplateEl, setPageBreakTemplateEl] = useState<HTMLElement | null>(null);

  const [isExporting, setIsExporting] = useState(false);



  const { pdfDefaults } = useSettingsStore();

  const { isPremium } = usePlan();

  const isMobile = useIsMobile(768);

  const [showPageNumbers, setShowPageNumbers] = useState(pdfDefaults.showPageNumbers ?? true);

  const [showBranding, setShowBranding] = useState(pdfDefaults.showBranding ?? true);

  const [customFileName, setCustomFileName] = useState('');



  const { exportProgress, onProgress, reset: resetProgress } = useExportProgress();



  const setCurrentResume = useResumeStore((s) => s.setCurrentResume);

  const setCurrentResumeId = useResumeStore((s) => s.setCurrentResumeId);

  const setSelectedTemplate = useResumeStore((s) => s.setSelectedTemplate);

  const currentResume = useResumeStore((s) => s.currentResume);



  const safeTemplateId = useMemo((): TemplateId => {

    return templateComponents[templateId] ? templateId : migrateTemplateId(templateId);

  }, [templateId]);



  const TemplateComponent = templateComponents[safeTemplateId] ?? templateComponents.modern;



  const pageFormat = currentResume?.customization?.pageFormat ?? 'letter';

  const previewDims = useMemo(() => getPageDimensionsForFormat(pageFormat), [pageFormat]);



  useEffect(() => {

    if (!open) return;

    setShowPageNumbers(pdfDefaults.showPageNumbers ?? true);

    setShowBranding(pdfDefaults.showBranding ?? true);

    resetProgress();

    const source = useResumeStore.getState().currentResume ?? resume;

    setCustomFileName(buildJobApplicationDisplayName({

      jobTitle,

      company,

      fullName: source?.contactInfo?.fullName ?? source?.title,

    }));

  }, [open, jobTitle, company, resume, pdfDefaults.showBranding, pdfDefaults.showPageNumbers, resetProgress]);



  useEffect(() => {

    if (!open || !resume) return;

    const storeResume = useResumeStore.getState().currentResume;

    const resumeKey = resume.id ?? resumeDocId ?? null;

    const storeKey = storeResume?.id ?? useResumeStore.getState().currentResumeId;

    const hasSavedBreaks = (storeResume?.customization?.customBreakPositions?.length ?? 0) > 0;

    if (hasSavedBreaks && resumeKey && storeKey === resumeKey) {

      setCurrentResumeId(resumeKey);

      setSelectedTemplate(safeTemplateId);

      return;

    }

    setCurrentResume(resume);

    setCurrentResumeId(resumeKey);

    setSelectedTemplate(safeTemplateId);

  }, [

    open,

    resume,

    resumeDocId,

    safeTemplateId,

    setCurrentResume,

    setCurrentResumeId,

    setSelectedTemplate,

  ]);



  useEffect(() => {

    if (!open) {

      setPageBreakTemplateEl(null);

      return;

    }

    const sync = () => setPageBreakTemplateEl(resolvePageBreakTemplate(resumeRef));

    sync();

    const t1 = window.setTimeout(sync, 50);

    const t2 = window.setTimeout(sync, 200);

    return () => {

      window.clearTimeout(t1);

      window.clearTimeout(t2);

    };

  }, [open, currentResume, safeTemplateId]);



  const persistExportSettings = useCallback(async (snapshot: ResumeData) => {

    const docId = resumeDocId ?? snapshot.id;

    if (!docId) return;

    try {

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, docId, {

        template: safeTemplateId,

        customization: JSON.stringify(snapshot.customization ?? {}),

      });

    } catch {

      // Non-blocking — export can still proceed with in-memory settings

    }

  }, [resumeDocId, safeTemplateId]);



  const handleDownload = useCallback(async () => {

    const snapshot = useResumeStore.getState().currentResume ?? resume;

    if (!snapshot) {

      toast.error('Resume not ready');

      return;

    }



    setIsExporting(true);

    resetProgress();

    haptics.medium();



    try {

      onProgress('preparing', 10);

      await persistExportSettings(snapshot);



      const { generateNativePDF } = await import('@/lib/nativePdfGenerator');

      const { resolveExportBreakPositions } = await import('@/lib/pdfUtils');

      const { exportResumePdfFromData } = await import('@/lib/exportResumePdf');

      const { downloadFile } = await import('@/lib/downloadUtils');



      const latest = useResumeStore.getState().currentResume ?? snapshot;

      const savedBreaks = latest.customization?.customBreakPositions;

      const templateEl = pageBreakTemplateEl ?? resolvePageBreakTemplate(resumeRef);

      const customBreakPositions = templateEl

        ? resolveExportBreakPositions(templateEl, savedBreaks)

        : savedBreaks ?? [];



      const exportOpts = {

        pageFormat: (latest.customization?.pageFormat ?? 'letter') as 'letter' | 'a4',

        showPageNumbers,

        showBranding: isPremium ? showBranding : true,

        onProgress,

        renderTimeoutMs: 8000,

        ...(customBreakPositions.length ? { customBreakPositions } : {}),

      };



      const pdfBlob = templateEl && templateEl.scrollHeight > 100

        ? await generateNativePDF(templateEl, exportOpts)

        : await exportResumePdfFromData(latest, safeTemplateId, exportOpts);



      const baseName = customFileName.trim()

        ? sanitizeFileName(customFileName.trim())

        : sanitizeFileName(

          buildJobApplicationDisplayName({

            jobTitle,

            company,

            fullName: latest.contactInfo?.fullName ?? latest.title,

          }),

        );

      const result = await downloadFile({

        blob: pdfBlob,

        fileName: `${baseName}.pdf`,

        mimeType: 'application/pdf',

      });



      if (!result.success) {

        if (result.cancelled) return;

        throw new Error('Download failed');

      }



      onProgress('downloading', 100);

      haptics.success();

      toast.success('PDF downloaded');

      onOpenChange(false);

    } catch (err) {

      haptics.error();

      toast.error(getPdfExportErrorMessage(err), { duration: 8000 });

    } finally {

      setIsExporting(false);

    }

  }, [

    isPremium,

    onOpenChange,

    onProgress,

    persistExportSettings,

    resetProgress,

    resume,

    safeTemplateId,

    showBranding,

    showPageNumbers,

    pageBreakTemplateEl,

    customFileName,

    jobTitle,

    company,

  ]);



  const exportResume = currentResume ?? resume;

  const progressPct = exportProgress?.progress ?? 0;

  const showProgress = isExporting && exportProgress && exportProgress.stage !== 'idle';



  return (

    <Dialog open={open} onOpenChange={(next) => !isExporting && onOpenChange(next)}>

      <DialogContent className="jmw-pdf-export-dialog max-w-none w-auto gap-0 p-0 overflow-hidden sm:max-w-none md:max-w-none">

        <DialogHeader className="jmw-pdf-export-dialog__header">

          <div className="jmw-pdf-export-dialog__header-main">

            <div className="jmw-pdf-export-dialog__header-icon" aria-hidden>

              <FileDown className="h-5 w-5" />

            </div>

            <div className="min-w-0">

              <DialogTitle className="jmw-pdf-export-dialog__title">Download PDF</DialogTitle>

              <DialogDescription className="jmw-pdf-export-dialog__subtitle">

                Preview your layout, pick page breaks, then export.

              </DialogDescription>

            </div>

          </div>

        </DialogHeader>



        <div

          className="fixed -left-[10000px] top-0 opacity-0 pointer-events-none"

          aria-hidden

        >

          <div

            ref={resumeRef}

            data-resume-template

            className="bg-white text-black"

            style={{

              width: `${previewDims.pageWidth}px`,

              minWidth: `${previewDims.pageWidth}px`,

              maxWidth: `${previewDims.pageWidth}px`,

              minHeight: `${previewDims.pageHeight}px`,

            }}

          >

            {exportResume && (

              <Suspense fallback={<MeasureTemplateSkeleton />}>

                {exportResume.customization && (

                  <style>{generateCustomizationCSS(exportResume.customization)}</style>

                )}

                <TemplateComponent

                  resume={exportResume}

                  accentColor={exportResume.customization?.accentColor}

                />

              </Suspense>

            )}

          </div>

        </div>



        <div className="jmw-pdf-export-dialog__body">

          <ExportPageBreakSetup

            active={open}

            variant="streamlined"

            templateElement={pageBreakTemplateEl}

            resumeData={exportResume}

            maxPreviewHeight={isMobile ? 360 : 640}

            previewLayout={isMobile ? 'stack' : 'spread'}

            defaultBreakSection="education"

          />



          <div className="jmw-pdf-export-dialog__sidebar-panel">

            <div className="jmw-pdf-export-dialog__options">

              <p className="jmw-pdf-export-dialog__options-label">Export options</p>

              <div className="jmw-pdf-export-dialog__option">

                <div>

                  <Label htmlFor="tailor-pdf-page-numbers" className="text-sm font-medium">

                    Page numbers

                  </Label>

                  <p className="text-xs text-muted-foreground">Footer with page X of Y</p>

                </div>

                <Switch

                  id="tailor-pdf-page-numbers"

                  checked={showPageNumbers}

                  onCheckedChange={setShowPageNumbers}

                />

              </div>

              {isPremium && (

                <div className="jmw-pdf-export-dialog__option">

                  <div>

                    <Label htmlFor="tailor-pdf-branding" className="text-sm font-medium">

                      WiseResume badge

                    </Label>

                    <p className="text-xs text-muted-foreground">Small footer credit</p>

                  </div>

                  <Switch

                    id="tailor-pdf-branding"

                    checked={showBranding}

                    onCheckedChange={setShowBranding}

                  />

                </div>

              )}

            </div>



            {showProgress && (

              <div className="jmw-pdf-export-dialog__progress space-y-1.5">

                <Progress value={progressPct} className="h-1.5" />

                <p className="text-xs text-muted-foreground text-center">

                  {exportProgress?.message ?? 'Preparing PDF…'}

                </p>

              </div>

            )}



            <div className="jmw-pdf-export-dialog__footer">

              <div className="jmw-pdf-export-dialog__filename">

                <Label htmlFor="tailor-pdf-filename" className="jmw-pdf-export-dialog__filename-label">

                  File name

                </Label>

                <div className="jmw-pdf-export-dialog__filename-row">

                  <FileEdit className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />

                  <Input

                    id="tailor-pdf-filename"

                    value={customFileName}

                    onChange={(e) => setCustomFileName(e.target.value)}

                    className="jmw-pdf-export-dialog__filename-input"

                    placeholder="Job Title - Company"

                    aria-label="PDF file name"

                  />

                  <span className="jmw-pdf-export-dialog__filename-suffix">.pdf</span>

                </div>

              </div>

              <Button

                type="button"

                className="jmw-pdf-export-dialog__download"

                onClick={handleDownload}

                disabled={isExporting || !exportResume}

              >

                {isExporting ? (

                  <>

                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />

                    Preparing PDF…

                  </>

                ) : (

                  <>

                    <Download className="w-4 h-4 mr-2" aria-hidden />

                    Download PDF

                  </>

                )}

              </Button>

            </div>

          </div>

        </div>

      </DialogContent>

    </Dialog>

  );

}


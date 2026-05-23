import { useState, useEffect, useRef } from 'react';
import { Download, FileText, FileType, Shield, Linkedin, AlignLeft, Link2, FolderDown, Image, FileCode, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePlan } from '@/hooks/usePlan';
import { ExportType, CoverLetterContext } from '@/types/resume';
import type { ResumeData } from '@/types/resume';
import { useSettingsStore } from '@/store/settingsStore';
import haptics from '@/lib/haptics';
import type { ExportProgress } from '@/hooks/useExportProgress';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ExportTypeList } from './export/ExportTypeList';
import { AtsWarningAlert } from './export/AtsWarningAlert';
import { PdfOptionsFooter } from './export/PdfOptionsFooter';
import { ExportProgressBar } from './export/ExportProgressBar';
import { LaTeXPreviewPanel } from './export/LaTeXPreviewPanel';
import type { ExportOptionDef } from './export/ExportOptionCard';

interface ExportOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCoverLetter: boolean;
  coverLetterContext?: CoverLetterContext | null;
  onExport: (type: ExportType, showPageNumbers: boolean, showBranding: boolean, customFileName?: string) => void;
  onCreateCoverLetter?: () => void;
  onCreateGeneralCoverLetter?: () => void;
  isExporting: boolean;
  templateElement?: HTMLElement | null;
  exportProgress?: ExportProgress;
  resumeName?: string;
  templateName?: string;
  templateAtsScore?: 'high' | 'medium' | 'low';
  resumeData?: ResumeData | null;
}

export function ExportOptionsSheet({
  open, onOpenChange, hasCoverLetter, coverLetterContext, onExport, onCreateCoverLetter, onCreateGeneralCoverLetter,
  isExporting, templateElement, exportProgress, resumeName, templateName, templateAtsScore, resumeData,
}: ExportOptionsSheetProps) {
  const { pdfDefaults, lastExportType, setLastExportType } = useSettingsStore();
  const { isOnline } = useNetworkStatus();
  const { isPremium } = usePlan();

  const defaultType = (lastExportType as ExportType) || 'resume';
  const [selectedType, setSelectedType] = useState<ExportType>(defaultType);
  const [showPageNumbers, setShowPageNumbers] = useState(pdfDefaults.showPageNumbers ?? true);
  const [showBranding, setShowBranding] = useState(pdfDefaults.showBranding ?? true);
  const [customFileName, setCustomFileName] = useState('');
  const [highlightedType, setHighlightedType] = useState<ExportType | null>(null);

  useEffect(() => {
    if (!highlightedType) return;
    const t = setTimeout(() => setHighlightedType(null), 800);
    return () => clearTimeout(t);
  }, [highlightedType]);

  useEffect(() => {
    if (open) {
      setSelectedType((lastExportType as ExportType) || 'resume');
      setShowPageNumbers(pdfDefaults.showPageNumbers ?? true);
      setShowBranding(pdfDefaults.showBranding ?? true);
      setCustomFileName(resumeName?.replace(/\s+/g, '_') || 'Resume');
    }
  }, [open, pdfDefaults, resumeName, lastExportType]);

  const exportCompletedRef = useRef(false);
  useEffect(() => {
    if (exportProgress?.stage === 'downloading' && !exportCompletedRef.current) {
      exportCompletedRef.current = true;
      window.dispatchEvent(new CustomEvent('wr-export-completed'));
    }
    if (!exportProgress || exportProgress.stage === 'idle') {
      exportCompletedRef.current = false;
    }
  }, [exportProgress?.stage]);

  // Primary formats — one-page removed (handled by Page Cut Setup in the editor)
  const primaryOptions: ExportOptionDef[] = [
    { id: 'resume',   label: 'PDF (Design-Enhanced)',  description: 'Full design with colors, icons & visual hierarchy',        icon: FileText, available: true },
    { id: 'ats-pdf',  label: 'PDF (ATS-Optimized)',    description: 'Black & white, simple fonts, machine-readable',            icon: Shield,   available: true, badge: 'ATS-Safe' },
    { id: 'docx',     label: 'Word Document',           description: 'ATS-friendly text-selectable DOCX',                       icon: FileType,  available: true, badge: 'ATS-Friendly' },
    { id: 'image',    label: '4K Image',                description: 'High-resolution single image of your CV',                 icon: Image,     available: true },
  ];

  // Secondary formats (shown in the same pill row, no collapsible)
  const secondaryOptions: ExportOptionDef[] = [
    { id: 'linkedin',     label: 'LinkedIn Format',     description: 'Copy-paste ready sections for LinkedIn',                                                                                              icon: Linkedin,  available: true },
    { id: 'plain-text',   label: 'Plain Text (.txt)',   description: 'Pure text, email-friendly, ATS-safe',                                                                                                icon: AlignLeft, available: true },
    { id: 'share-link',   label: 'Shareable Web Link',  description: 'Generate a public link to your resume',                                                                                              icon: Link2,     available: true },
    { id: 'cover-letter', label: 'Cover Letter Only',   description: !isOnline ? 'Requires an internet connection' : hasCoverLetter ? `For ${coverLetterContext?.title || 'position'} at ${coverLetterContext?.company || 'company'}` : 'Generate a cover letter first', icon: FileText, available: hasCoverLetter && isOnline },
    { id: 'combined',     label: 'Application Package', description: !isOnline ? 'Requires an internet connection' : hasCoverLetter ? 'Cover letter + Resume in one PDF' : 'Generate a cover letter first', icon: Package,   available: hasCoverLetter && isOnline },
    { id: 'json',         label: 'JSON Backup',         description: 'Full resume data as a portable JSON file',                                                                                           icon: FolderDown, available: true },
    { id: 'latex',        label: 'LaTeX Source (.tex)', description: 'Compile with Overleaf or pdflatex — ideal for academic & technical roles',                                                           icon: FileCode,  available: true, badge: 'Academic / Tech' },
  ];

  const handleExport = () => {
    haptics.medium();
    setLastExportType(selectedType);
    onExport(selectedType, showPageNumbers, showBranding, customFileName || undefined);
  };

  const handleSwitchToAts = () => {
    haptics.light();
    setSelectedType('ats-pdf');
    setHighlightedType('ats-pdf');
  };

  const isPdfType       = ['resume', 'ats-pdf', 'cover-letter', 'combined'].includes(selectedType);
  const isTextType      = ['linkedin', 'plain-text', 'share-link'].includes(selectedType);
  const isDownloadable  = !['linkedin', 'plain-text', 'share-link'].includes(selectedType)
    ? true
    : ['plain-text'].includes(selectedType);
  const allOptions      = [...primaryOptions, ...secondaryOptions];
  const selectedOption  = allOptions.find(o => o.id === selectedType);
  const isOfflineBlocked = !isOnline && (selectedType === 'combined' || selectedType === 'cover-letter');
  const isButtonDisabled = isExporting || (selectedOption ? !selectedOption.available : false) || isOfflineBlocked;

  const getFileSuffix = () => {
    switch (selectedType) {
      case 'ats-pdf':      return '_Resume_ATS.pdf';
      case 'cover-letter': return '_Cover_Letter.pdf';
      case 'combined':     return '_Application_Package.pdf';
      case 'docx':         return '_Resume.docx';
      case 'plain-text':   return '_Resume.txt';
      case 'json':         return '_Backup.json';
      case 'image':        return '_Resume_4K.png';
      case 'latex':        return '_Resume.tex';
      default:             return '_Resume.pdf';
    }
  };

  const getButtonLabel = () => {
    if (selectedType === 'docx')         return 'Download DOCX';
    if (selectedType === 'combined')     return 'Download Package';
    if (selectedType === 'linkedin')     return 'Copy LinkedIn Text';
    if (selectedType === 'plain-text')   return 'Download .txt';
    if (selectedType === 'share-link')   return 'Copy Share Link';
    if (selectedType === 'json')         return 'Download JSON';
    if (selectedType === 'image')        return 'Download 4K Image';
    if (selectedType === 'latex')        return 'Download .tex';
    if (selectedType === 'ats-pdf')      return 'Download ATS PDF';
    if (selectedType === 'cover-letter') return 'Download Cover Letter';
    return 'Download CV';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0 rounded-2xl overflow-hidden max-h-[90vh]">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5 text-primary" aria-hidden />
                </span>
                Export Resume
              </DialogTitle>
              {(resumeName || templateName) && (
                <p className="text-xs text-muted-foreground mt-0.5 ml-9 truncate">
                  {resumeName}{resumeName && templateName ? ' · ' : ''}{templateName ? `${templateName} template` : ''}
                </p>
              )}
            </div>
            {templateAtsScore && (
              <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border tracking-wide ${
                templateAtsScore === 'high'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : templateAtsScore === 'medium'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}>
                ATS {templateAtsScore}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col gap-4">
          <ExportTypeList
            primaryOptions={primaryOptions}
            secondaryOptions={secondaryOptions}
            selectedType={selectedType}
            highlightedType={highlightedType}
            onePageScale={null}
            hasCoverLetter={hasCoverLetter}
            onSelect={setSelectedType}
            onCreateCoverLetter={onCreateCoverLetter}
            onCreateGeneralCoverLetter={onCreateGeneralCoverLetter}
          />

          {selectedType === 'resume' && (
            <AtsWarningAlert templateAtsScore={templateAtsScore} onSwitchToAts={handleSwitchToAts} />
          )}

          {selectedType === 'latex' && resumeData && (
            <LaTeXPreviewPanel resumeData={resumeData} />
          )}

          <PdfOptionsFooter
            visible={isPdfType && !isTextType && selectedType !== 'ats-pdf'}
            showPageNumbers={showPageNumbers}
            showBranding={showBranding}
            onPageNumbersChange={setShowPageNumbers}
            onBrandingChange={setShowBranding}
            isPremium={isPremium}
          />
        </div>

        {/* ── Sticky footer ── */}
        <div className="px-6 shrink-0">
          <ExportProgressBar
            exportProgress={exportProgress}
            isOnline={isOnline}
            selectedType={selectedType}
            isDownloadable={isDownloadable}
            customFileName={customFileName}
            fileSuffix={getFileSuffix()}
            buttonLabel={getButtonLabel()}
            isExporting={isExporting}
            isButtonDisabled={isButtonDisabled}
            isTextType={isTextType}
            isInterviewPrep={false}
            onFileNameChange={setCustomFileName}
            onExport={handleExport}
          />
        </div>

      </DialogContent>
    </Dialog>
  );
}

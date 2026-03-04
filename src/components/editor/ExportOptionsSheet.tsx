import { useState, useEffect } from 'react';
import { Download, FileText, Package, Minimize2, FileType, Shield, Linkedin, AlignLeft, Link2, FolderDown, Image } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExportType, CoverLetterContext } from '@/types/resume';
import { useSettingsStore } from '@/store/settingsStore';
import { estimateOnePageScale } from '@/lib/pdfUtils';
import haptics from '@/lib/haptics';
import type { ExportProgress } from '@/hooks/useExportProgress';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ExportTypeList } from './export/ExportTypeList';
import { AtsWarningAlert } from './export/AtsWarningAlert';
import { PdfOptionsFooter } from './export/PdfOptionsFooter';
import { ExportProgressBar } from './export/ExportProgressBar';
import type { ExportOptionDef } from './export/ExportOptionCard';

interface ExportOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCoverLetter: boolean;
  coverLetterContext?: CoverLetterContext | null;
  onExport: (type: ExportType, showPageNumbers: boolean, showBranding: boolean, customFileName?: string) => void;
  isExporting: boolean;
  templateElement?: HTMLElement | null;
  exportProgress?: ExportProgress;
  resumeName?: string;
  templateName?: string;
  templateAtsScore?: 'high' | 'medium' | 'low';
}

export function ExportOptionsSheet({
  open, onOpenChange, hasCoverLetter, coverLetterContext, onExport,
  isExporting, templateElement, exportProgress, resumeName, templateName, templateAtsScore,
}: ExportOptionsSheetProps) {
  const { pdfDefaults, lastExportType, setLastExportType } = useSettingsStore();
  const { isOnline } = useNetworkStatus();

  const defaultType = (lastExportType as ExportType) || 'resume';
  const [selectedType, setSelectedType] = useState<ExportType>(defaultType);
  const [showPageNumbers, setShowPageNumbers] = useState(pdfDefaults.showPageNumbers ?? true);
  const [showBranding, setShowBranding] = useState(pdfDefaults.showBranding ?? true);
  const [onePageScale, setOnePageScale] = useState<number | null>(null);
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
      setOnePageScale(null);
    }
  }, [open, pdfDefaults, resumeName, lastExportType]);

  useEffect(() => {
    if (selectedType === 'one-page' && onePageScale === null && templateElement) {
      try { setOnePageScale(estimateOnePageScale(templateElement)); } catch { setOnePageScale(null); }
    }
  }, [selectedType, onePageScale, templateElement]);

  // Primary options (always visible)
  const primaryOptions: ExportOptionDef[] = [
    { id: 'resume', label: 'PDF (Design-Enhanced)', description: 'Full design with colors, icons & visual hierarchy', icon: FileText, available: true },
    { id: 'ats-pdf', label: 'PDF (ATS-Optimized)', description: 'Black & white, simple fonts, machine-readable', icon: Shield, available: true, badge: 'ATS-Safe' },
    { id: 'docx', label: 'Word Document', description: 'ATS-friendly text-selectable DOCX', icon: FileType, available: true, badge: 'ATS-Friendly' },
    { id: 'one-page', label: 'One-Page Resume', description: 'Scale entire resume to fit one page', icon: Minimize2, available: true },
    { id: 'image', label: '4K Image', description: 'High-resolution single image of your CV', icon: Image, available: true },
  ];

  // Secondary options (collapsed behind "More formats")
  const secondaryOptions: ExportOptionDef[] = [
    { id: 'linkedin', label: 'LinkedIn Format', description: 'Copy-paste ready sections for LinkedIn', icon: Linkedin, available: true },
    { id: 'plain-text', label: 'Plain Text (.txt)', description: 'Pure text, email-friendly, ATS-safe', icon: AlignLeft, available: true },
    { id: 'share-link', label: 'Shareable Web Link', description: 'Generate a public link to your resume', icon: Link2, available: true },
    { id: 'cover-letter', label: 'Cover Letter Only', description: hasCoverLetter ? `For ${coverLetterContext?.title || 'position'} at ${coverLetterContext?.company || 'company'}` : 'Generate a cover letter first', icon: FileText, available: hasCoverLetter },
    { id: 'combined', label: 'Application Package', description: hasCoverLetter ? 'Cover letter + Resume in one PDF' : 'Generate a cover letter first', icon: Package, available: hasCoverLetter },
    { id: 'json', label: 'JSON Backup', description: 'Full resume data as a portable JSON file', icon: FolderDown, available: true },
  ];

  const handleExport = () => {
    setLastExportType(selectedType);
    onExport(selectedType, showPageNumbers, showBranding, customFileName || undefined);
  };

  const handleSwitchToAts = () => {
    haptics.light();
    setSelectedType('ats-pdf');
    setHighlightedType('ats-pdf');
    setTimeout(() => {
      document.querySelector('[data-export-id="ats-pdf"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const isPdfType = ['resume', 'ats-pdf', 'one-page', 'cover-letter', 'combined'].includes(selectedType);
  const isTextType = ['linkedin', 'plain-text', 'share-link'].includes(selectedType);
  const isDownloadable = ['resume', 'ats-pdf', 'one-page', 'cover-letter', 'combined', 'docx', 'plain-text', 'json', 'image'].includes(selectedType);
  const allOptions = [...primaryOptions, ...secondaryOptions];
  const selectedOption = allOptions.find(o => o.id === selectedType);
  const isButtonDisabled = isExporting || (selectedOption ? !selectedOption.available : false);

  const getFileSuffix = () => {
    switch (selectedType) {
      case 'ats-pdf': return '_Resume_ATS.pdf';
      case 'one-page': return '_Resume_OnePage.pdf';
      case 'cover-letter': return '_Cover_Letter.pdf';
      case 'combined': return '_Application_Package.pdf';
      case 'docx': return '_Resume.docx';
      case 'plain-text': return '_Resume.txt';
      case 'json': return '_Backup.json';
      case 'image': return '_Resume_4K.png';
      default: return '_Resume.pdf';
    }
  };

  const getButtonLabel = () => {
    if (selectedType === 'docx') return 'Download DOCX';
    if (selectedType === 'combined') return 'Download Package';
    if (selectedType === 'linkedin') return 'Copy LinkedIn Text';
    if (selectedType === 'plain-text') return 'Download .txt';
    if (selectedType === 'share-link') return 'Copy Share Link';
    if (selectedType === 'json') return 'Download JSON';
    if (selectedType === 'image') return 'Download 4K Image';
    if (selectedType === 'ats-pdf') return 'Download CV (ATS)';
    if (selectedType === 'one-page') return 'Download CV (1 Page)';
    return 'Download CV';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Options
          </SheetTitle>
          {(resumeName || templateName) && (
            <p className="text-sm text-muted-foreground mt-1">
              {resumeName}{resumeName && templateName ? ' · ' : ''}{templateName ? `${templateName} template` : ''}
            </p>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-4 min-h-0 pb-safe">
          <ExportTypeList
            primaryOptions={primaryOptions}
            secondaryOptions={secondaryOptions}
            selectedType={selectedType}
            highlightedType={highlightedType}
            onePageScale={onePageScale}
            onSelect={setSelectedType}
          />

          {selectedType === 'resume' && (
            <AtsWarningAlert templateAtsScore={templateAtsScore} onSwitchToAts={handleSwitchToAts} />
          )}

          <PdfOptionsFooter
            visible={isPdfType && !isTextType && selectedType !== 'ats-pdf'}
            showPageNumbers={showPageNumbers}
            showBranding={showBranding}
            onPageNumbersChange={setShowPageNumbers}
            onBrandingChange={setShowBranding}
          />

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
      </SheetContent>
    </Sheet>
  );
}

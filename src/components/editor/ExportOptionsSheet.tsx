import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Package, Check, Minimize2, FileType, AlertTriangle, Shield, Linkedin, AlignLeft, Link2, Copy, Mic, WifiOff } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExportType, CoverLetterContext } from '@/types/resume';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSettingsStore } from '@/store/settingsStore';
import { estimateOnePageScale } from '@/lib/pdfUtils';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import type { ExportProgress } from '@/hooks/useExportProgress';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ExportOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCoverLetter: boolean;
  coverLetterContext?: CoverLetterContext | null;
  onExport: (type: ExportType, showPageNumbers: boolean, showBranding: boolean) => void;
  isExporting: boolean;
  templateElement?: HTMLElement | null;
  exportProgress?: ExportProgress;
  resumeName?: string;
  templateName?: string;
}

export function ExportOptionsSheet({
  open,
  onOpenChange,
  hasCoverLetter,
  coverLetterContext,
  onExport,
  isExporting,
  templateElement,
  exportProgress,
  resumeName,
  templateName,
}: ExportOptionsSheetProps) {
  const { pdfDefaults } = useSettingsStore();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  const [selectedType, setSelectedType] = useState<ExportType>('resume');
  const [showPageNumbers, setShowPageNumbers] = useState(pdfDefaults.showPageNumbers ?? true);
  const [showBranding, setShowBranding] = useState(pdfDefaults.showBranding ?? true);
  const [onePageScale, setOnePageScale] = useState<number | null>(null);

  // Sync with defaults when sheet opens & estimate scale
  useEffect(() => {
    if (open) {
      setShowPageNumbers(pdfDefaults.showPageNumbers ?? true);
      setShowBranding(pdfDefaults.showBranding ?? true);
      
      if (templateElement) {
        try {
          const scale = estimateOnePageScale(templateElement);
          setOnePageScale(scale);
        } catch {
          setOnePageScale(null);
        }
      }
    }
  }, [open, pdfDefaults, templateElement]);

  const exportOptions = [
    {
      id: 'resume' as ExportType,
      label: 'PDF (Design-Enhanced)',
      description: 'Full design with colors, icons & visual hierarchy',
      icon: FileText,
      available: true,
    },
    {
      id: 'ats-pdf' as ExportType,
      label: 'PDF (ATS-Optimized)',
      description: 'Black & white, simple fonts, machine-readable',
      icon: Shield,
      available: true,
      badge: 'ATS-Safe',
    },
    {
      id: 'docx' as ExportType,
      label: 'Word Document',
      description: 'ATS-friendly text-selectable DOCX',
      icon: FileType,
      available: true,
      badge: 'ATS-Friendly',
    },
    {
      id: 'one-page' as ExportType,
      label: 'One-Page Resume',
      description: 'Scale entire resume to fit one page',
      icon: Minimize2,
      available: true,
    },
    {
      id: 'linkedin' as ExportType,
      label: 'LinkedIn Format',
      description: 'Copy-paste ready sections for LinkedIn',
      icon: Linkedin,
      available: true,
    },
    {
      id: 'plain-text' as ExportType,
      label: 'Plain Text (.txt)',
      description: 'Pure text, email-friendly, ATS-safe',
      icon: AlignLeft,
      available: true,
    },
    {
      id: 'share-link' as ExportType,
      label: 'Shareable Web Link',
      description: 'Generate a public link to your resume',
      icon: Link2,
      available: true,
    },
    {
      id: 'interview-prep' as ExportType,
      label: 'Interview Prep',
      description: 'Practice answering questions about this resume',
      icon: Mic,
      available: true,
    },
    {
      id: 'cover-letter' as ExportType,
      label: 'Cover Letter Only',
      description: hasCoverLetter 
        ? `For ${coverLetterContext?.title || 'position'} at ${coverLetterContext?.company || 'company'}`
        : 'Generate a cover letter first',
      icon: FileText,
      available: hasCoverLetter,
    },
    {
      id: 'combined' as ExportType,
      label: 'Application Package',
      description: hasCoverLetter 
        ? 'Cover letter + Resume in one PDF'
        : 'Generate a cover letter first',
      icon: Package,
      available: hasCoverLetter,
    },
  ];

  const handleExport = () => {
    if (selectedType === 'interview-prep') {
      onOpenChange(false);
      navigate('/interview');
      return;
    }
    onExport(selectedType, showPageNumbers, showBranding);
  };

  const isPdfType = ['resume', 'ats-pdf', 'one-page', 'cover-letter', 'combined'].includes(selectedType);
  const isTextType = ['linkedin', 'plain-text', 'share-link'].includes(selectedType);

  const isInterviewPrep = selectedType === 'interview-prep';

  const getButtonLabel = () => {
    if (selectedType === 'interview-prep') return 'Start Practice';
    if (selectedType === 'docx') return 'Download DOCX';
    if (selectedType === 'combined') return 'Download Package';
    if (selectedType === 'linkedin') return 'Copy LinkedIn Text';
    if (selectedType === 'plain-text') return 'Download .txt';
    if (selectedType === 'share-link') return 'Copy Share Link';
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
          {/* Export type selection */}
          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            {exportOptions.map((option) => (
              <motion.button
                key={option.id}
                onClick={() => { if (option.available) { haptics.light(); setSelectedType(option.id); } }}
                disabled={!option.available}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all',
                  selectedType === option.id && option.available
                    ? 'border-primary bg-primary/5'
                    : option.available
                      ? 'border-border hover:border-primary/50'
                      : 'border-border opacity-50 cursor-not-allowed'
                )}
                whileTap={option.available ? { scale: 0.98 } : {}}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    selectedType === option.id && option.available
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{option.label}</span>
                      {selectedType === option.id && option.available && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                      {'badge' in option && option.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-600 dark:text-green-400">
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                    {option.id === 'one-page' && onePageScale !== null && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-1 text-[10px] px-1.5 py-0',
                          onePageScale >= 100
                            ? 'border-green-500/50 text-green-600 dark:text-green-400'
                            : onePageScale >= 70
                              ? 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                              : 'border-destructive/50 text-destructive'
                        )}
                      >
                        {onePageScale >= 100 ? 'No scaling needed' : `${onePageScale}% scale`}
                      </Badge>
                    )}
                    {option.id === 'one-page' && onePageScale !== null && onePageScale < 50 && (
                      <Alert variant="destructive" className="mt-2 py-2 px-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Text may be too small to read comfortably at this scale. Consider using the AI One-Page Wizard to condense content first.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Footer options - always rendered for stable layout, hidden via opacity when not relevant */}
          <div
            className={cn(
              'space-y-3 shrink-0 transition-opacity duration-150',
              isPdfType && !isTextType && selectedType !== 'ats-pdf'
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none h-0 overflow-hidden'
            )}
          >
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="page-numbers" className="font-medium">
                    Page Numbers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show "Page X of Y" in footer
                  </p>
                </div>
                <Switch
                  id="page-numbers"
                  checked={showPageNumbers}
                  onCheckedChange={setShowPageNumbers}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="branding" className="font-medium flex items-center gap-1.5">
                    <span className="text-primary">✦</span>
                    WiseResume Badge
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Professional prestige stamp
                  </p>
                </div>
                <Switch
                  id="branding"
                  checked={showBranding}
                  onCheckedChange={setShowBranding}
                />
              </div>
          </div>

          {/* Progress indicator */}
          {exportProgress?.isActive && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{exportProgress.message}</span>
                <span className="font-medium">{Math.round(exportProgress.progress)}%</span>
              </div>
              <Progress value={exportProgress.progress} className="h-2" />
            </div>
          )}

          {/* Offline warning for network-required exports */}
          {!isOnline && (selectedType === 'combined' || selectedType === 'cover-letter') && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You're offline. This export requires an internet connection. PDF and DOCX exports still work offline.
              </AlertDescription>
            </Alert>
          )}

          {/* Export button */}
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary"
            onClick={handleExport}
            disabled={isExporting || (!isPdfType && !isTextType && selectedType !== 'docx' && selectedType !== 'interview-prep' && !hasCoverLetter)}
            style={{
              boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
            }}
          >
            {isExporting ? (
              <>
                <MiniSpinner size={20} className="mr-2" />
                {exportProgress?.isActive ? exportProgress.message : 'Generating...'}
              </>
            ) : (
              <>
                {isInterviewPrep ? <Mic className="w-5 h-5 mr-2" /> : isTextType ? <Copy className="w-5 h-5 mr-2" /> : <Download className="w-5 h-5 mr-2" />}
                {getButtonLabel()}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

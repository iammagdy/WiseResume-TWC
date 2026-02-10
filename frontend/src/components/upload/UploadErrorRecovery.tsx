import { motion } from 'framer-motion';
import { FileWarning, ScanText, PenLine, Upload, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

export type UploadErrorType = 
  | 'NO_TEXT' 
  | 'CORRUPTED' 
  | 'PASSWORD_PROTECTED' 
  | 'PARTIAL_EXTRACTION'
  | 'UNKNOWN';

interface ExtractedSections {
  contact?: boolean;
  summary?: boolean;
  experience?: number;
  education?: number;
  skills?: number;
}

interface UploadErrorRecoveryProps {
  errorType: UploadErrorType;
  extractedSections?: ExtractedSections;
  onTryOCR?: () => void;
  onStartFresh: () => void;
  onTryDifferentFile: () => void;
  onContinuePartial?: () => void;
  onAIFillGaps?: () => void;
  hasOCROption?: boolean;
}

export function UploadErrorRecovery({
  errorType,
  extractedSections,
  onTryOCR,
  onStartFresh,
  onTryDifferentFile,
  onContinuePartial,
  onAIFillGaps,
  hasOCROption = true,
}: UploadErrorRecoveryProps) {
  const [showHelp, setShowHelp] = useState(false);

  const getErrorContent = () => {
    switch (errorType) {
      case 'NO_TEXT':
        return {
          icon: <FileWarning className="w-8 h-8 text-secondary" />,
          title: "We had trouble reading this PDF",
          description: "This PDF appears to be scanned or image-based. Don't worry—we have options!",
        };
      case 'CORRUPTED':
        return {
          icon: <FileWarning className="w-8 h-8 text-destructive" />,
          title: "This PDF seems damaged",
          description: "We couldn't open this file properly. It may be corrupted or in an unsupported format.",
        };
      case 'PASSWORD_PROTECTED':
        return {
          icon: <FileWarning className="w-8 h-8 text-warning" />,
          title: "This PDF is protected",
          description: "Please upload an unprotected version of your resume.",
        };
      case 'PARTIAL_EXTRACTION':
        return {
          icon: <FileWarning className="w-8 h-8 text-warning" />,
          title: "We found most of your resume!",
          description: "Some sections were extracted, but a few need attention.",
        };
      default:
        return {
          icon: <FileWarning className="w-8 h-8 text-muted-foreground" />,
          title: "Something went wrong",
          description: "We couldn't process this PDF. Please try a different file.",
        };
    }
  };

  const { icon, title, description } = getErrorContent();

  const handleAction = (action: () => void) => {
    haptics.light();
    action();
  };

  return (
    <motion.div
      className="flex flex-col items-center text-center p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Icon */}
      <motion.div
        className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
      >
        {icon}
      </motion.div>

      {/* Title & Description */}
      <h2 className="text-xl font-display font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-[280px]">
        {description}
      </p>

      {/* Partial Extraction Summary */}
      {errorType === 'PARTIAL_EXTRACTION' && extractedSections && (
        <motion.div
          className="w-full p-4 rounded-xl bg-muted/50 border border-border mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-sm font-medium mb-3 text-left">What we found:</p>
          <div className="space-y-2 text-left">
            <SectionStatus label="Contact info" found={extractedSections.contact} />
            <SectionStatus label="Summary" found={extractedSections.summary} />
            <SectionStatus 
              label="Work experience" 
              found={(extractedSections.experience ?? 0) > 0}
              count={extractedSections.experience}
            />
            <SectionStatus 
              label="Education" 
              found={(extractedSections.education ?? 0) > 0}
              count={extractedSections.education}
            />
            <SectionStatus 
              label="Skills" 
              found={(extractedSections.skills ?? 0) > 0}
              count={extractedSections.skills}
            />
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        {/* OCR Option - Primary for NO_TEXT errors */}
        {hasOCROption && onTryOCR && errorType === 'NO_TEXT' && (
          <Button
            variant="default"
            size="lg"
            className="w-full h-14 gap-3 gradient-primary"
            onClick={() => handleAction(onTryOCR)}
            style={{
              boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
            }}
          >
            <ScanText className="w-5 h-5" />
            Try OCR Scanning
          </Button>
        )}

        {/* Partial: Continue with what we have */}
        {errorType === 'PARTIAL_EXTRACTION' && onContinuePartial && (
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 gap-3"
            onClick={() => handleAction(onContinuePartial)}
          >
            <RefreshCw className="w-5 h-5" />
            Continue & Add Missing Later
          </Button>
        )}

        {/* Partial: Let AI fill gaps - Recommended */}
        {errorType === 'PARTIAL_EXTRACTION' && onAIFillGaps && (
          <Button
            variant="default"
            size="lg"
            className="w-full h-14 gap-3 gradient-primary"
            onClick={() => handleAction(onAIFillGaps)}
            style={{
              boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
            }}
          >
            <ScanText className="w-5 h-5" />
            Let AI Help Fill Gaps
            <span className="text-xs opacity-80 ml-1">Recommended</span>
          </Button>
        )}

        {/* Start Fresh */}
        <Button
          variant={errorType === 'PARTIAL_EXTRACTION' ? 'ghost' : 'outline'}
          size="lg"
          className="w-full h-14 gap-3"
          onClick={() => handleAction(onStartFresh)}
        >
          <PenLine className="w-5 h-5" />
          Start Fresh Instead
        </Button>

        {/* Try Different File */}
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-14 gap-3 text-muted-foreground"
          onClick={() => handleAction(onTryDifferentFile)}
        >
          <Upload className="w-5 h-5" />
          Try Different PDF
        </Button>
      </div>

      {/* Help Collapsible */}
      {errorType === 'NO_TEXT' && (
        <Collapsible open={showHelp} onOpenChange={setShowHelp} className="w-full mt-6">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto">
            <HelpCircle className="w-4 h-4" />
            Why did this happen?
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="p-4 rounded-xl bg-muted/30 border border-border text-left text-sm text-muted-foreground space-y-2">
              <p>PDFs can contain text in two ways:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Text-based:</strong> The text is embedded and searchable. These work best!</li>
                <li><strong>Scanned/Image:</strong> The text is actually an image. We need OCR to read it.</li>
              </ul>
              <p className="pt-2">
                If you have the original document (Word, Google Docs), try exporting it as a PDF again for best results.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </motion.div>
  );
}

function SectionStatus({ 
  label, 
  found, 
  count 
}: { 
  label: string; 
  found?: boolean; 
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={found ? 'text-success' : 'text-muted-foreground'}>
        {found ? '✓' : '✗'}
      </span>
      <span className={found ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
        {count !== undefined && count > 0 && (
          <span className="text-muted-foreground ml-1">({count} found)</span>
        )}
      </span>
    </div>
  );
}

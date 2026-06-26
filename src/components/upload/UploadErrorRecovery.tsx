import { motion } from 'framer-motion';
import { FileWarning, ScanText, PenLine, Upload, RefreshCw, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export type UploadErrorType =
  | 'NO_TEXT'
  | 'CORRUPTED'
  | 'PASSWORD_PROTECTED'
  | 'PARTIAL_EXTRACTION'
  | 'AI_UNREACHABLE'
  | 'PARSER_ASSETS_MISSING'
  | 'PARSER_RUNTIME_FAILED'
  | 'IOS_BROWSER_INCOMPATIBLE'
  | 'OCR_ENGINE_FAILED'
  | 'UNKNOWN';

export function getUploadErrorCopy(errorType: UploadErrorType): {
  title: string;
  description: string;
  compactDescription: string;
} {
  switch (errorType) {
    case 'NO_TEXT':
      return {
        title: 'We had trouble reading this file',
        description:
          'This file appears to be scanned, image-based, or too sparse to read cleanly. Try OCR, a Word file, or a clearer export.',
        compactDescription: 'No readable text found. Try a Word file, a text-based PDF, or a clearer scan.',
      };
    case 'CORRUPTED':
      return {
        title: 'This file seems damaged',
        description: "We couldn't open this file properly. It may be corrupted or in an unsupported format.",
        compactDescription: 'This file looks damaged or unsupported. Try a different export.',
      };
    case 'PASSWORD_PROTECTED':
      return {
        title: 'This PDF is protected',
        description: 'Please upload an unprotected version of your resume.',
        compactDescription: 'This PDF is password-protected. Remove the password first.',
      };
    case 'PARTIAL_EXTRACTION':
      return {
        title: 'We found most of your resume',
        description: 'Some sections were extracted, but a few need attention.',
        compactDescription: 'Part of the resume was extracted, but some sections still need review.',
      };
    case 'AI_UNREACHABLE':
      return {
        title: "Couldn't reach the AI parser",
        description: 'There was a temporary parser outage. Your file may still be fine, so retry in a moment.',
        compactDescription: 'The AI parser is temporarily unavailable. Please try again in a moment.',
      };
    case 'PARSER_ASSETS_MISSING':
      return {
        title: "Upload tools aren't ready on this environment",
        description:
          'This device or environment is missing the local PDF/OCR assets needed for CV parsing. Refresh setup, then try again.',
        compactDescription: 'This environment is missing local upload assets. Refresh setup and try again.',
      };
    case 'PARSER_RUNTIME_FAILED':
      return {
        title: "This browser couldn't start the PDF reader",
        description:
          'Your file may be fine, but this browser environment failed to start the PDF parsing worker. Refresh and try again, or switch browsers if it keeps happening.',
        compactDescription: "This browser couldn't start the PDF reader. Refresh and try again.",
      };
    case 'IOS_BROWSER_INCOMPATIBLE':
      return {
        title: "iPhone couldn't read this PDF",
        description:
          'Your file may be fine, but iPhone Safari struggles with some PDF fonts. Try a desktop browser, or convert your CV to a Word (.docx) or JSON file first.',
        compactDescription: "This PDF format isn't supported well on iPhone Safari. Try desktop or Word.",
      };
    case 'OCR_ENGINE_FAILED':
      return {
        title: "Text scanning isn't supported on this browser",
        description:
          "We couldn't start the OCR engine in this browser. Try uploading from a desktop browser, or upload a Word (.docx) or JSON file instead.",
        compactDescription: 'Text scanning failed on this browser. Try desktop or a Word file.',
      };
    default:
      return {
        title: "We couldn't read this file on this device",
        description:
          'The file might be unsupported, the parser may have returned unusable data, or this browser may not handle the document cleanly. Try a different export or the full upload page.',
        compactDescription: 'We could not read this file on this device. Try a different export or the full upload page.',
      };
  }
}

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
  onStartBlankResume?: () => void;
  onTryDifferentFile: () => void;
  onContinuePartial?: () => void;
  onAIFillGaps?: () => void;
  hasOCROption?: boolean;
}

function getIconTone(errorType: UploadErrorType): string {
  if (errorType === 'NO_TEXT') return 'text-secondary';
  if (
    errorType === 'PASSWORD_PROTECTED' ||
    errorType === 'PARTIAL_EXTRACTION' ||
    errorType === 'AI_UNREACHABLE' ||
    errorType === 'IOS_BROWSER_INCOMPATIBLE'
  ) {
    return 'text-warning';
  }
  return 'text-destructive';
}

export function UploadErrorRecovery({
  errorType,
  extractedSections,
  onTryOCR,
  onStartFresh,
  onStartBlankResume,
  onTryDifferentFile,
  onContinuePartial,
  onAIFillGaps,
  hasOCROption = true,
}: UploadErrorRecoveryProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { title, description } = getUploadErrorCopy(errorType);
  const icon = <FileWarning className={`w-8 h-8 ${getIconTone(errorType)}`} />;

  const handleAction = (action: () => void) => {
    haptics.light();
    action();
  };

  return (
    <motion.div
      className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border border-border shadow-soft w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        {icon}
      </motion.div>

      <h2 className="text-h3 text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-[280px]">
        {description}
      </p>

      {errorType === 'PARTIAL_EXTRACTION' && extractedSections && (
        <motion.div
          className="w-full p-4 rounded-xl bg-muted border border-border mb-6"
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

      <div className="w-full space-y-3">
        {hasOCROption && onTryOCR && errorType === 'NO_TEXT' && (
          <Button
            size="lg"
            className="w-full min-h-[48px] gap-3 font-semibold"
            onClick={() => handleAction(onTryOCR)}
          >
            <ScanText className="w-5 h-5" />
            Try OCR Scanning
          </Button>
        )}

        {errorType === 'PARTIAL_EXTRACTION' && onContinuePartial && (
          <Button
            variant="outline"
            size="lg"
            className="w-full min-h-[48px] gap-3"
            onClick={() => handleAction(onContinuePartial)}
          >
            <RefreshCw className="w-5 h-5" />
            Continue & Add Missing Later
          </Button>
        )}

        {errorType === 'PARTIAL_EXTRACTION' && onAIFillGaps && (
          <Button
            size="lg"
            className="w-full min-h-[48px] gap-3 font-semibold"
            onClick={() => handleAction(onAIFillGaps)}
          >
            <ScanText className="w-5 h-5" />
            Let AI Help Fill Gaps
            <span className="text-xs opacity-80 ml-1">Recommended</span>
          </Button>
        )}

        {onStartBlankResume && (
          <Button
            variant="outline"
            size="lg"
            className="w-full min-h-[48px] gap-3"
            onClick={() => handleAction(onStartBlankResume)}
          >
            <PenLine className="w-5 h-5" />
            Start with blank resume
          </Button>
        )}

        {!onStartBlankResume && (
          <Button
            variant={errorType === 'PARTIAL_EXTRACTION' ? 'ghost' : 'outline'}
            size="lg"
            className="w-full min-h-[48px] gap-3"
            onClick={() => handleAction(onStartFresh)}
          >
            <PenLine className="w-5 h-5" />
            Start Fresh Instead
          </Button>
        )}

        <Button
          variant="ghost"
          size="lg"
          className="w-full min-h-[48px] gap-3 text-muted-foreground"
          onClick={() => handleAction(onTryDifferentFile)}
        >
          <Upload className="w-5 h-5" />
          Try Different PDF
        </Button>
      </div>

      {errorType === 'NO_TEXT' && (
        <Collapsible open={showHelp} onOpenChange={setShowHelp} className="w-full mt-6">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto">
            <HelpCircle className="w-4 h-4" />
            Why did this happen?
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="p-4 rounded-xl bg-muted border border-border text-left text-sm text-muted-foreground space-y-2">
              <p>PDFs can contain text in two ways:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Text-based:</strong> The text is embedded and searchable. These work best.</li>
                <li><strong>Scanned/Image:</strong> The text is actually an image. We need OCR to read it.</li>
              </ul>
              <p className="pt-2">
                If you have the original document, exporting it again from Word or Google Docs usually gives the cleanest result.
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
  count,
}: {
  label: string;
  found?: boolean;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={found ? 'text-success' : 'text-muted-foreground'}>
        {found ? '✓' : '✕'}
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

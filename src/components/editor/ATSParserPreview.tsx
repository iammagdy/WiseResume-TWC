import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, FileText, X, ScanSearch } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { useResumeStore } from '@/store/resumeStore';
import { useShallow } from 'zustand/react/shallow';
import { simulateATSParsing, type ATSParsedSection } from '@/lib/atsParserSimulation';
import { runATSValidation, type ATSCheckResult } from '@/lib/atsValidationChecks';
import { cn } from '@/lib/utils';

interface ATSParserPreviewProps {
  onClose?: () => void;
  className?: string;
}

function SectionStatusIcon({ status }: { status: ATSParsedSection['status'] }) {
  if (status === 'detected') return <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />;
  if (status === 'partial') return <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />;
  return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
}

function CheckStatusIcon({ status }: { status: ATSCheckResult['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="w-3 h-3 text-success shrink-0" />;
  if (status === 'fail') return <XCircle className="w-3 h-3 text-destructive shrink-0" />;
  return <AlertTriangle className="w-3 h-3 text-warning shrink-0" />;
}

function ParsedSectionBlock({ section, index }: { section: ATSParsedSection; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.2 }}
      className="mb-4"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <SectionStatusIcon status={section.status} />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          [{section.name}]
        </span>
        <span className="text-[10px] text-muted-foreground/70 ml-auto">
          {section.wordCount}w
        </span>
      </div>

      {/* Parsed content */}
      {section.lines.length > 0 ? (
        <div className="ml-5 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {section.lines.map((line, i) => (
            <div key={i} className={cn(line === '' && 'h-2')}>
              {line}
            </div>
          ))}
        </div>
      ) : (
        <div className="ml-5 font-mono text-xs text-destructive/70 italic">
          — Section empty or not detected —
        </div>
      )}

      {/* Issues */}
      {section.issues.length > 0 && (
        <div className="ml-5 mt-1.5 space-y-0.5">
          {section.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-warning">
              <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export const ATSParserPreview = memo(function ATSParserPreview({ onClose, className }: ATSParserPreviewProps) {
  const currentResume = useResumeStore(useShallow(s => s.currentResume));

  const parsed = useMemo(
    () => currentResume ? simulateATSParsing(currentResume) : null,
    [currentResume]
  );

  const checks = useMemo(
    () => currentResume ? runATSValidation(currentResume) : [],
    [currentResume]
  );

  if (!currentResume || !parsed) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground text-sm', className)}>
        No resume data
      </div>
    );
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const score = Math.round((passCount / checks.length) * 100);

  return (
    <div className={cn('flex flex-col h-full bg-muted/20', className)}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <ScanSearch className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-tight">ATS Parser View</h3>
          <p className="text-[10px] text-muted-foreground">How tracking systems read your resume</p>
        </div>
        <ScoreRing score={score} size={40} strokeWidth={3} />
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close ATS view"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="shrink-0 flex items-center gap-4 px-4 py-2 border-b border-border/50 text-[10px] text-muted-foreground">
        <span><FileText className="w-3 h-3 inline mr-1" />{parsed.totalWords} words</span>
        <span>{parsed.sections.length} sections</span>
        <span>{parsed.detectedKeywords.length} keywords</span>
      </div>

      {/* Parsed content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-3">
          {parsed.sections.map((section, i) => (
            <ParsedSectionBlock key={section.id} section={section} index={i} />
          ))}

          {/* Global issues */}
          {parsed.issues.length > 0 && (
            <div className="mt-2 mb-4 p-2 rounded-lg bg-warning/10 border border-warning/20">
              {parsed.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-warning">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}

          {/* ATS Checks */}
          <div className="border-t border-border pt-3 mt-2">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              ATS Compatibility Checks
            </h4>
            <div className="space-y-1">
              {checks.map((check) => (
                <div key={check.id} className="flex items-center gap-2 py-0.5">
                  <CheckStatusIcon status={check.status} />
                  <span className="text-[11px] text-foreground/80">{check.label}</span>
                  <span className={cn(
                    'text-[9px] ml-auto uppercase font-medium',
                    check.status === 'pass' ? 'text-success' : check.status === 'fail' ? 'text-destructive' : 'text-warning'
                  )}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom padding for mobile safe area */}
          <div className="h-6" />
        </div>
      </ScrollArea>
    </div>
  );
});

export default ATSParserPreview;

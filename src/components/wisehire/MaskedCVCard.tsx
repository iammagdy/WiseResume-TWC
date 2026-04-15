import { useState } from 'react';
import { Download, ChevronDown, ChevronUp, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MaskResult } from '@/hooks/wisehire/useMaskCVs';

interface MaskedCVCardProps {
  result: MaskResult;
}

const FIELD_COLOURS: Record<string, string> = {
  NAME: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EMAIL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  PHONE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ADDRESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'DATE OF BIRTH': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  NATIONALITY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  GENDER: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'PROFILE LINK': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PHOTO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function highlightRedactions(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (/^\[.+\]$/.test(part)) {
      return (
        <mark
          key={i}
          className="bg-yellow-200 dark:bg-yellow-800/50 text-yellow-900 dark:text-yellow-200 rounded px-0.5 font-mono text-xs font-semibold not-italic"
        >
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MaskedCVCard({ result }: MaskedCVCardProps) {
  const [expanded, setExpanded] = useState(false);

  function handleDownload() {
    const blob = new Blob([result.maskedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.label.replace(' ', '_')}_masked.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold text-sm">
            {result.label.split(' ')[1] ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">{result.label}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <FileText className="h-3 w-3 shrink-0" />
              {result.filename}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 shrink-0">
          <Download className="h-3.5 w-3.5" />
          Download .txt
        </Button>
      </div>

      {/* Redacted fields */}
      {result.redactedFields.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            Redacted:
          </span>
          {result.redactedFields.map((field) => (
            <Badge
              key={field}
              variant="secondary"
              className={cn('text-[11px] px-1.5 py-0.5 font-medium', FIELD_COLOURS[field] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}
            >
              {field}
            </Badge>
          ))}
        </div>
      )}

      {result.redactedFields.length === 0 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-muted-foreground italic">No PII detected in this document.</p>
        </div>
      )}

      {/* Preview toggle */}
      <div className="border-t">
        <button
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded((o) => !o)}
        >
          <span>Preview masked text</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="px-5 pb-5">
            <div className="max-h-72 overflow-y-auto rounded-lg bg-muted/40 dark:bg-slate-800/50 p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono border">
              {highlightRedactions(result.maskedText)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

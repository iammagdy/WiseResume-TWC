import { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateLatex } from '@/lib/latexGenerator';
import type { ResumeData } from '@/types/resume';

interface LaTeXPreviewPanelProps {
  resumeData: ResumeData;
}

export function LaTeXPreviewPanel({ resumeData }: LaTeXPreviewPanelProps) {
  const [copied, setCopied] = useState(false);

  const latexContent = useMemo(() => generateLatex(resumeData), [resumeData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(latexContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = latexContent;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          LaTeX Preview
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>
      <div className="relative rounded-xl bg-muted border border-border overflow-hidden">
        <pre className="overflow-auto max-h-52 p-3 text-xs leading-relaxed font-mono text-foreground/80 whitespace-pre">
          <code>{latexContent}</code>
        </pre>
      </div>
    </div>
  );
}

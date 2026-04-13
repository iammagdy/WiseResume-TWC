import React, { useState } from 'react';
import { Copy, Check, Play, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type TestDef, type TestResult } from './types';
import { StatusBadge } from './DevKitBadges';

interface TestItemProps {
  test: TestDef;
  result: TestResult;
  isExpanded: boolean;
  onRun: () => void;
  onToggleExpand: () => void;
}

export function TestItem({ test, result, isExpanded, onRun, onToggleExpand }: TestItemProps) {
  const [copied, setCopied] = useState(false);
  const resultText = result.data ? JSON.stringify(result.data, null, 2) : result.error || '';

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card dark:bg-card backdrop-blur-sm p-4 space-y-3 transition-all hover:bg-card/100 dark:hover:bg-card shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-foreground">{test.label}</span>
            <StatusBadge status={result.status} />
            {result.httpStatus && <span className="text-xs text-muted-foreground font-mono">HTTP {result.httpStatus}</span>}
            {result.durationMs != null && <span className="text-xs text-muted-foreground">{result.durationMs}ms</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{test.description}</p>
        </div>
        <Button 
          size="sm" 
          variant="secondary" 
          disabled={result.status === 'running'} 
          onClick={onRun}
          className="shadow-sm active:scale-95 transition-transform"
        >
          {result.status === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
          Run
        </Button>
      </div>

      {result.summary && result.status !== 'idle' && result.status !== 'running' && (
        <p className={`text-xs font-medium px-3 py-2 rounded-lg ${
          result.status === 'success'
            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
            : result.status === 'warn'
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          {result.summary}
        </p>
      )}

      {resultText && result.status !== 'running' && (
        <div className="pt-1">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            onClick={onToggleExpand}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {isExpanded ? 'Hide Raw Output' : 'View Raw JSON'}
          </button>
          
          {isExpanded && (
            <div className="relative group">
              <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all text-foreground border border-border font-mono">
                {resultText}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 backdrop-blur-sm"
                onClick={handleCopy}
                aria-label="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

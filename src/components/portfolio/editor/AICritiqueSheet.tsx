import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

export interface CritiqueItem {
  category: string;
  priority: 'high' | 'medium' | 'low';
  finding: string;
  suggestion: string;
}

interface AICritiqueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CritiqueItem[];
  loading: boolean;
  onRunCritique: () => void;
  hasRun: boolean;
  error?: boolean;
}

const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    icon: AlertCircle,
    className: 'text-red-500',
    badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20',
    borderClass: 'border-l-red-500',
  },
  medium: {
    label: 'Medium',
    icon: AlertTriangle,
    className: 'text-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    borderClass: 'border-l-amber-500',
  },
  low: {
    label: 'Low',
    icon: Info,
    className: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    borderClass: 'border-l-blue-500',
  },
};

function CritiqueCard({ item }: { item: CritiqueItem }) {
  const [expanded, setExpanded] = useState(true);
  const priority = item.priority in PRIORITY_CONFIG ? item.priority : 'low';
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border border-border border-l-4 ${config.borderClass} bg-card overflow-hidden`}>
      <button
        className="w-full flex items-start gap-3 p-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.className}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">{item.category}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${config.badgeClass}`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.finding}</p>
        </div>
        <span className="shrink-0 mt-0.5 text-muted-foreground">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0 ml-7">
          <p className="text-xs text-foreground leading-relaxed">{item.suggestion}</p>
        </div>
      )}
    </div>
  );
}

export function AICritiqueSheet({ open, onOpenChange, items, loading, onRunCritique, hasRun, error }: AICritiqueSheetProps) {
  const highCount = items.filter(i => i.priority === 'high').length;
  const medCount = items.filter(i => i.priority === 'medium').length;

  const sorted = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Portfolio Critique
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            An AI recruiter reviews your portfolio for gaps and improvements. Suggestions are advisory only.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4 min-h-0">
          {!hasRun && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Get recruiter-level feedback</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  AI analyzes your portfolio data and flags specific gaps a recruiter would notice.
                </p>
              </div>
              <Button onClick={onRunCritique} disabled={loading} className="mt-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Run Critique
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your portfolio…</p>
            </div>
          )}

          {hasRun && !loading && error && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm text-foreground font-medium">Critique failed</p>
                <p className="text-xs text-muted-foreground mt-1">Something went wrong. Check your AI key is configured, then try again.</p>
              </div>
              <Button variant="outline" size="sm" onClick={onRunCritique}>
                Try Again
              </Button>
            </div>
          )}

          {hasRun && !loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <p className="text-sm text-foreground font-medium">No issues found!</p>
              <p className="text-xs text-muted-foreground">Your portfolio looks solid. Run again after major updates.</p>
            </div>
          )}

          {hasRun && !loading && items.length > 0 && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">{items.length} items found</span>
                {highCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-medium">
                    {highCount} high priority
                  </span>
                )}
                {medCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
                    {medCount} medium
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {sorted.map((item, i) => (
                  <CritiqueCard key={i} item={item} />
                ))}
              </div>
            </>
          )}
        </div>

        {hasRun && !loading && (
          <div className="shrink-0 pt-4 border-t border-border">
            <Button variant="outline" onClick={onRunCritique} disabled={loading} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Run Again
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

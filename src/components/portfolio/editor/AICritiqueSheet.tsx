import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertCircle, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';

export interface CritiqueItem {
  type: 'suggestion' | 'warning' | 'success';
  section?: string;
  message: string;
}

interface AICritiqueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CritiqueItem[];
  loading: boolean;
  onRunCritique: () => void;
  hasRun: boolean;
  error?: string | null;
}

const TYPE_CONFIG = {
  suggestion: {
    icon: Sparkles,
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.07)',
    border: 'rgba(37,99,235,0.15)',
    label: 'Suggestion',
  },
  warning: {
    icon: AlertCircle,
    color: '#d97706',
    bg: 'rgba(217,119,6,0.07)',
    border: 'rgba(217,119,6,0.15)',
    label: 'Warning',
  },
  success: {
    icon: CheckCircle2,
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.07)',
    border: 'rgba(22,163,74,0.15)',
    label: 'Great',
  },
};

export function AICritiqueSheet({
  open,
  onOpenChange,
  items,
  loading,
  onRunCritique,
  hasRun,
  error,
}: AICritiqueSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" />
            AI Portfolio Critique
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Button
            onClick={onRunCritique}
            disabled={loading}
            className="w-full"
            variant={hasRun ? 'outline' : 'default'}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin mr-2" />
                Analyzing your portfolio…
              </>
            ) : hasRun ? (
              <>
                <RefreshCw size={15} className="mr-2" />
                Re-run Critique
              </>
            ) : (
              <>
                <Sparkles size={15} className="mr-2" />
                Run AI Critique
              </>
            )}
          </Button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!hasRun && !loading && !error && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Run the AI critique to get personalized suggestions for improving your portfolio.
            </p>
          )}

          {hasRun && !loading && items.length === 0 && !error && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 size={32} className="text-green-500" />
              <p className="font-semibold">Looking great!</p>
              <p className="text-sm text-muted-foreground">No major issues found in your portfolio.</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.suggestion;
                const Icon = cfg.icon;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Icon size={15} style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        {item.section && (
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color, marginBottom: 2 }}>
                            {item.section}
                          </p>
                        )}
                        <p className="text-sm">{item.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

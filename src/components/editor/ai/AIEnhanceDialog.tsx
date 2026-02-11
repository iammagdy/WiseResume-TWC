
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';

interface AIEnhanceDialogProps {
  isOpen: boolean;
  original: string;
  improved: string;
  changes: string[];
  suggestions?: string[];
  onApply: () => void;
  onDiscard: () => void;
  title?: string;
}

export function AIEnhanceDialog({
  isOpen,
  original,
  improved,
  changes,
  suggestions,
  onApply,
  onDiscard,
  title = 'AI Enhancement',
}: AIEnhanceDialogProps) {
  if (!isOpen) return null;

  return (
    <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200"
        onClick={onDiscard}
      >
        <div
          className="w-full max-w-lg max-h-[85vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <AIProviderVia className="mt-0.5" />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onDiscard} className="min-w-[44px] min-h-[44px]">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Original vs Improved */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Original</p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm line-through opacity-60">
                  {original || '(Empty)'}
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>

              <div>
                <p className="text-xs font-medium text-primary mb-2">Enhanced by AI</p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  {improved}
                </div>
              </div>
            </div>

            {/* Changes */}
            {changes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">What changed</p>
                <div className="flex flex-wrap gap-1.5">
                  {changes.map((change, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {change}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                <p className="text-xs font-medium text-secondary mb-2">💡 Additional suggestions</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {suggestions.map((suggestion, i) => (
                    <li key={i}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 flex flex-col sm:flex-row gap-3 p-4 pb-safe border-t border-border">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={onDiscard}
            >
              <X className="w-5 h-5 mr-2" />
              Discard
            </Button>
            <Button
              size="lg"
              className="flex-1 h-12 gradient-primary"
              onClick={onApply}
            >
              <Check className="w-5 h-5 mr-2" />
              Apply Changes
            </Button>
          </div>
        </div>
      </div>
  );
}

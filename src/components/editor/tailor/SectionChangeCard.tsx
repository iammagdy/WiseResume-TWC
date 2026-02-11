import { useState } from 'react';
import { ChevronDown, TrendingUp, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TailorSectionId } from '@/types/resume';
import { cn } from '@/lib/utils';

interface SectionChangeCardProps {
  sectionId: TailorSectionId;
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  impactScore: number;
  preview: React.ReactNode;
  changesSummary: string;
}

const SECTION_ICONS: Record<TailorSectionId, string> = {
  summary: '📝',
  skills: '💼',
  experience: '🏢',
  education: '🎓',
};

export function SectionChangeCard({
  sectionId,
  title,
  enabled,
  onToggle,
  impactScore,
  preview,
  changesSummary,
}: SectionChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const accentColor = enabled
    ? impactScore > 10 ? 'border-l-success' : impactScore > 5 ? 'border-l-amber-500' : 'border-l-primary'
    : 'border-l-muted-foreground/30';

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-l-4 transition-all duration-300 overflow-hidden animate-fade-in',
        accentColor,
        enabled
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-muted-foreground/30'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            id={sectionId}
            checked={enabled}
            onCheckedChange={onToggle}
            className="mt-1"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label
                htmlFor={sectionId}
                className="font-semibold text-sm cursor-pointer flex items-center gap-2"
              >
                <span>{SECTION_ICONS[sectionId]}</span>
                {title}
              </label>
              
              {/* Impact Score Badge */}
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 font-bold text-xs',
                  impactScore > 10
                    ? 'bg-success/10 text-success border-success/30'
                    : impactScore > 5
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                +{impactScore}pts
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">{changesSummary}</p>
          </div>
        </div>
      </div>

      {/* Preview Collapsible */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-2 border-t border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Eye className="w-3 h-3" />
            {isExpanded ? 'Hide' : 'Preview'} changes
            <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', isExpanded && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 border-t border-border/50 bg-muted/20 text-sm">
            {preview}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

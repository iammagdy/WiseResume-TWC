import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ExportType } from '@/types/resume';
import { ExportOptionCard, ExportOptionDef } from './ExportOptionCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ExportTypeListProps {
  primaryOptions: ExportOptionDef[];
  secondaryOptions: ExportOptionDef[];
  selectedType: ExportType;
  highlightedType: ExportType | null;
  onePageScale: number | null;
  onSelect: (id: ExportType) => void;
}

export function ExportTypeList({ primaryOptions, secondaryOptions, selectedType, highlightedType, onePageScale, onSelect }: ExportTypeListProps) {
  const [moreOpen, setMoreOpen] = useState(() => {
    // Auto-expand if the selected type is in secondary options
    return secondaryOptions.some(o => o.id === selectedType);
  });

  return (
    <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
      {/* Primary options — always visible */}
      <div className="space-y-2">
        {primaryOptions.map((option) => (
          <ExportOptionCard
            key={option.id}
            option={option}
            isSelected={selectedType === option.id}
            isHighlighted={highlightedType === option.id}
            onePageScale={onePageScale}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Secondary options — collapsible */}
      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', moreOpen && 'rotate-180')} />
          More formats
          <span className="text-xs text-muted-foreground/60">({secondaryOptions.length})</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-1">
          {secondaryOptions.map((option) => (
            <ExportOptionCard
              key={option.id}
              option={option}
              isSelected={selectedType === option.id}
              isHighlighted={highlightedType === option.id}
              onePageScale={onePageScale}
              onSelect={onSelect}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

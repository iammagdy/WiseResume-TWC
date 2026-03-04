import { ExportType } from '@/types/resume';
import { ExportOptionCard, ExportOptionDef } from './ExportOptionCard';

interface ExportGroup {
  label: string;
  options: ExportOptionDef[];
}

interface ExportTypeListProps {
  exportGroups: ExportGroup[];
  selectedType: ExportType;
  highlightedType: ExportType | null;
  onePageScale: number | null;
  onSelect: (id: ExportType) => void;
}

export function ExportTypeList({ exportGroups, selectedType, highlightedType, onePageScale, onSelect }: ExportTypeListProps) {
  return (
    <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
      {exportGroups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{group.label}</p>
          <div className="space-y-2">
            {group.options.map((option) => (
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
        </div>
      ))}
    </div>
  );
}

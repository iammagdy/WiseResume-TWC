import { useState, useCallback } from 'react';
import { ChevronDown, TrendingUp, Eye, Pencil, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { TailorSectionId } from '@/types/resume';
import { diffText, compareSkills, TextDiff } from '@/lib/diffUtils';
import { cn } from '@/lib/utils';

interface SectionChangeCardProps {
  sectionId: TailorSectionId;
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  impactScore: number;
  preview: React.ReactNode;
  changesSummary: string;
  originalText?: string;
  originalSkills?: string[];
  tailoredText?: string;
  tailoredSkills?: string[];
  onEdit?: (sectionId: TailorSectionId, newValue: string | string[]) => void;
}

const SECTION_ICONS: Record<TailorSectionId, string> = {
  summary: '📝',
  skills: '💼',
  experience: '🏢',
  education: '🎓',
  projects: '🚀',
  certifications: '🏅',
};

function InlineDiff({ diffs }: { diffs: TextDiff[] }) {
  return (
    <span>
      {diffs.map((d, i) => (
        <span
          key={i}
          className={cn(
            d.type === 'removed' && 'bg-destructive/15 text-destructive line-through',
            d.type === 'added' && 'bg-success/15 text-success',
          )}
        >
          {d.text}{' '}
        </span>
      ))}
    </span>
  );
}

function SkillsDiff({ original, tailored }: { original: string[]; tailored: string[] }) {
  const diff = compareSkills(original, tailored);
  return (
    <div className="flex flex-wrap gap-1.5">
      {diff.removed.map((s, i) => (
        <Badge key={`r-${i}`} variant="outline" className="text-xs bg-destructive/10 text-destructive line-through border-destructive/30">
          {s}
        </Badge>
      ))}
      {diff.unchanged.map((s, i) => (
        <Badge key={`u-${i}`} variant="secondary" className="text-xs">
          {s}
        </Badge>
      ))}
      {diff.added.map((s, i) => (
        <Badge key={`a-${i}`} variant="outline" className="text-xs bg-success/10 text-success border-success/30">
          + {s}
        </Badge>
      ))}
    </div>
  );
}

export function SectionChangeCard({
  sectionId,
  title,
  enabled,
  onToggle,
  impactScore,
  preview,
  changesSummary,
  originalText,
  originalSkills,
  tailoredText,
  tailoredSkills,
  onEdit,
}: SectionChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const accentColor = enabled
    ? impactScore > 10 ? 'border-l-success' : impactScore > 5 ? 'border-l-amber-500' : 'border-l-primary'
    : 'border-l-muted-foreground/30';

  const hasDiff = (originalText !== undefined && tailoredText !== undefined) ||
                  (originalSkills !== undefined && tailoredSkills !== undefined);

  const handleStartEdit = useCallback(() => {
    if (sectionId === 'skills' && tailoredSkills) {
      setEditValue(tailoredSkills.join(', '));
    } else if (tailoredText) {
      setEditValue(tailoredText);
    }
    setIsEditing(true);
  }, [sectionId, tailoredText, tailoredSkills]);

  const handleSaveEdit = useCallback(() => {
    if (!onEdit) return;
    if (sectionId === 'skills') {
      onEdit(sectionId, editValue.split(',').map(s => s.trim()).filter(Boolean));
    } else {
      onEdit(sectionId, editValue);
    }
    setIsEditing(false);
  }, [onEdit, sectionId, editValue]);

  const renderDiffPreview = () => {
    if (isEditing) {
      return (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder={sectionId === 'skills' ? 'Comma-separated skills...' : 'Edit text...'}
          />
          <button
            onClick={handleSaveEdit}
            className="flex items-center gap-1 text-xs text-success font-medium min-h-[44px] px-2 active:scale-95 transition-transform"
          >
            <Check className="w-3.5 h-3.5" />
            Done
          </button>
        </div>
      );
    }

    if (hasDiff) {
      if (originalSkills && tailoredSkills) {
        return <SkillsDiff original={originalSkills} tailored={tailoredSkills} />;
      }
      if (originalText !== undefined && tailoredText !== undefined) {
        const diffs = diffText(originalText, tailoredText);
        return (
          <p className="text-muted-foreground leading-relaxed text-sm">
            <InlineDiff diffs={diffs} />
          </p>
        );
      }
    }

    return preview;
  };

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
          <Checkbox
            id={sectionId}
            checked={enabled}
            onCheckedChange={onToggle}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label
                htmlFor={sectionId}
                className="font-semibold text-sm cursor-pointer flex items-center gap-2"
              >
                <span>{SECTION_ICONS[sectionId]}</span>
                {title}
              </label>
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

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-2 border-t border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Eye className="w-3 h-3" />
            {isExpanded ? 'Hide' : 'Preview'} changes
            <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', isExpanded && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 border-t border-border/50 bg-muted/20 text-sm relative">
            {onEdit && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                title="Edit before applying"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {renderDiffPreview()}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

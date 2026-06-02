import { useState, useCallback } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { ChevronDown, TrendingUp, Eye, Pencil, Check, X, RotateCcw, RefreshCw, Lightbulb } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TailorSectionId } from '@/types/resume';
import { BulletTransformation } from '@/types/resume';
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
  bulletTransformations?: BulletTransformation[];
  onBulletReject?: (rejectedKeys: Set<string>) => void;
  onRegenerate?: (sectionId: TailorSectionId, instruction?: string) => Promise<void>;
  defaultExpanded?: boolean;
}

const SECTION_ICONS: Record<TailorSectionId, string> = {
  summary: '📝',
  skills: '💼',
  experience: '🏢',
  education: '🎓',
  projects: '🚀',
  certifications: '🏅',
  awards: '🏆',
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
  bulletTransformations,
  onBulletReject,
  onRegenerate,
  defaultExpanded,
}: SectionChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [rejectedBullets, setRejectedBullets] = useState<Set<string>>(new Set());
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [regenPopoverOpen, setRegenPopoverOpen] = useState(false);

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate || isRegenerating) return;
    setIsRegenerating(true);
    setRegenPopoverOpen(false);
    setIsExpanded(true);
    try {
      await onRegenerate(sectionId, regenInstruction.trim() || undefined);
    } finally {
      setIsRegenerating(false);
    }
  }, [onRegenerate, sectionId, isRegenerating, regenInstruction]);

  const accentColor = enabled
    ? impactScore > 10 ? 'border-l-success' : impactScore > 5 ? 'border-l-warning' : 'border-l-primary'
    : 'border-l-muted-foreground/30';

  const hasDiff = (originalText !== undefined && tailoredText !== undefined) ||
                  (originalSkills !== undefined && tailoredSkills !== undefined);

  const hasBullets = bulletTransformations && bulletTransformations.length > 0;

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

  const toggleBulletRejection = useCallback((key: string) => {
    setRejectedBullets(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onBulletReject?.(next);
      return next;
    });
  }, [onBulletReject]);

  const handleAcceptAll = useCallback(() => {
    setRejectedBullets(new Set());
    onBulletReject?.(new Set());
  }, [onBulletReject]);

  const handleRejectAll = useCallback(() => {
    if (!bulletTransformations) return;
    const allKeys = new Set(bulletTransformations.map(bt => `${bt.experienceId}-${bt.bulletIndex}`));
    setRejectedBullets(allKeys);
    onBulletReject?.(allKeys);
  }, [bulletTransformations, onBulletReject]);

  const renderBulletTransformations = () => {
    if (!hasBullets) return null;

    const byExp: Record<string, BulletTransformation[]> = {};
    for (const bt of bulletTransformations!) {
      if (!byExp[bt.experienceId]) byExp[bt.experienceId] = [];
      byExp[bt.experienceId].push(bt);
    }

    return (
      <div className="space-y-3">
        {/* Accept All / Reject All controls */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {bulletTransformations!.length} bullet{bulletTransformations!.length !== 1 ? 's' : ''} changed
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAcceptAll}
              className="text-[11px] px-2 py-1 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors min-h-[32px]"
            >
              Accept all
            </button>
            <button
              onClick={handleRejectAll}
              className="text-[11px] px-2 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[32px]"
            >
              Reject all
            </button>
          </div>
        </div>

        {Object.entries(byExp).map(([expId, bullets]) => (
          <div key={expId} className="space-y-2">
            {bullets.map((bt) => {
              const key = `${bt.experienceId}-${bt.bulletIndex}`;
              const isRejected = rejectedBullets.has(key);
              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-lg border p-2.5 text-xs transition-all duration-200',
                    isRejected
                      ? 'border-destructive/30 bg-destructive/5 opacity-60'
                      : 'border-success/20 bg-success/5'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      {!isRejected ? (
                        <>
                          <p className="text-destructive line-through leading-relaxed opacity-70">
                            {bt.originalBullet}
                          </p>
                          <p className="text-success leading-relaxed font-medium">
                            {bt.enhancedBullet}
                          </p>
                          {bt.improvement && (
                            <div className="flex items-start gap-1.5 mt-1 px-2 py-1.5 rounded-md bg-warning/10 border border-warning/25">
                              <Lightbulb className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                              <p className="text-[11px] text-foreground/80 leading-snug">{bt.improvement}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground leading-relaxed">{bt.originalBullet}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleBulletRejection(key)}
                      className={cn(
                        'shrink-0 p-1.5 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors active:scale-95',
                        isRejected
                          ? 'bg-success/10 text-success hover:bg-success/20'
                          : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      )}
                      title={isRejected ? 'Accept this change' : 'Reject this change'}
                    >
                      {isRejected ? <RotateCcw className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {rejectedBullets.size > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {rejectedBullets.size} bullet{rejectedBullets.size > 1 ? 's' : ''} will keep original wording
          </p>
        )}
      </div>
    );
  };

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

    if (hasBullets) {
      return renderBulletTransformations();
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

  const acceptedCount = hasBullets ? (bulletTransformations!.length - rejectedBullets.size) : 0;

  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-l-4 transition-all duration-300 overflow-hidden animate-fade-in shadow-soft-sm',
        accentColor,
        enabled
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-card hover:border-primary/20'
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
              <div className="flex items-center gap-1.5 shrink-0">
                {onRegenerate && (
                  isRegenerating ? (
                    <button
                      disabled
                      className="p-1.5 rounded-md text-muted-foreground min-h-[32px] min-w-[32px] flex items-center justify-center opacity-50"
                    >
                      <MiniSpinner size={12} />
                    </button>
                  ) : (
                    <Popover open={regenPopoverOpen} onOpenChange={setRegenPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
                          title="Regenerate this section"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 space-y-3" align="end">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Regenerate {title}</p>
                          <p className="text-xs text-muted-foreground">Optionally add specific instructions for this section.</p>
                        </div>
                        <Textarea
                          value={regenInstruction}
                          onChange={(e) => setRegenInstruction(e.target.value)}
                          placeholder="e.g. Emphasize leadership experience..."
                          className="text-xs min-h-[72px] resize-none"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">Uses 1 credit</span>
                          <Button size="sm" className="h-7 text-xs" onClick={handleRegenerate}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )
                )}
                {hasBullets && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
                    {acceptedCount}/{bulletTransformations!.length} bullets
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    'font-bold text-xs',
                    impactScore > 10
                      ? 'bg-success/10 text-success border-success/30'
                      : impactScore > 5
                      ? 'bg-warning/10 text-warning border-warning/30'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{impactScore}pts
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{changesSummary}</p>
          </div>
        </div>
      </div>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full px-4 min-h-[44px] border-t border-border bg-muted hover:bg-muted transition-colors flex items-center justify-center gap-2 text-xs text-muted-foreground active:scale-[0.98]"
            aria-label={isExpanded ? `Hide ${title} changes` : `Preview ${title} changes`}
          >
            <Eye className="w-3 h-3" />
            {isExpanded ? 'Hide' : 'Preview'} changes
            {hasBullets && rejectedBullets.size > 0 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/30 ml-1">
                {rejectedBullets.size} rejected
              </Badge>
            )}
            <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', isExpanded && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-sm relative">
            {isRegenerating ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <MiniSpinner size={16} />
                <span className="text-xs">Regenerating with AI…</span>
              </div>
            ) : (
              <>
                {onEdit && !isEditing && !hasBullets && (
                  <button
                    onClick={handleStartEdit}
                    className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                    title="Edit before applying"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {renderDiffPreview()}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

import { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, ArrowRight, Merge, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatabaseResume } from '@/hooks/useResumes';
import { diffText, compareSkills, TextDiff, SkillDiff } from '@/lib/diffUtils';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface VersionCompareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterResume: DatabaseResume;
  tailoredVersions: DatabaseResume[];
}

function DiffDisplay({ diffs }: { diffs: TextDiff[] }) {
  return (
    <p className="text-sm leading-relaxed">
      {diffs.map((d, i) => (
        <span
          key={i}
          className={cn(
            d.type === 'added' && 'bg-success/20 text-success-foreground',
            d.type === 'removed' && 'bg-destructive/20 line-through text-muted-foreground',
          )}
        >
          {d.text}{' '}
        </span>
      ))}
    </p>
  );
}

function SkillsDiffDisplay({ diff }: { diff: SkillDiff }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {diff.unchanged.map((s) => (
        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
      ))}
      {diff.added.map((s) => (
        <Badge key={s} variant="outline" className="text-xs border-success/40 text-success bg-success/10">+ {s}</Badge>
      ))}
      {diff.removed.map((s) => (
        <Badge key={s} variant="outline" className="text-xs border-destructive/40 text-destructive bg-destructive/10 line-through">- {s}</Badge>
      ))}
    </div>
  );
}

function VersionColumn({ resume, label }: { resume: DatabaseResume; label: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-sm">{label}</h4>
        {resume.target_job_title && (
          <p className="text-xs text-muted-foreground truncate">
            🎯 {resume.target_company ? `${resume.target_company} — ` : ''}{resume.target_job_title}
          </p>
        )}
      </div>

      {/* Summary */}
      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-1">Summary</h5>
        <p className="text-sm">{resume.summary || 'No summary'}</p>
      </div>

      {/* Skills */}
      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-1">Skills</h5>
        <div className="flex flex-wrap gap-1">
          {(resume.skills || []).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-1">Experience</h5>
        {(resume.experience || []).map((exp) => (
          <div key={exp.id} className="mb-2">
            <p className="text-sm font-medium">{exp.position} @ {exp.company}</p>
            <p className="text-xs text-muted-foreground">{exp.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VersionCompareSheet({ open, onOpenChange, masterResume, tailoredVersions }: VersionCompareSheetProps) {
  const allVersions = useMemo(() => [masterResume, ...tailoredVersions], [masterResume, tailoredVersions]);
  const [leftId, setLeftId] = useState(allVersions[0]?.id || '');
  const [rightId, setRightId] = useState(allVersions[1]?.id || allVersions[0]?.id || '');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const leftResume = allVersions.find((r) => r.id === leftId) || allVersions[0];
  const rightResume = allVersions.find((r) => r.id === rightId) || allVersions[1] || allVersions[0];

  const summaryDiff = useMemo(
    () => diffText(leftResume?.summary || '', rightResume?.summary || ''),
    [leftResume?.summary, rightResume?.summary]
  );

  const skillsDiff = useMemo(
    () => compareSkills(leftResume?.skills || [], rightResume?.skills || []),
    [leftResume?.skills, rightResume?.skills]
  );

  const handleUseVersion = (resume: DatabaseResume) => {
    haptics.medium();
    onOpenChange(false);
    navigate(`/editor?id=${resume.id}`);
  };

  const versionLabel = (r: DatabaseResume) =>
    r.id === masterResume.id
      ? `Master: ${r.title}`
      : `${r.target_company || 'Tailored'}: ${r.title}`;

  // Desktop: side-by-side diff view
  const DiffView = () => (
    <div className="space-y-5">
      {/* Summary Diff */}
      <div>
        <h4 className="text-sm font-medium mb-2">Summary</h4>
        <DiffDisplay diffs={summaryDiff} />
      </div>

      {/* Skills Diff */}
      <div>
        <h4 className="text-sm font-medium mb-2">Skills</h4>
        <SkillsDiffDisplay diff={skillsDiff} />
      </div>

      {/* Experience comparison */}
      <div>
        <h4 className="text-sm font-medium mb-2">Experience</h4>
        {(rightResume?.experience || []).map((exp, i) => {
          const origExp = (leftResume?.experience || [])[i];
          if (!origExp) return null;
          const descDiff = diffText(origExp.description || '', exp.description || '');
          return (
            <div key={exp.id} className="mb-3 p-3 rounded-lg glass-surface">
              <p className="text-sm font-medium mb-1">{exp.position} @ {exp.company}</p>
              <DiffDisplay diffs={descDiff} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="w-5 h-5 text-primary" />
            Compare Versions
          </SheetTitle>
        </SheetHeader>

        {/* Version Selectors */}
        <div className={cn('gap-3 mb-4', isMobile ? 'space-y-2' : 'flex')}>
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Version 1" />
            </SelectTrigger>
            <SelectContent>
              {allVersions.map((r) => (
                <SelectItem key={r.id} value={r.id}>{versionLabel(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Version 2" />
            </SelectTrigger>
            <SelectContent>
              {allVersions.map((r) => (
                <SelectItem key={r.id} value={r.id}>{versionLabel(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isMobile ? (
          <Tabs defaultValue="diff" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="v1" className="flex-1">Version 1</TabsTrigger>
              <TabsTrigger value="v2" className="flex-1">Version 2</TabsTrigger>
              <TabsTrigger value="diff" className="flex-1">Diff</TabsTrigger>
            </TabsList>
            <TabsContent value="v1" className="mt-4">
              <VersionColumn resume={leftResume} label={versionLabel(leftResume)} />
            </TabsContent>
            <TabsContent value="v2" className="mt-4">
              <VersionColumn resume={rightResume} label={versionLabel(rightResume)} />
            </TabsContent>
            <TabsContent value="diff" className="mt-4">
              <DiffView />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <VersionColumn resume={leftResume} label={versionLabel(leftResume)} />
            <VersionColumn resume={rightResume} label={versionLabel(rightResume)} />
            <div className="col-span-2 border-t border-border pt-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-primary" />
                Changes
              </h3>
              <DiffView />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={cn('pt-4 mt-4 border-t border-border gap-2', isMobile ? 'space-y-2' : 'flex')}>
          <Button
            variant="outline"
            className="flex-1 min-h-[44px] active:scale-95 transition-transform"
            onClick={() => handleUseVersion(leftResume)}
          >
            <Check className="w-4 h-4 mr-2" />
            Use Version 1
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-h-[44px] active:scale-95 transition-transform"
            onClick={() => handleUseVersion(rightResume)}
          >
            <Check className="w-4 h-4 mr-2" />
            Use Version 2
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

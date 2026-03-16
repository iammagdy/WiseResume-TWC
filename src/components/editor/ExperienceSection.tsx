import { useState, memo, useCallback, useMemo, lazy, Suspense } from 'react';

import { Plus, Briefcase, Linkedin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { Experience } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';
import { ExperienceTimeline } from './ExperienceTimeline';
import { GapExplainerSheet } from './GapExplainerSheet';
import { GapFillerSheet } from './GapFillerSheet';
import { GapInfo } from '@/lib/dateUtils';
import { SectionEmptyState } from './SectionEmptyState';
import { experienceExample } from '@/lib/emptyStateExamples';
import { ExperienceItem } from './ExperienceItem';
const BoostAllExperienceSheet = lazy(() => import('./BoostAllExperienceSheet').then(m => ({ default: m.BoostAllExperienceSheet })));

export const ExperienceSection = memo(function ExperienceSection() {
  const experience = useResumeStore(state => state.currentResume?.experience);
  const summary = useResumeStore(state => state.currentResume?.summary);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enhancingExpId, setEnhancingExpId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [originalDescription, setOriginalDescription] = useState('');

  const [improvedEntry, setImprovedEntry] = useState<{
    description?: string;
    achievements?: string[];
    position?: string;
    company?: string;
  } | null>(null);

  const { enhance, isEnhancing, result, apply, discard } = useAIEnhance({
    section: 'experience',
    onApply: (content) => {
      if (enhancingExpId && improvedEntry) {
        updateExperience(enhancingExpId, {
          ...(improvedEntry.description && { description: improvedEntry.description }),
          ...(improvedEntry.achievements && { achievements: improvedEntry.achievements }),
          ...(improvedEntry.position && { position: improvedEntry.position }),
          ...(improvedEntry.company && { company: improvedEntry.company }),
        });
      }
      setShowDialog(false);
      setEnhancingExpId(null);
      setImprovedEntry(null);
    },
  });

  const { getNudgeForSection, getNudgesForExperience, dismissNudge } = useResumeNudges({
    resume: currentResume,
  });

  const [showTimeline, setShowTimeline] = useState(true);
  const [showGapSheet, setShowGapSheet] = useState(false);
  const [selectedGap, setSelectedGap] = useState<GapInfo | null>(null);
  const [showGapFiller, setShowGapFiller] = useState(false);
  const [selectedGapForFill, setSelectedGapForFill] = useState<GapInfo | null>(null);
  const [showBoostAll, setShowBoostAll] = useState(false);

  if (!currentResume || !experience) return null;

  const nudge = getNudgeForSection('experience');

  const addExperience = () => {
    const newExp: Experience = {
      id: uuidv4(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: [],
    };
    updateResume({
      experience: [...experience, newExp],
    });
    setExpandedId(newExp.id);
  };

  const updateExperience = useCallback((id: string, updates: Partial<Experience>) => {
    updateResume({
      experience: experience.map((exp) =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
    });
  }, [experience, updateResume]);

  const deleteExperience = useCallback((id: string) => {
    updateResume({
      experience: experience.filter((exp) => exp.id !== id),
    });
  }, [experience, updateResume]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const reordered = [...experience];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    updateResume({ experience: reordered });
  }, [experience, updateResume]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === experience.length - 1) return;
    const reordered = [...experience];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    updateResume({ experience: reordered });
  }, [experience, updateResume]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prevId) => (prevId === id ? null : id));
  }, []);

  const handleAIAction = useCallback(async (actionId: string, exp: Experience) => {
    setEnhancingExpId(exp.id);
    setOriginalDescription(exp.description);
    
    const enhanceResult = await enhance(
      actionId as ActionType,
      { description: exp.description, position: exp.position, company: exp.company, account: exp.account },
      currentResume
    );
    
    if (enhanceResult) {
      // The edge function returns improved as an array — extract the matching entry
      const improved = enhanceResult.improved;
      let entry: Record<string, unknown> | null = null;
      if (Array.isArray(improved)) {
        entry = improved.find((e: Record<string, unknown>) => e.id === exp.id) || improved[0] || null;
      } else if (improved && typeof improved === 'object') {
        entry = improved as Record<string, unknown>;
      }
      setImprovedEntry(entry as typeof improvedEntry);
      setShowDialog(true);
    }
  }, [enhance, currentResume]);

  const handleTimelineDismiss = useCallback(() => setShowTimeline(false), []);
  const handleTimelineExplainGap = useCallback((gap: GapInfo) => {
    setSelectedGap(gap);
    setShowGapSheet(true);
  }, []);
  const handleTimelineFillGap = useCallback((gap: GapInfo) => {
    setSelectedGapForFill(gap);
    setShowGapFiller(true);
  }, []);

  // Use a map of callbacks, or just rely on a new ExperienceItem component to keep it clean.
  // Actually, extracting to ExperienceItem is the cleanest approach.
  // We'll leave the InlineAIButton and AIContextualNudge callbacks as simple closures for now,
  // but wait! If we do that, we lose memoization.
  // We will create a stable callback that takes the experience ID and then calls the main function.
  // But wait! `handleAIAction` needs `exp`, not just `id`. We can find `exp` from `id`.

  const handleAIActionById = useCallback(async (actionId: string, expId: string) => {
    const exp = experience.find(e => e.id === expId);
    if (exp) {
      await handleAIAction(actionId, exp);
    }
  }, [experience, handleAIAction]);

  const handleNudgeActionById = useCallback((actionId: string, expId: string, trigger: string) => {
    handleAIActionById(actionId, expId);
    dismissNudge(trigger);
  }, [handleAIActionById, dismissNudge]);

  const handleNudgeDismissById = useCallback((trigger: string) => {
    dismissNudge(trigger);
  }, [dismissNudge]);

  const handleHeaderAction = async (actionId: string) => {
    if (experience.length > 0) {
      const firstExp = experience[0];
      await handleAIAction(actionId, firstExp);
    } else {
      addExperience();
    }
  };

  const handleNudgeAction = () => {
    if (nudge) {
      if (experience.length === 0) {
        addExperience();
      } else {
        const firstExp = experience[0];
        handleAIAction(nudge.action, firstExp);
      }
      dismissNudge(nudge.trigger);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {experience.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBoostAll(true)}
            className="gap-1.5 w-full sm:w-auto min-h-[56px] sm:min-h-0 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Sparkles className="w-4 h-4" />
            Boost All
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={addExperience} className="gap-2 w-full sm:w-auto min-h-[56px] sm:min-h-0">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Visual Timeline */}
      {showTimeline && experience.length >= 2 && (
        <ExperienceTimeline
          experiences={experience}
          onDismiss={handleTimelineDismiss}
          onExplainGap={handleTimelineExplainGap}
          onFillGap={handleTimelineFillGap}
        />
      )}

      {/* Contextual Nudge */}
      <AIContextualNudge
        show={!!nudge}
        message={nudge?.message || ''}
        actionLabel={nudge?.actionLabel || ''}
        onAction={handleNudgeAction}
        onDismiss={() => nudge && dismissNudge(nudge.trigger)}
      />

      {experience.length === 0 ? (
          <SectionEmptyState
            icon={Briefcase}
            title="Add your work experience"
            exampleContent={
              <div className="text-sm space-y-1">
                <p className="font-semibold">{experienceExample.position}</p>
                <p className="text-muted-foreground text-xs">{experienceExample.company} | {experienceExample.dateRange}</p>
                <ul className="mt-2 space-y-1">
                  {experienceExample.bullets.map((b, i) => (
                    <li key={i} className="text-muted-foreground text-xs">• {b}</li>
                  ))}
                </ul>
              </div>
            }
            actions={[
              { label: 'Add Your First Job', variant: 'outline', icon: Plus, onClick: addExperience },
              { label: 'Import from LinkedIn', variant: 'outline', icon: Linkedin, onClick: () => { /* navigating handled below */ } },
            ]}
          />
        ) : (
          <div className="space-y-3">
            {experience.map((exp, index) => (
              <ExperienceItem
                key={exp.id}
                exp={exp}
                index={index}
                totalLength={experience.length}
                isExpanded={expandedId === exp.id}
                isEnhancing={isEnhancing && enhancingExpId === exp.id}
                entryNudges={getNudgesForExperience(exp.id)}
                onToggleExpand={handleToggleExpand}
                onUpdate={updateExperience}
                onDelete={deleteExperience}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onAIAction={handleAIActionById}
                onDismissNudge={handleNudgeDismissById}
              />
            ))}
          </div>
        )}
      

      {/* AI Enhancement Dialog */}
      <AIEnhanceDialog
        isOpen={showDialog}
        original={originalDescription}
        improved={improvedEntry?.description || ''}
        changes={result?.changes || []}
        suggestions={result?.suggestions}
        onApply={() => {
          apply();
          setShowDialog(false);
        }}
        onDiscard={() => {
          discard();
          setShowDialog(false);
        }}
        title="Enhanced Experience"
      />

      {/* Gap Explainer Sheet */}
      <GapExplainerSheet
        isOpen={showGapSheet}
        onClose={() => {
          setShowGapSheet(false);
          setSelectedGap(null);
        }}
        gap={selectedGap}
        experiences={experience}
        onAddToSummary={(explanation) => {
          const currentSummary = summary || '';
          const newSummary = currentSummary 
            ? `${currentSummary}\n\nCareer Note: ${explanation}`
            : `Career Note: ${explanation}`;
          updateResume({ summary: newSummary });
        }}
      />

      {/* Gap Filler Sheet */}
      <GapFillerSheet
        isOpen={showGapFiller}
        onClose={() => {
          setShowGapFiller(false);
          setSelectedGapForFill(null);
        }}
        gap={selectedGapForFill}
        experiences={experience}
        onAddExperience={(newExp) => {
          // Insert at correct chronological position
          const newExpYear = parseInt(newExp.startDate.match(/\d{4}/)?.[0] || '0');
          const insertIndex = experience.findIndex((exp) => {
            const expYear = parseInt(exp.startDate.match(/\d{4}/)?.[0] || '9999');
            return expYear > newExpYear;
          });
          const updated = [...experience];
          if (insertIndex === -1) {
            updated.push(newExp);
          } else {
            updated.splice(insertIndex, 0, newExp);
          }
          updateResume({ experience: updated });
          setExpandedId(newExp.id);
        }}
      />

      {/* Boost All Sheet */}
      <Suspense fallback={null}>
        <BoostAllExperienceSheet open={showBoostAll} onOpenChange={setShowBoostAll} />
      </Suspense>
    </div>
  );
});

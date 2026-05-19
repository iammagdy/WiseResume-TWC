import { useState, memo, useCallback, lazy, Suspense } from 'react';

import { Plus, Briefcase, Linkedin, Sparkles, MoreHorizontal, Bot } from 'lucide-react';
import { useChatTriggerStore } from '@/store/chatTriggerStore';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { useExpandedEntryRestore } from '@/hooks/useExpandedEntryRestore';
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
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
const BoostAllExperienceSheet = lazy(() => import('./BoostAllExperienceSheet').then(m => ({ default: m.BoostAllExperienceSheet })));
const LinkedInOptimizerSheet = lazy(() => import('./ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));

export const ExperienceSection = memo(function ExperienceSection() {
  const experience = useResumeStore(state => state.currentResume?.experience);
  const summary = useResumeStore(state => state.currentResume?.summary);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const setPendingPrompt = useChatTriggerStore(s => s.setPendingPrompt);
  const [expandedId, setExpandedId] = useExpandedEntryRestore('experience');
  const [enhancingExpId, setEnhancingExpId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [originalDescription, setOriginalDescription] = useState('');
  const [showLinkedIn, setShowLinkedIn] = useState(false);

  const [improvedEntry, setImprovedEntry] = useState<{
    description?: string;
    achievements?: string[];
    position?: string;
    company?: string;
  } | null>(null);

  const { rescoreAfterApply } = useAIApplyEffects(currentResume?.id);

  const { enhance, isEnhancing, result, apply, discard } = useAIEnhance({
    section: 'experience',
    onApply: (content) => {
      // `content` is the user's edited text from the dialog (or the AI's
      // description if they didn't edit). Use it as the authoritative
      // description and merge with the AI's other field improvements
      // (achievements, position, company) when they are present and look
      // like the right shape — never blindly write `undefined` or a
      // non-array `achievements` into the store.
      if (!enhancingExpId) return;
      const editedDescription = typeof content === 'string' ? content : '';
      const updates: Partial<Experience> = {};
      if (editedDescription.trim() !== '') {
        updates.description = editedDescription;
      }
      if (improvedEntry) {
        if (Array.isArray(improvedEntry.achievements) && improvedEntry.achievements.length > 0) {
          updates.achievements = improvedEntry.achievements.filter(
            (a): a is string => typeof a === 'string',
          );
        }
        if (typeof improvedEntry.position === 'string' && improvedEntry.position.trim() !== '') {
          updates.position = improvedEntry.position;
        }
        if (typeof improvedEntry.company === 'string' && improvedEntry.company.trim() !== '') {
          updates.company = improvedEntry.company;
        }
      }
      if (Object.keys(updates).length > 0) {
        updateExperience(enhancingExpId, updates);
        // Trigger an immediate ATS rescore against the freshly mutated
        // resume so the score badge updates without a navigate-away/back.
        if (currentResume) {
          const nextExperience = currentResume.experience.map(exp =>
            exp.id === enhancingExpId ? { ...exp, ...updates } : exp,
          );
          void rescoreAfterApply({ ...currentResume, experience: nextExperience });
        }
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
      experience: [newExp, ...experience],
    });
    setExpandedId(newExp.id);
  };

  const useExampleEntry = () => {
    const rangeParts = experienceExample.dateRange.split(/[\s–\-]+/);
    const exampleExp: Experience = {
      id: uuidv4(),
      company: experienceExample.company,
      position: experienceExample.position,
      startDate: rangeParts[0] || '',
      endDate: rangeParts[1] && rangeParts[1] !== 'Present' ? rangeParts[1] : '',
      current: experienceExample.dateRange.toLowerCase().includes('present'),
      description: '',
      achievements: experienceExample.bullets,
    };
    updateResume({ experience: [...experience, exampleExp] });
    setExpandedId(exampleExp.id);
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
    // Snapshot the original description for the dialog *now*, but only
    // commit `enhancingExpId` and `originalDescription` to React state once
    // the AI call resolves. Setting these before awaiting `enhance()`
    // caused a race when the user clicked Improve on a different entry
    // while the first call was still in flight: the second call's dialog
    // would render the second entry's "original" against the first
    // entry's "improved".
    const targetId = exp.id;
    const targetOriginal = exp.description;

    const enhanceResult = await enhance(
      actionId as ActionType,
      { description: exp.description, position: exp.position, company: exp.company, account: exp.account },
      currentResume
    );

    if (!enhanceResult) {
      // Failed call — leave per-entry state untouched. The error toast was
      // already surfaced by the hook with the structured AIError code.
      return;
    }

    const improved = enhanceResult.improved;
    let entry: Record<string, unknown> | null = null;
    if (Array.isArray(improved)) {
      entry = (improved.find((e: Record<string, unknown>) => e.id === targetId) || improved[0] || null) as Record<string, unknown> | null;
    } else if (improved && typeof improved === 'object') {
      entry = improved as Record<string, unknown>;
    }

    if (!entry) {
      // Shape sanity-check: we already validated the top-level shape in the
      // hook, but the per-entry lookup can still come back null. Surface
      // the failure as a toast and bail without writing anything to state.
      return;
    }

    setEnhancingExpId(targetId);
    setOriginalDescription(targetOriginal);
    setImprovedEntry(entry as typeof improvedEntry);
    setShowDialog(true);
  }, [enhance, currentResume]);

  const handleRerun = useCallback(async (
    action: 'shorten' | 'improve' | 'generate',
    currentText: string,
  ) => {
    if (!enhancingExpId) return;
    const exp = experience.find(e => e.id === enhancingExpId);
    if (!exp) return;
    const enhanceResult = await enhance(
      action as ActionType,
      { description: currentText, position: exp.position, company: exp.company, account: exp.account },
      currentResume,
    );
    if (!enhanceResult) return;
    const improved = enhanceResult.improved;
    let entry: Record<string, unknown> | null = null;
    if (Array.isArray(improved)) {
      entry = (improved.find((e: Record<string, unknown>) => e.id === enhancingExpId) || improved[0] || null) as Record<string, unknown> | null;
    } else if (improved && typeof improved === 'object') {
      entry = improved as Record<string, unknown>;
    }
    if (entry) setImprovedEntry(entry as typeof improvedEntry);
  }, [enhance, enhancingExpId, experience, currentResume]);

  const handleTimelineDismiss = useCallback(() => setShowTimeline(false), []);
  const handleTimelineExplainGap = useCallback((gap: GapInfo) => {
    setSelectedGap(gap);
    setShowGapSheet(true);
  }, []);
  const handleTimelineFillGap = useCallback((gap: GapInfo) => {
    setSelectedGapForFill(gap);
    setShowGapFiller(true);
  }, []);

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
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {/* Overflow menu for import/example — always visible */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 min-h-[44px] min-w-[44px] px-2">
              <MoreHorizontal className="w-4 h-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowLinkedIn(true)}>
              <Linkedin className="w-4 h-4 mr-2" />
              Import from LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={useExampleEntry}>
              <Briefcase className="w-4 h-4 mr-2" />
              Use Example Entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {experience.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBoostAll(true)}
            className="gap-1.5 min-h-[44px] sm:min-h-0 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Sparkles className="w-4 h-4" />
            Boost All with AI
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPendingPrompt('Help me add a new work experience entry to my resume. Ask me for the details you need.')}
          className="gap-1.5 min-h-[44px] sm:min-h-0 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Bot className="w-4 h-4" />
          Add with AI
        </Button>
        <Button variant="outline" size="sm" onClick={addExperience} className="gap-2 min-h-[44px] sm:min-h-0">
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
              { label: 'Import from LinkedIn', variant: 'outline', icon: Linkedin, onClick: () => setShowLinkedIn(true) },
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
        isEnhancing={isEnhancing}
        onRerun={handleRerun}
        onApply={(editedText) => {
          apply(editedText);
          setShowDialog(false);
        }}
        onDiscard={() => {
          discard();
          setShowDialog(false);
          setEnhancingExpId(null);
          setImprovedEntry(null);
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

      {/* LinkedIn Import Sheet */}
      <Suspense fallback={null}>
        {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
      </Suspense>
    </div>
  );
});

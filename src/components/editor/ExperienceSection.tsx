import { useState } from 'react';

import { Plus, Trash2, ChevronDown, ChevronUp, Building2, Briefcase, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useResumeStore } from '@/store/resumeStore';
import { Experience } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { InlineAIButton } from './InlineAIButton';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';
import { ExperienceTimeline } from './ExperienceTimeline';
import { GapExplainerSheet } from './GapExplainerSheet';
import { formatDateRange, calculateDuration, GapInfo } from '@/lib/dateUtils';

export function ExperienceSection() {
  const { currentResume, updateResume } = useResumeStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enhancingExpId, setEnhancingExpId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [originalDescription, setOriginalDescription] = useState('');

  const { enhance, isEnhancing, currentAction, result, apply, discard } = useAIEnhance({
    section: 'experience',
    onApply: (content) => {
      if (enhancingExpId && content) {
        const improved = content as {
          description?: string;
          achievements?: string[];
          position?: string;
          company?: string;
        };
        updateExperience(enhancingExpId, {
          ...(improved.description && { description: improved.description }),
          ...(improved.achievements && { achievements: improved.achievements }),
          ...(improved.position && { position: improved.position }),
          ...(improved.company && { company: improved.company }),
        });
      }
      setShowDialog(false);
      setEnhancingExpId(null);
    },
  });

  const { getNudgeForSection, dismissNudge } = useResumeNudges({
    resume: currentResume,
  });

  const [showTimeline, setShowTimeline] = useState(true);
  const [showGapSheet, setShowGapSheet] = useState(false);
  const [selectedGap, setSelectedGap] = useState<GapInfo | null>(null);

  if (!currentResume) return null;

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
      experience: [...currentResume.experience, newExp],
    });
    setExpandedId(newExp.id);
  };

  const updateExperience = (id: string, updates: Partial<Experience>) => {
    updateResume({
      experience: currentResume.experience.map((exp) =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
    });
  };

  const deleteExperience = (id: string) => {
    updateResume({
      experience: currentResume.experience.filter((exp) => exp.id !== id),
    });
  };

  const handleAIAction = async (actionId: string, exp: Experience) => {
    setEnhancingExpId(exp.id);
    setOriginalDescription(exp.description);
    
    const enhanceResult = await enhance(
      actionId as ActionType,
      { description: exp.description, position: exp.position, company: exp.company },
      currentResume
    );
    
    if (enhanceResult) {
      setShowDialog(true);
    }
  };

  const handleHeaderAction = async (actionId: string) => {
    // Handle action for the first experience or show add prompt
    if (currentResume.experience.length > 0) {
      const firstExp = currentResume.experience[0];
      await handleAIAction(actionId, firstExp);
    } else {
      addExperience();
    }
  };

  const handleNudgeAction = () => {
    if (nudge) {
      if (currentResume.experience.length === 0) {
        addExperience();
      } else {
        const firstExp = currentResume.experience[0];
        handleAIAction(nudge.action, firstExp);
      }
      dismissNudge(nudge.trigger);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold text-lg">Work Experience</h3>
          <InlineAIButton
            section="experience"
            onAction={handleHeaderAction}
            isLoading={isEnhancing}
            disabled={currentResume.experience.length === 0}
          />
        </div>
        <Button variant="outline" size="sm" onClick={addExperience} className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Visual Timeline */}
      {showTimeline && currentResume.experience.length >= 2 && (
        <ExperienceTimeline
          experiences={currentResume.experience}
          onDismiss={() => setShowTimeline(false)}
          onExplainGap={(gap) => {
            setSelectedGap(gap);
            setShowGapSheet(true);
          }}
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

      {currentResume.experience.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border text-center animate-in fade-in-0 duration-200">
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No work experience added yet</p>
            <Button variant="link" size="sm" onClick={addExperience} className="mt-2">
              Add your first position
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {currentResume.experience.map((exp, index) => (
              <div
                key={exp.id}
                className="rounded-xl border border-border overflow-hidden transition-all duration-200"
              >
                {/* Header - Always visible */}
                <button
                  onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors touch-manipulation active:bg-muted/70 min-h-[72px]"
                >
                  <div className="text-left flex-1 min-w-0 pr-3">
                    <p className="font-semibold text-sm truncate">
                      {exp.position || `Position ${index + 1}`}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {exp.company || 'Company name'}
                    </p>
                    {/* Date range and duration */}
                    {(exp.startDate || exp.endDate || exp.current) && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                          {exp.startDate && (
                            <span className="ml-1 text-muted-foreground/50">
                              • {calculateDuration(exp.startDate, exp.endDate, exp.current)}
                            </span>
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted">
                    {expandedId === exp.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {expandedId === exp.id && (
                    <div className="animate-in fade-in-0 duration-200"
                    >
                      <div className="p-4 pt-0 space-y-4 border-t border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm flex items-center gap-1.5 mb-2">
                              <Briefcase className="w-4 h-4" />
                              Position
                            </Label>
                            <Input
                              value={exp.position}
                              onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                              placeholder="Job Title"
                              className="h-12"
                            />
                          </div>
                          <div>
                            <Label className="text-sm flex items-center gap-1.5 mb-2">
                              <Building2 className="w-4 h-4" />
                              Company
                            </Label>
                            <Input
                              value={exp.company}
                              onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                              placeholder="Company Name"
                              className="h-12"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm flex items-center gap-1.5 mb-2">
                              <Calendar className="w-4 h-4" />
                              Start Date
                            </Label>
                            <Input
                              value={exp.startDate}
                              onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                              placeholder="Jan 2020"
                              className="h-12"
                            />
                          </div>
                          <div>
                            <Label className="text-sm flex items-center gap-1.5 mb-2">
                              <Calendar className="w-4 h-4" />
                              End Date
                            </Label>
                            <Input
                              value={exp.current ? 'Present' : exp.endDate}
                              onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                              placeholder="Present"
                              disabled={exp.current}
                              className="h-12"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-1">
                          <Switch
                            checked={exp.current}
                            onCheckedChange={(checked) => updateExperience(exp.id, { current: checked })}
                          />
                          <Label className="text-sm">Currently working here</Label>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm">Description</Label>
                            <InlineAIButton
                              section="experience"
                              onAction={(actionId) => handleAIAction(actionId, exp)}
                              isLoading={isEnhancing && enhancingExpId === exp.id}
                              disabled={!exp.description && !exp.position}
                            />
                          </div>
                          <Textarea
                            value={exp.description}
                            onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                            placeholder="Describe your responsibilities and achievements..."
                            className="min-h-[120px] resize-none text-base"
                          />
                        </div>

                        <Button
                          variant="destructive"
                          size="lg"
                          onClick={() => deleteExperience(exp.id)}
                          className="w-full gap-2"
                        >
                          <Trash2 className="w-5 h-5" />
                          Delete Experience
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      

      {/* AI Enhancement Dialog */}
      {/* AI Enhancement Dialog */}
      <AIEnhanceDialog
        isOpen={showDialog}
        original={originalDescription}
        improved={(result?.improved as { description?: string })?.description || ''}
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
        experiences={currentResume.experience}
        onAddToSummary={(explanation) => {
          const currentSummary = currentResume.summary || '';
          const newSummary = currentSummary 
            ? `${currentSummary}\n\nCareer Note: ${explanation}`
            : `Career Note: ${explanation}`;
          updateResume({ summary: newSummary });
        }}
      />
    </div>
  );
}

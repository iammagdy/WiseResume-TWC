import { useState, memo } from 'react';

import { Plus, Trash2, ChevronDown, ChevronUp, GraduationCap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Education } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { toast } from 'sonner';
import { InlineAIButton } from './InlineAIButton';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';
import { SectionEmptyState } from './SectionEmptyState';
import { educationExample } from '@/lib/emptyStateExamples';

export const EducationSection = memo(function EducationSection() {
  const education = useResumeStore(state => state.currentResume?.education);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { enhance, isEnhancing } = useAIEnhance({
    section: 'education',
    onApply: () => {},
  });

  const { getNudgeForSection, dismissNudge } = useResumeNudges({
    resume: currentResume,
  });

  if (!currentResume || !education) return null;

  const nudge = getNudgeForSection('education');

  const addEducation = () => {
    const newEdu: Education = {
      id: uuidv4(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
    };
    updateResume({
      education: [...education, newEdu],
    });
    setExpandedId(newEdu.id);
  };

  const updateEducation = (id: string, updates: Partial<Education>) => {
    updateResume({
      education: education.map((edu) =>
        edu.id === id ? { ...edu, ...updates } : edu
      ),
    });
  };

  const deleteEducation = (id: string) => {
    updateResume({
      education: education.filter((edu) => edu.id !== id),
    });
  };

  const handleAIAction = async (actionId: string) => {
    const result = await enhance(
      actionId as ActionType,
      education,
      currentResume
    );
    
    if (result?.improved) {
      const improvedEducation = result.improved as Education[];
      if (Array.isArray(improvedEducation) && improvedEducation.length > 0) {
        updateResume({ education: improvedEducation });
        toast.success(result.changes?.join(', ') || 'Education improved!');
      }
    } else if (result?.suggestions) {
      toast.info(`💡 ${result.suggestions.join(' • ')}`);
    }
  };

  const handleNudgeAction = () => {
    if (nudge) {
      if (education.length === 0) {
        addEducation();
      } else {
        handleAIAction(nudge.action);
      }
      dismissNudge(nudge.trigger);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={addEducation} className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Contextual Nudge */}
      <AIContextualNudge
        show={!!nudge}
        message={nudge?.message || ''}
        actionLabel={nudge?.actionLabel || ''}
        onAction={handleNudgeAction}
        onDismiss={() => nudge && dismissNudge(nudge.trigger)}
      />

      {education.length === 0 ? (
          <SectionEmptyState
            icon={GraduationCap}
            title="Add your education"
            exampleContent={
              <div className="text-sm space-y-1">
                <p className="font-semibold">{educationExample.degree}</p>
                <p className="text-muted-foreground text-xs">{educationExample.institution} | {educationExample.dateRange}</p>
                <p className="text-muted-foreground text-xs">GPA: {educationExample.gpa}</p>
                <p className="text-muted-foreground text-xs">Relevant coursework: {educationExample.coursework}</p>
              </div>
            }
            actions={[
              { label: 'Add Education', variant: 'outline', icon: Plus, onClick: addEducation },
              {
                label: "I'm Self-Taught",
                variant: 'ghost',
                onClick: () => {
                  const selfTaught: Education = {
                    id: uuidv4(),
                    institution: 'Self-Taught / Online Learning',
                    degree: 'Professional Certifications & Courses',
                    field: '',
                    startDate: '',
                    endDate: '',
                  };
                  updateResume({ education: [...education, selfTaught] });
                  setExpandedId(selfTaught.id);
                },
              },
            ]}
          />
        ) : (
          <div className="space-y-3">
            {education.map((edu, index) => (
              <div
                key={edu.id}
                className="rounded-xl border border-border overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors touch-manipulation active:bg-muted/70 min-h-[56px]"
                >
                  <div className="text-left flex-1 min-w-0 pr-3">
                    <p className="font-semibold text-sm truncate">
                      {edu.degree || `Degree ${index + 1}`}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {edu.institution || 'Institution name'}
                    </p>
                  </div>
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted">
                    {expandedId === edu.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedId === edu.id && (
                    <div className="animate-in fade-in-0 duration-200"
                    >
                      <div className="p-4 pt-0 space-y-4 border-t border-border">
                        <div>
                          <Label className="text-sm flex items-center gap-1.5 mb-2">
                            <GraduationCap className="w-4 h-4" />
                            Institution
                          </Label>
                          <Input
                            value={edu.institution}
                            onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                            placeholder="University Name"
                            className="h-12"
                            autoComplete="organization"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs mb-1 block">Degree</Label>
                            <Input
                              value={edu.degree}
                              onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                              placeholder="Bachelor's"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Field of Study</Label>
                            <Input
                              value={edu.field}
                              onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                              placeholder="Computer Science"
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
                              value={edu.startDate}
                              onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                              placeholder="2016"
                              className="h-12"
                              autoComplete="off"
                            />
                          </div>
                          <div>
                            <Label className="text-sm flex items-center gap-1.5 mb-2">
                              <Calendar className="w-4 h-4" />
                              End Date
                            </Label>
                            <Input
                              value={edu.endDate}
                              onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                              placeholder="2020"
                              className="h-12"
                              autoComplete="off"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm mb-2 block">GPA (optional)</Label>
                          <Input
                            value={edu.gpa || ''}
                            onChange={(e) => updateEducation(edu.id, { gpa: e.target.value })}
                            placeholder="3.8/4.0"
                            className="h-12"
                            inputMode="decimal"
                            autoComplete="off"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEducation(edu.id)}
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      
    </div>
  );
});

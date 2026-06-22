import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useState, memo, Suspense } from 'react';

import { Plus, Trash2, ChevronDown, ChevronUp, GraduationCap, Calendar, ArrowUp, ArrowDown, MoreHorizontal, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { useExpandedEntryRestore } from '@/hooks/useExpandedEntryRestore';
import { Education } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import type { ActionType } from '@/hooks/useAIEnhance';
import { AIContextualNudge } from './AIContextualNudge';
import { useSectionAITrigger } from '@/store/sectionAIBridge';
import { useResumeNudges } from '@/hooks/useResumeNudges';
import { SectionEmptyState } from './SectionEmptyState';
import { educationExample } from '@/lib/emptyStateExamples';
import { MonthYearPicker } from './MonthYearPicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
const LinkedInOptimizerSheet = lazyWithRetry(() => import('./ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));

export const EducationSection = memo(function EducationSection() {
  const education = useResumeStore(state => state.currentResume?.education);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const [expandedId, setExpandedId] = useExpandedEntryRestore('education');
  const [showLinkedIn, setShowLinkedIn] = useState(false);

  // Route the Education contextual nudge through the shared bridge so
  // accepting it opens the preview popup owned by `SectionAIAction`
  // before any education entries are overwritten.
  const triggerEducationAI = useSectionAITrigger('education');

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
      education: [newEdu, ...education],
    });
    setExpandedId(newEdu.id);
  };

  const useExampleEntry = () => {
    const degreeIn = educationExample.degree.toLowerCase().indexOf(' in ');
    const degreeName = degreeIn >= 0 ? educationExample.degree.substring(0, degreeIn) : educationExample.degree;
    const fieldName = degreeIn >= 0 ? educationExample.degree.substring(degreeIn + 4) : '';
    const rangeParts = educationExample.dateRange.split(/[\s–\-]+/);
    const exampleEdu: Education = {
      id: uuidv4(),
      institution: educationExample.institution,
      degree: degreeName,
      field: fieldName,
      startDate: rangeParts[0] || '',
      endDate: rangeParts[1] || '',
      gpa: educationExample.gpa,
    };
    updateResume({ education: [exampleEdu, ...education] });
    setExpandedId(exampleEdu.id);
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

  const moveEducation = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...education];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    updateResume({ education: reordered });
  };

  const handleNudgeAction = () => {
    if (!nudge) return;
    // Always route through the preview popup — even when there are no
    // education entries yet — so the AI's suggested entries are shown
    // for review before being written to the resume.
    if (!triggerEducationAI) {
      // Bridge not yet registered (e.g. SectionAIAction still mounting).
      // Leave the nudge visible so the user can retry instead of
      // silently dropping the action.
      return;
    }
    triggerEducationAI(nudge.action as ActionType);
    dismissNudge(nudge.trigger);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
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
              <GraduationCap className="w-4 h-4 mr-2" />
              Use Example Entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={addEducation} className="gap-2 min-h-[44px]">
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
                  updateResume({ education: [selfTaught, ...education] });
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
                <div className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors min-h-[72px]">
                  {/* Reorder arrows — min 44×44px touch targets */}
                  <div className="flex flex-col gap-0 mr-2 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => { e.stopPropagation(); moveEducation(index, 'up'); }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      disabled={index === education.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveEducation(index, 'down'); }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                    className="flex-1 flex items-center justify-between touch-manipulation active:bg-muted/70 min-w-0"
                  >
                    <div className="text-left flex-1 min-w-0 pr-3">
                      <p className="font-semibold text-sm truncate" title={edu.degree || undefined}>
                        {edu.degree || `Degree ${index + 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground truncate" title={edu.institution || undefined}>
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
                </div>

                {expandedId === edu.id && (
                    <div className="animate-in fade-in-0 duration-200">
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
                            className="h-11"
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
                              className="h-11"
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Field of Study</Label>
                            <Input
                              value={edu.field}
                              onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                              placeholder="Computer Science"
                              className="h-11"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm flex items-center gap-1.5 mb-2">
                              <Calendar className="w-4 h-4" />
                              Start Date
                            </Label>
                            <MonthYearPicker
                              value={edu.startDate}
                              onChange={(v) => updateEducation(edu.id, { startDate: v })}
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                End Date
                              </Label>
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={edu.endDate === 'Present'}
                                  onChange={(e) => updateEducation(edu.id, { endDate: e.target.checked ? 'Present' : '' })}
                                  className="rounded accent-primary w-4 h-4"
                                />
                                <span className="text-sm text-muted-foreground">Present</span>
                              </label>
                            </div>
                            <MonthYearPicker
                              value={edu.endDate === 'Present' ? '' : edu.endDate}
                              onChange={(v) => updateEducation(edu.id, { endDate: v })}
                              disabled={edu.endDate === 'Present'}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm mb-2 block">GPA (optional)</Label>
                          <Input
                            value={edu.gpa || ''}
                            onChange={(e) => updateEducation(edu.id, { gpa: e.target.value })}
                            placeholder="3.8/4.0"
                            className="h-11"
                            inputMode="decimal"
                            autoComplete="off"
                          />
                        </div>

                        <div>
                          <Label className="text-sm mb-2 block">Description (optional)</Label>
                          <Textarea
                            value={edu.description || ''}
                            onChange={(e) => updateEducation(edu.id, { description: e.target.value })}
                            placeholder="Brief description of your program, thesis, or relevant coursework..."
                            className="min-h-[60px] resize-none text-base"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEducation(edu.id)}
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
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

      {/* LinkedIn Import Sheet */}
      <Suspense fallback={null}>
        {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
      </Suspense>
    </div>
  );
});

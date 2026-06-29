import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Rocket, Calendar, Link, Github, X, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { useExpandedEntryRestore } from '@/hooks/useExpandedEntryRestore';
import { Project } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';
import { MonthYearPicker } from './MonthYearPicker';
import { InlineAIButton } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { ProjectAIQuestionsDialog } from './ai/ProjectAIQuestionsDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';
import { useLocale } from '@/i18n/LocaleProvider';

export const ProjectsSection = memo(function ProjectsSection() {
  const projects = useResumeStore(state => state.currentResume?.projects) || [];
  const currentResume = useResumeStore(state => state.currentResume);
  const updateResume = useResumeStore(state => state.updateResume);
  const { t } = useLocale();
  const { isAuthenticated } = useAuth();
  const [expandedId, setExpandedId] = useExpandedEntryRestore('projects');
  const [techInput, setTechInput] = useState('');

  // AI state
  const [enhancingProjectId, setEnhancingProjectId] = useState<string | null>(null);
  const [originalDescription, setOriginalDescription] = useState('');
  // Track which AI action triggered the current popup so the Approve
  // handler knows whether to write a description (string sections) or
  // append technology suggestions (array-of-strings section).
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [questionsProjectId, setQuestionsProjectId] = useState<string | null>(null);
  const [questionsAction, setQuestionsAction] = useState<ActionType | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Latest AI improved payload, kept in a ref so the apply callback can
  // merge the user's edited description (a string from the dialog) with
  // any structured fields the AI returned (technologies, etc.).
  const lastImprovedRef = useRef<unknown>(null);

  const { rescoreAfterApply } = useAIApplyEffects(currentResume?.id);

  const triggerRescore = useCallback((nextProjects: Project[]) => {
    if (!currentResume) return;
    void rescoreAfterApply({ ...currentResume, projects: nextProjects });
  }, [currentResume, rescoreAfterApply]);

  const onApply = useCallback((content: unknown) => {
    if (!enhancingProjectId) return;
    const proj = projects.find(p => p.id === enhancingProjectId);
    if (!proj) return;

    // The new editable AIEnhanceDialog forwards the user's edited text as a
    // string. Merge that string as the description and pull non-text fields
    // (technologies, etc.) from the AI response we stashed before opening
    // the dialog.
    if (typeof content === 'string') {
      const improved = lastImprovedRef.current;
      const improvedObj = (improved && typeof improved === 'object' && !Array.isArray(improved))
        ? improved as Record<string, unknown>
        : null;
      const next = projects.map(p =>
        p.id === enhancingProjectId
          ? {
              ...p,
              description: content,
              technologies: improvedObj && Array.isArray(improvedObj.technologies)
                ? improvedObj.technologies as string[]
                : p.technologies,
            }
          : p
      );
      updateResume({ projects: next });
      triggerRescore(next);
      return;
    }

    // Handle suggest_technologies — content is an array of strings
    if (Array.isArray(content) && content.every(i => typeof i === 'string')) {
      const existingTechs = new Set(proj.technologies);
      const newTechs = (content as string[]).filter(t => !existingTechs.has(t));
      const next = projects.map(p =>
        p.id === enhancingProjectId
          ? { ...p, technologies: [...p.technologies, ...newTechs] }
          : p
      );
      updateResume({ projects: next });
      toast.success(t('editor.projects.addedTechsToast', 'Added {{count}} technologies', { count: newTechs.length }));
      triggerRescore(next);
      return;
    }
    // Handle single project object improvement
    if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
      const improved = content as Record<string, unknown>;
      const next = projects.map(p =>
        p.id === enhancingProjectId
          ? {
              ...p,
              description: typeof improved.description === 'string' ? improved.description : p.description,
              technologies: Array.isArray(improved.technologies) ? improved.technologies as string[] : p.technologies,
            }
          : p
      );
      updateResume({ projects: next });
      triggerRescore(next);
      return;
    }
    // Handle array of projects (full section improve)
    if (Array.isArray(content)) {
      const next = content as Project[];
      updateResume({ projects: next });
      triggerRescore(next);
    }
  }, [enhancingProjectId, projects, updateResume, triggerRescore]);

  const { enhance, isEnhancing, result, apply, discard, reset } = useAIEnhance({
    section: 'projects',
    onApply,
  });

  // Stash the latest AI payload so the apply path can merge it with the
  // user's edited description (the dialog only forwards a string).
  useEffect(() => {
    if (result?.improved !== undefined) {
      lastImprovedRef.current = result.improved;
    }
  }, [result]);

  const handleRerun = useCallback(async (
    action: 'shorten' | 'improve' | 'generate',
    currentText: string,
  ) => {
    if (!enhancingProjectId) return;
    const proj = projects.find(p => p.id === enhancingProjectId);
    if (!proj) return;
    await enhance(
      action as ActionType,
      {
        id: proj.id,
        name: proj.name,
        role: proj.role,
        startDate: proj.startDate,
        endDate: proj.endDate,
        description: currentText,
        technologies: proj.technologies,
        url: proj.url,
        githubUrl: proj.githubUrl,
      },
      currentResume,
    );
  }, [enhance, enhancingProjectId, projects, currentResume]);

  const handleAIAction = useCallback(async (actionId: string, proj: Project) => {
    // Pre-flight guard: both generate and suggest_technologies need at minimum
    // a project name to produce useful output.
    if ((actionId === 'generate' || actionId === 'suggest_technologies') && !proj.name.trim()) {
      toast.error('Enter a project name first so AI knows what to work with.');
      return;
    }

    // For suggest_technologies also require some description context; without it
    // the AI has nothing to base technology suggestions on.
    if (actionId === 'suggest_technologies' && !proj.description?.trim() && !proj.role?.trim()) {
      toast.error('Add a short description or role so AI can suggest relevant technologies.');
      return;
    }

    setEnhancingProjectId(proj.id);
    setOriginalDescription(proj.description || '');
    setCurrentActionId(actionId);

    // For suggest_technologies pass a focused payload (name + role + description
    // + existing technologies) instead of the full project object, so the LLM
    // receives a clean, targeted prompt without irrelevant fields.
    const singleProject = actionId === 'suggest_technologies'
      ? {
          name: proj.name,
          role: proj.role,
          description: proj.description,
          technologies: proj.technologies,
          url: proj.url,
          githubUrl: proj.githubUrl,
        }
      : {
          id: proj.id,
          name: proj.name,
          role: proj.role,
          startDate: proj.startDate,
          endDate: proj.endDate,
          description: proj.description,
          technologies: proj.technologies,
          url: proj.url,
          githubUrl: proj.githubUrl,
        };

    const resp = await enhance(
      actionId as ActionType, // actionId comes from onAction callback, always a valid string
      singleProject,
      currentResume,
    );

    // Check if AI returned questions
    if (resp && (resp as Record<string, unknown>).type === 'questions') {
      setAiQuestions((resp as Record<string, unknown>).questions as string[]);
      setQuestionsProjectId(proj.id);
      setQuestionsAction(actionId as ActionType);
      return;
    }

    // For suggest_technologies the popup opens via `result`; the
    // dialog's Approve handler dedupes against existing technologies
    // and writes the appended list back to the resume.
  }, [currentResume, enhance, projects]);

  const handleQuestionsSubmit = useCallback(async (answers: Record<string, string>) => {
    if (!questionsProjectId) return;
    const proj = projects.find(p => p.id === questionsProjectId);
    if (!proj) return;

    setQuestionsLoading(true);
    setEnhancingProjectId(questionsProjectId);

    const answersText = aiQuestions.map((q, i) =>
      `Q: ${q}\nA: ${answers[String(i)] || '(skipped)'}`
    ).join('\n\n');

    // suggest_technologies questions route back to suggest_technologies_with_answers
    // so the backend returns a tech array (not a description).
    // All other question flows (generate, etc.) use generate_with_answers.
    const answerAction: ActionType = questionsAction === 'suggest_technologies'
      ? 'suggest_technologies_with_answers'
      : 'generate_with_answers';

    const singleProject = {
      id: proj.id,
      name: proj.name,
      role: proj.role,
      startDate: proj.startDate,
      endDate: proj.endDate,
      description: proj.description,
      technologies: proj.technologies,
      url: proj.url,
      githubUrl: proj.githubUrl,
    };

    await enhance(
      answerAction,
      singleProject,
      currentResume,
      answersText,
    );

    setAiQuestions([]);
    setQuestionsProjectId(null);
    setQuestionsAction(null);
    setQuestionsLoading(false);
  }, [questionsProjectId, projects, aiQuestions, questionsAction, currentResume, enhance]);

  const handleQuestionsSkip = useCallback(async () => {
    if (!questionsProjectId) return;
    const proj = projects.find(p => p.id === questionsProjectId);
    if (!proj) return;

    setEnhancingProjectId(questionsProjectId);
    const skippedAction = questionsAction;
    setAiQuestions([]);
    setQuestionsProjectId(null);
    setQuestionsAction(null);

    const singleProject = {
      id: proj.id,
      name: proj.name,
      role: proj.role,
      startDate: proj.startDate,
      endDate: proj.endDate,
      description: proj.description,
      technologies: proj.technologies,
      url: proj.url,
      githubUrl: proj.githubUrl,
    };

    if (skippedAction === 'suggest_technologies') {
      // Skip → generate techs with whatever context is available
      await enhance('suggest_technologies' as ActionType, singleProject, currentResume);
    } else {
      await enhance(
        'generate' as ActionType,
        { ...singleProject, description: 'generate without questions' },
        currentResume,
      );
    }
  }, [questionsProjectId, questionsAction, projects, currentResume, enhance]);

  const addProject = () => {
    haptics.light();
    const newProject: Project = { id: uuidv4(), name: '', role: '', startDate: '', endDate: '', current: false, technologies: [], description: '', url: '', githubUrl: '' };
    updateResume({ projects: [newProject, ...projects] });
    setExpandedId(newProject.id);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    updateResume({ projects: projects.map(p => p.id === id ? { ...p, ...updates } : p) });
  };

  const deleteProject = (id: string) => { haptics.light(); updateResume({ projects: projects.filter(p => p.id !== id) }); };

  const moveUp = (index: number) => { if (index === 0) return; haptics.light(); const arr = [...projects]; [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]; updateResume({ projects: arr }); };
  const moveDown = (index: number) => { if (index >= projects.length - 1) return; haptics.light(); const arr = [...projects]; [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]; updateResume({ projects: arr }); };

  const addTech = (id: string) => {
    const t = techInput.trim();
    if (!t) return;
    const proj = projects.find(p => p.id === id);
    if (proj && !proj.technologies.includes(t)) {
      updateProject(id, { technologies: [...proj.technologies, t] });
    }
    setTechInput('');
  };

  const removeTech = (id: string, tech: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj) updateProject(id, { technologies: proj.technologies.filter(t => t !== tech) });
  };

  const getImprovedDescription = (): string => {
    if (!result?.improved) return '';
    const imp = result.improved;
    // Tech suggestions arrive as a string array; render the *new* (not
    // already-listed) techs as a readable comma-separated preview so the
    // user knows exactly what Approve will add.
    if (currentActionId === 'suggest_technologies' && Array.isArray(imp)) {
      const proj = projects.find(p => p.id === enhancingProjectId);
      const existing = new Set(proj?.technologies ?? []);
      return (imp as unknown[])
        .filter((t): t is string => typeof t === 'string' && !existing.has(t))
        .join(', ');
    }
    if (typeof imp === 'string') return imp;
    if (Array.isArray(imp) && imp.length > 0) {
      const first = imp[0];
      if (typeof first === 'object' && first !== null) {
        return (first as Record<string, unknown>).description as string || '';
      }
      if (typeof first === 'string') return first;
    }
    if (typeof imp === 'object' && imp !== null && !Array.isArray(imp)) {
      return (imp as Record<string, unknown>).description as string || '';
    }
    return JSON.stringify(imp);
  };

  const getOriginalForDialog = (): string => {
    if (currentActionId === 'suggest_technologies') {
      const proj = projects.find(p => p.id === enhancingProjectId);
      return proj?.technologies.join(', ') ?? '';
    }
    return originalDescription;
  };

  const dialogTitle = currentActionId === 'suggest_technologies'
    ? t('editor.projects.suggestedTechTitle', 'Suggested Technologies')
    : t('editor.projects.enhancedTitle', 'AI Project Enhancement');

  // Approve handler: branches on the action that triggered this preview.
  // For tech suggestions we ignore the user's edited preview text and
  // append the original AI string-array (deduped) to the project's
  // technology list — only after the user clicks Approve.
  const handleDialogApply = useCallback((editedText: string) => {
    if (currentActionId === 'suggest_technologies') {
      const payload = lastImprovedRef.current;
      const proj = projects.find(p => p.id === enhancingProjectId);
      if (proj && Array.isArray(payload)) {
        const existing = new Set(proj.technologies);
        const newTechs = (payload as unknown[]).filter(
          (t): t is string => typeof t === 'string' && !existing.has(t),
        );
        if (newTechs.length > 0) {
          const next = projects.map(p =>
            p.id === proj.id ? { ...p, technologies: [...p.technologies, ...newTechs] } : p,
          );
          updateResume({ projects: next });
          toast.success(t('editor.projects.changesApplied', 'Changes applied!'), {
            description: t('editor.projects.addedTechsToast', 'Added {{count}} technologies', { count: newTechs.length }),
          });
          triggerRescore(next);
        } else {
          toast.success(t('editor.projects.changesApplied', 'Changes applied!'), {
            description: t('editor.projects.noNewTechs', 'No new technologies to add'),
          });
        }
      }
      reset();
      setCurrentActionId(null);
      return;
    }
    apply(editedText);
    setCurrentActionId(null);
  }, [currentActionId, projects, enhancingProjectId, updateResume, triggerRescore, apply, reset]);

  const handleDialogDiscard = useCallback(() => {
    discard();
    setCurrentActionId(null);
  }, [discard]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={addProject} className="gap-2 active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
          {t('common.add', 'Add')}
        </Button>
      </div>
      {projects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Rocket className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('editor.projects.emptyTip', 'Showcase your projects')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((proj, index) => (
            <div key={proj.id} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted touch-manipulation active:bg-muted/70 min-h-[72px]"
              >
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); moveUp(index); }}
                    disabled={index === 0}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label={t('common.moveUp', 'Move up')}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); moveDown(index); }}
                    disabled={index === projects.length - 1}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label={t('common.moveDown', 'Move down')}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-left flex-1 min-w-0 px-3">
                  <p className="font-semibold text-sm truncate">{proj.name || t('editor.projects.nameDefault', 'Project {{index}}', { index: index + 1 })}</p>
                  <p className="text-sm text-muted-foreground truncate">{proj.role || t('editor.projects.roleDefault', 'Your role')}</p>
                </div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                  {expandedId === proj.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </button>
              {expandedId === proj.id && (
                <div className="animate-in fade-in-0 duration-200">
                  <div className="p-4 pt-0 space-y-4 border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`proj-${proj.id}-name`} className="text-sm flex items-center gap-1.5 mb-2">
                          <Rocket className="w-4 h-4" />
                          {t('editor.projects.nameLabel', 'Project Name')}
                        </Label>
                        <Input
                          id={`proj-${proj.id}-name`}
                          value={proj.name}
                          onChange={e => updateProject(proj.id, { name: e.target.value })}
                          placeholder={t('editor.projects.namePlaceholder', 'My Awesome Project')}
                          className="h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`proj-${proj.id}-role`} className="text-sm mb-2">
                          {t('editor.projects.roleLabel', 'Role')}
                        </Label>
                        <Input
                          id={`proj-${proj.id}-role`}
                          value={proj.role}
                          onChange={e => updateProject(proj.id, { role: e.target.value })}
                          placeholder={t('editor.projects.rolePlaceholder', 'Lead Developer')}
                          className="h-12"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm flex items-center gap-1.5 mb-2">
                          <Calendar className="w-4 h-4" />
                          {t('editor.projects.startDate', 'Start Date')}
                        </Label>
                        <MonthYearPicker
                          value={proj.startDate}
                          onChange={(v) => updateProject(proj.id, { startDate: v })}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {t('editor.projects.endDate', 'End Date')}
                          </Label>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!proj.current}
                              onChange={(e) =>
                                updateProject(proj.id, {
                                  current: e.target.checked,
                                  endDate: e.target.checked ? '' : proj.endDate,
                                })
                              }
                              className="rounded accent-primary w-4 h-4"
                            />
                            <span className="text-sm text-muted-foreground">{t('editor.projects.present', 'Present')}</span>
                          </label>
                        </div>
                        <MonthYearPicker
                          value={proj.current ? '' : proj.endDate}
                          onChange={(v) => updateProject(proj.id, { endDate: v, current: false })}
                          disabled={!!proj.current}
                        />
                      </div>
                    </div>

                    {/* Technologies with AI */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor={`proj-${proj.id}-tech-input`} className="text-sm">
                          {t('editor.projects.technologiesLabel', 'Technologies')}
                        </Label>
                        <InlineAIButton
                          section="projects"
                          fieldContext="technologies"
                          onAction={(actionId) => handleAIAction(actionId, proj)}
                          isLoading={isEnhancing && enhancingProjectId === proj.id}
                          isAuthenticated={isAuthenticated}
                          hasContent={proj.technologies.length > 0}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {proj.technologies.map(tech => (
                          <span key={tech} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs">
                            {tech}
                            <button onClick={() => removeTech(proj.id, tech)} className="hover:bg-primary/20 rounded-full p-0.5 active:scale-95"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id={`proj-${proj.id}-tech-input`}
                          value={techInput}
                          onChange={e => setTechInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(proj.id); } }}
                          placeholder={t('editor.projects.techPlaceholder', 'Add technology...')}
                          className="h-12 flex-1"
                        />
                        <Button variant="outline" size="sm" onClick={() => addTech(proj.id)} className="h-12 active:scale-95">
                          {t('common.add', 'Add')}
                        </Button>
                      </div>
                    </div>

                    {/* Description with AI */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor={`proj-${proj.id}-desc`} className="text-sm">
                          {t('editor.projects.descriptionLabel', 'Description')}
                        </Label>
                        <InlineAIButton
                          section="projects"
                          fieldContext="description"
                          onAction={(actionId) => handleAIAction(actionId, proj)}
                          isLoading={isEnhancing && enhancingProjectId === proj.id}
                          isAuthenticated={isAuthenticated}
                          hasContent={!!proj.description}
                        />
                      </div>
                      <Textarea
                        id={`proj-${proj.id}-desc`}
                        value={proj.description}
                        onChange={e => updateProject(proj.id, { description: e.target.value })}
                        placeholder={t('editor.projects.descriptionPlaceholder', 'Describe the project...')}
                        className="min-h-[100px] resize-none text-base"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`proj-${proj.id}-url`} className="text-sm flex items-center gap-1.5 mb-2">
                          <Link className="w-4 h-4" />
                          {t('editor.projects.urlLabel', 'Project URL')}
                        </Label>
                        <Input
                          id={`proj-${proj.id}-url`}
                          value={proj.url || ''}
                          onChange={e => updateProject(proj.id, { url: e.target.value })}
                          placeholder="https://..."
                          className="h-12"
                          type="url"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`proj-${proj.id}-github`} className="text-sm flex items-center gap-1.5 mb-2">
                          <Github className="w-4 h-4" />
                          {t('editor.projects.githubLabel', 'GitHub')}
                        </Label>
                        <Input
                          id={`proj-${proj.id}-github`}
                          value={proj.githubUrl || ''}
                          onChange={e => updateProject(proj.id, { githubUrl: e.target.value })}
                          placeholder="https://github.com/..."
                          className="h-12"
                          type="url"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(proj.id)}
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('common.delete', 'Delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Enhance Dialog */}
      <AIEnhanceDialog
        isOpen={!!result}
        original={getOriginalForDialog()}
        improved={getImprovedDescription()}
        changes={result?.changes || []}
        suggestions={result?.suggestions}
        isEnhancing={isEnhancing}
        onRerun={currentActionId === 'suggest_technologies' ? undefined : handleRerun}
        onApply={handleDialogApply}
        onDiscard={handleDialogDiscard}
        title={dialogTitle}
      />

      {/* Clarifying Questions Dialog */}
      <ProjectAIQuestionsDialog
        isOpen={aiQuestions.length > 0}
        projectName={projects.find(p => p.id === questionsProjectId)?.name || ''}
        questions={aiQuestions}
        onSubmit={handleQuestionsSubmit}
        onClose={handleQuestionsSkip}
        isLoading={questionsLoading}
      />
    </div>
  );
});

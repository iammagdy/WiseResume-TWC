import { memo, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Rocket, Calendar, Link, Github, X, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Project } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';
import { InlineAIButton } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { ProjectAIQuestionsDialog } from './ai/ProjectAIQuestionsDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const ProjectsSection = memo(function ProjectsSection() {
  const projects = useResumeStore(state => state.currentResume?.projects) || [];
  const currentResume = useResumeStore(state => state.currentResume);
  const updateResume = useResumeStore(state => state.updateResume);
  const { isAuthenticated } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [techInput, setTechInput] = useState('');

  // AI state
  const [enhancingProjectId, setEnhancingProjectId] = useState<string | null>(null);
  const [originalDescription, setOriginalDescription] = useState('');
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [questionsProjectId, setQuestionsProjectId] = useState<string | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const onApply = useCallback((content: unknown) => {
    if (!enhancingProjectId) return;
    // Handle suggest_technologies — content is an array of strings
    if (Array.isArray(content) && content.every(i => typeof i === 'string')) {
      const proj = projects.find(p => p.id === enhancingProjectId);
      if (proj) {
        const existingTechs = new Set(proj.technologies);
        const newTechs = (content as string[]).filter(t => !existingTechs.has(t));
        updateResume({
          projects: projects.map(p =>
            p.id === enhancingProjectId
              ? { ...p, technologies: [...p.technologies, ...newTechs] }
              : p
          ),
        });
        toast.success(`Added ${newTechs.length} technologies`);
      }
      return;
    }
    // Handle single project object improvement
    if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
      const improved = content as Record<string, unknown>;
      updateResume({
        projects: projects.map(p =>
          p.id === enhancingProjectId
            ? {
                ...p,
                description: typeof improved.description === 'string' ? improved.description : p.description,
                technologies: Array.isArray(improved.technologies) ? improved.technologies as string[] : p.technologies,
              }
            : p
        ),
      });
      return;
    }
    // Handle array of projects (full section improve)
    if (Array.isArray(content)) {
      updateResume({ projects: content as Project[] });
    }
  }, [enhancingProjectId, projects, updateResume]);

  const { enhance, isEnhancing, result, apply, discard } = useAIEnhance({
    section: 'projects',
    onApply,
  });

  const handleAIAction = useCallback(async (actionId: string, proj: Project) => {
    setEnhancingProjectId(proj.id);
    setOriginalDescription(proj.description || '');

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

    const resp = await enhance(
      actionId as ActionType,
      singleProject,
      currentResume,
    );

    // Check if AI returned questions
    if (resp && (resp as Record<string, unknown>).type === 'questions') {
      setAiQuestions((resp as Record<string, unknown>).questions as string[]);
      setQuestionsProjectId(proj.id);
      return;
    }
  }, [currentResume, enhance]);

  const handleQuestionsSubmit = useCallback(async (answers: Record<string, string>) => {
    if (!questionsProjectId) return;
    const proj = projects.find(p => p.id === questionsProjectId);
    if (!proj) return;

    setQuestionsLoading(true);
    setEnhancingProjectId(questionsProjectId);

    const answersText = aiQuestions.map((q, i) =>
      `Q: ${q}\nA: ${answers[String(i)] || '(skipped)'}`
    ).join('\n\n');

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
      'generate_with_answers' as ActionType,
      singleProject,
      currentResume,
      answersText,
    );

    setAiQuestions([]);
    setQuestionsProjectId(null);
    setQuestionsLoading(false);
  }, [questionsProjectId, projects, aiQuestions, currentResume, enhance]);

  const handleQuestionsSkip = useCallback(async () => {
    if (!questionsProjectId) return;
    const proj = projects.find(p => p.id === questionsProjectId);
    if (!proj) return;

    setEnhancingProjectId(questionsProjectId);
    setAiQuestions([]);
    setQuestionsProjectId(null);

    const singleProject = {
      id: proj.id,
      name: proj.name,
      role: proj.role,
      startDate: proj.startDate,
      endDate: proj.endDate,
      description: proj.description,
      technologies: proj.technologies,
    };

    await enhance(
      'generate' as ActionType,
      { ...singleProject, description: 'generate without questions' },
      currentResume,
    );
  }, [questionsProjectId, projects, currentResume, enhance]);

  const addProject = () => {
    haptics.light();
    const newProject: Project = { id: uuidv4(), name: '', role: '', startDate: '', endDate: '', technologies: [], description: '', url: '', githubUrl: '' };
    updateResume({ projects: [...projects, newProject] });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={addProject} className="gap-2 active:scale-95 transition-transform"><Plus className="w-4 h-4" />Add</Button>
      </div>
      {projects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><Rocket className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Showcase your projects</p></div>
      ) : (
        <div className="space-y-3">
          {projects.map((proj, index) => (
            <div key={proj.id} className="rounded-xl border border-border overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 touch-manipulation active:bg-muted/70 min-h-[72px]">
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); moveUp(index); }} disabled={index === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); moveDown(index); }} disabled={index === projects.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-left flex-1 min-w-0 px-3">
                  <p className="font-semibold text-sm truncate">{proj.name || `Project ${index + 1}`}</p>
                  <p className="text-sm text-muted-foreground truncate">{proj.role || 'Your role'}</p>
                </div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">{expandedId === proj.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}</div>
              </button>
              {expandedId === proj.id && (
                <div className="animate-in fade-in-0 duration-200">
                  <div className="p-4 pt-0 space-y-4 border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Rocket className="w-4 h-4" />Project Name</Label><Input value={proj.name} onChange={e => updateProject(proj.id, { name: e.target.value })} placeholder="My Awesome Project" className="h-12" /></div>
                      <div><Label className="text-sm mb-2">Role</Label><Input value={proj.role} onChange={e => updateProject(proj.id, { role: e.target.value })} placeholder="Lead Developer" className="h-12" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />Start Date</Label><Input value={proj.startDate} onChange={e => updateProject(proj.id, { startDate: e.target.value })} placeholder="Jan 2024" className="h-12" /></div>
                      <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />End Date</Label><Input value={proj.endDate} onChange={e => updateProject(proj.id, { endDate: e.target.value })} placeholder="Present" className="h-12" /></div>
                    </div>

                    {/* Technologies with AI */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Technologies</Label>
                        <InlineAIButton
                          section="projects"
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
                        <Input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(proj.id); } }} placeholder="Add technology..." className="h-12 flex-1" />
                        <Button variant="outline" size="sm" onClick={() => addTech(proj.id)} className="h-12 active:scale-95">Add</Button>
                      </div>
                    </div>

                    {/* Description with AI */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Description</Label>
                        <InlineAIButton
                          section="projects"
                          onAction={(actionId) => handleAIAction(actionId, proj)}
                          isLoading={isEnhancing && enhancingProjectId === proj.id}
                          isAuthenticated={isAuthenticated}
                          hasContent={!!proj.description}
                        />
                      </div>
                      <Textarea value={proj.description} onChange={e => updateProject(proj.id, { description: e.target.value })} placeholder="Describe the project..." className="min-h-[100px] resize-none text-base" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Link className="w-4 h-4" />Project URL</Label><Input value={proj.url || ''} onChange={e => updateProject(proj.id, { url: e.target.value })} placeholder="https://..." className="h-12" type="url" /></div>
                      <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Github className="w-4 h-4" />GitHub</Label><Input value={proj.githubUrl || ''} onChange={e => updateProject(proj.id, { githubUrl: e.target.value })} placeholder="https://github.com/..." className="h-12" type="url" /></div>
                    </div>
                    <div className="flex justify-end pt-2"><Button variant="ghost" size="sm" onClick={() => deleteProject(proj.id)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" />Remove</Button></div>
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
        original={originalDescription}
        improved={getImprovedDescription()}
        changes={result?.changes || []}
        suggestions={result?.suggestions}
        onApply={apply}
        onDiscard={discard}
        title="AI Project Enhancement"
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

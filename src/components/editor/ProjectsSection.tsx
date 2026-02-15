import { memo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Rocket, Calendar, Link, Github, X, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Project } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

export const ProjectsSection = memo(function ProjectsSection() {
  const projects = useResumeStore(state => state.currentResume?.projects) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [techInput, setTechInput] = useState('');

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
                    <div>
                      <Label className="text-sm mb-2">Technologies</Label>
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
                    <div><Label className="text-sm mb-2">Description</Label><Textarea value={proj.description} onChange={e => updateProject(proj.id, { description: e.target.value })} placeholder="Describe the project..." className="min-h-[100px] resize-none text-base" /></div>
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
    </div>
  );
});

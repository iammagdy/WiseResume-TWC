import { memo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Heart, Calendar, Building2, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Volunteering } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

export const VolunteeringSection = memo(function VolunteeringSection() {
  const volunteering = useResumeStore(state => state.currentResume?.volunteering) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addEntry = () => { haptics.light(); const n: Volunteering = { id: uuidv4(), organization: '', role: '', startDate: '', endDate: '', description: '' }; updateResume({ volunteering: [...volunteering, n] }); setExpandedId(n.id); };
  const updateEntry = (id: string, u: Partial<Volunteering>) => { updateResume({ volunteering: volunteering.map(v => v.id === id ? { ...v, ...u } : v) }); };
  const deleteEntry = (id: string) => { haptics.light(); updateResume({ volunteering: volunteering.filter(v => v.id !== id) }); };

  const moveUp = (index: number) => { if (index === 0) return; haptics.light(); const arr = [...volunteering]; [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]; updateResume({ volunteering: arr }); };
  const moveDown = (index: number) => { if (index >= volunteering.length - 1) return; haptics.light(); const arr = [...volunteering]; [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]; updateResume({ volunteering: arr }); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={addEntry} className="gap-2 active:scale-95 transition-transform"><Plus className="w-4 h-4" />Add</Button></div>
      {volunteering.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><Heart className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Add your volunteering experience</p></div>
      ) : (
        <div className="space-y-3">
          {volunteering.map((vol, i) => (
            <div key={vol.id} className="rounded-xl border border-border overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === vol.id ? null : vol.id)} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 touch-manipulation active:bg-muted/70 min-h-[72px]">
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); moveUp(i); }} disabled={i === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); moveDown(i); }} disabled={i === volunteering.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-left flex-1 min-w-0 px-3"><p className="font-semibold text-sm truncate">{vol.role || `Volunteer ${i + 1}`}</p><p className="text-sm text-muted-foreground truncate">{vol.organization || 'Organization'}</p></div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">{expandedId === vol.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}</div>
              </button>
              {expandedId === vol.id && (
                <div className="animate-in fade-in-0 duration-200"><div className="p-4 pt-0 space-y-4 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Building2 className="w-4 h-4" />Organization</Label><Input value={vol.organization} onChange={e => updateEntry(vol.id, { organization: e.target.value })} placeholder="Organization Name" className="h-12" /></div>
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Heart className="w-4 h-4" />Role</Label><Input value={vol.role} onChange={e => updateEntry(vol.id, { role: e.target.value })} placeholder="Volunteer Role" className="h-12" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />Start Date</Label><Input value={vol.startDate} onChange={e => updateEntry(vol.id, { startDate: e.target.value })} placeholder="Jan 2023" className="h-12" /></div>
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />End Date</Label><Input value={vol.endDate} onChange={e => updateEntry(vol.id, { endDate: e.target.value })} placeholder="Present" className="h-12" /></div>
                  </div>
                  <div><Label className="text-sm mb-2">Description</Label><Textarea value={vol.description} onChange={e => updateEntry(vol.id, { description: e.target.value })} placeholder="Describe your impact..." className="min-h-[100px] resize-none text-base" /></div>
                  <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Clock className="w-4 h-4" />Hours (optional)</Label><Input value={vol.hours || ''} onChange={e => updateEntry(vol.id, { hours: e.target.value })} placeholder="200+" className="h-12" /></div>
                  <div className="flex justify-end pt-2"><Button variant="ghost" size="sm" onClick={() => deleteEntry(vol.id)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" />Remove</Button></div>
                </div></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

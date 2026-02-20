import { memo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Users, Mail, Phone, Building2, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useResumeStore } from '@/store/resumeStore';
import { Reference } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

export const ReferencesSection = memo(function ReferencesSection() {
  const references = useResumeStore(state => state.currentResume?.references) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addRef = () => { haptics.light(); const n: Reference = { id: uuidv4(), name: '', title: '', company: '', email: '', phone: '', relationship: '', availableOnRequest: false }; updateResume({ references: [...references, n] }); setExpandedId(n.id); };
  const updateRef = (id: string, u: Partial<Reference>) => { updateResume({ references: references.map(r => r.id === id ? { ...r, ...u } : r) }); };
  const deleteRef = (id: string) => { haptics.light(); updateResume({ references: references.filter(r => r.id !== id) }); };

  const moveUp = (index: number) => { if (index === 0) return; haptics.light(); const arr = [...references]; [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]; updateResume({ references: arr }); };
  const moveDown = (index: number) => { if (index >= references.length - 1) return; haptics.light(); const arr = [...references]; [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]; updateResume({ references: arr }); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={addRef} className="gap-2 active:scale-95 transition-transform"><Plus className="w-4 h-4" />Add</Button></div>
      {references.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Add professional references</p></div>
      ) : (
        <div className="space-y-3">
          {references.map((ref, i) => (
            <div key={ref.id} className="rounded-xl border border-border overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 touch-manipulation active:bg-muted/70 min-h-[72px]">
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); moveUp(i); }} disabled={i === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); moveDown(i); }} disabled={i === references.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-left flex-1 min-w-0 px-3"><p className="font-semibold text-sm truncate">{ref.name || `Reference ${i + 1}`}</p><p className="text-sm text-muted-foreground truncate">{ref.title ? `${ref.title} at ${ref.company}` : 'Title & Company'}</p></div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">{expandedId === ref.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}</div>
              </button>
              {expandedId === ref.id && (
                <div className="animate-in fade-in-0 duration-200"><div className="p-4 pt-0 space-y-4 border-t border-border">
                  <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Users className="w-4 h-4" />Full Name</Label><Input value={ref.name} onChange={e => updateRef(ref.id, { name: e.target.value })} placeholder="John Doe" className="h-12" /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-sm mb-2">Title</Label><Input value={ref.title} onChange={e => updateRef(ref.id, { title: e.target.value })} placeholder="Senior Manager" className="h-12" /></div>
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Building2 className="w-4 h-4" />Company</Label><Input value={ref.company} onChange={e => updateRef(ref.id, { company: e.target.value })} placeholder="Company Name" className="h-12" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Mail className="w-4 h-4" />Email</Label><Input value={ref.email} onChange={e => updateRef(ref.id, { email: e.target.value })} placeholder="john@company.com" className="h-12" type="email" /></div>
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Phone className="w-4 h-4" />Phone</Label><Input value={ref.phone} onChange={e => updateRef(ref.id, { phone: e.target.value })} placeholder="+1 234 567 890" className="h-12" type="tel" /></div>
                  </div>
                  <div><Label className="text-sm mb-2">Relationship</Label><Input value={ref.relationship} onChange={e => updateRef(ref.id, { relationship: e.target.value })} placeholder="Direct Supervisor" className="h-12" /></div>
                  <div className="flex items-center gap-3 py-1"><Switch checked={ref.availableOnRequest || false} onCheckedChange={checked => updateRef(ref.id, { availableOnRequest: checked })} /><Label className="text-sm">Available upon request</Label></div>
                  <div className="flex justify-end pt-2"><Button variant="ghost" size="sm" onClick={() => deleteRef(ref.id)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" />Remove</Button></div>
                </div></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

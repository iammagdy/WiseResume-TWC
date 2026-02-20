import { memo, useState } from 'react';
import { Plus, Trash2, Palette, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useResumeStore } from '@/store/resumeStore';
import { Hobby } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

export const HobbiesSection = memo(function HobbiesSection() {
  const hobbies = useResumeStore(state => state.currentResume?.hobbies) || [];
  const updateResume = useResumeStore(state => state.updateResume);

  const addHobby = () => { haptics.light(); const n: Hobby = { id: uuidv4(), name: '', visible: true }; updateResume({ hobbies: [...hobbies, n] }); };
  const updateHobby = (id: string, u: Partial<Hobby>) => { updateResume({ hobbies: hobbies.map(h => h.id === id ? { ...h, ...u } : h) }); };
  const deleteHobby = (id: string) => { haptics.light(); updateResume({ hobbies: hobbies.filter(h => h.id !== id) }); };

  const moveUp = (index: number) => { if (index === 0) return; haptics.light(); const arr = [...hobbies]; [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]; updateResume({ hobbies: arr }); };
  const moveDown = (index: number) => { if (index >= hobbies.length - 1) return; haptics.light(); const arr = [...hobbies]; [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]; updateResume({ hobbies: arr }); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={addHobby} className="gap-2 active:scale-95 transition-transform"><Plus className="w-4 h-4" />Add</Button></div>
      {hobbies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><Palette className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Add your hobbies & interests</p></div>
      ) : (
        <div className="space-y-3">
          {hobbies.map((hobby, index) => (
            <div key={hobby.id} className="rounded-xl border border-border p-4 space-y-3 transition-transform duration-200">
              <div className="flex items-center gap-2">
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveUp(index)} disabled={index === 0} className="p-2 rounded hover:bg-muted disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation" aria-label="Move up"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => moveDown(index)} disabled={index === hobbies.length - 1} className="p-2 rounded hover:bg-muted disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation" aria-label="Move down"><ArrowDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <Input value={hobby.name} onChange={e => updateHobby(hobby.id, { name: e.target.value })} placeholder="Photography, Hiking, etc." className="h-12" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updateHobby(hobby.id, { visible: !hobby.visible })} className="p-2 rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={hobby.visible ? 'Hide' : 'Show'}>
                    {hobby.visible ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteHobby(hobby.id)} className="p-2 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Remove">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
              <Textarea value={hobby.description || ''} onChange={e => updateHobby(hobby.id, { description: e.target.value })} placeholder="Brief description (optional)" className="min-h-[60px] resize-none text-base" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

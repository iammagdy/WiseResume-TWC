import { memo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Trophy, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Award } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

export const AwardsSection = memo(function AwardsSection() {
  const awards = useResumeStore(state => state.currentResume?.awards) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addAward = () => {
    haptics.light();
    const newAward: Award = {
      id: uuidv4(),
      title: '',
      issuer: '',
      date: '',
      description: '',
    };
    updateResume({ awards: [...awards, newAward] });
    setExpandedId(newAward.id);
  };

  const updateAward = (id: string, updates: Partial<Award>) => {
    updateResume({
      awards: awards.map(a => a.id === id ? { ...a, ...updates } : a),
    });
  };

  const deleteAward = (id: string) => {
    haptics.light();
    updateResume({ awards: awards.filter(a => a.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={addAward} className="gap-2 active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {awards.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Add your awards and achievements</p>
        </div>
      ) : (
        <div className="space-y-3">
          {awards.map((award, index) => (
            <div key={award.id} className="rounded-xl border border-border overflow-hidden transition-all duration-200">
              <button
                onClick={() => setExpandedId(expandedId === award.id ? null : award.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors touch-manipulation active:bg-muted/70 min-h-[72px]"
              >
                <div className="text-left flex-1 min-w-0 pr-3">
                  <p className="font-semibold text-sm truncate">{award.title || `Award ${index + 1}`}</p>
                  <p className="text-sm text-muted-foreground truncate">{award.issuer || 'Issuing organization'}</p>
                </div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted">
                  {expandedId === award.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </button>

              {expandedId === award.id && (
                <div className="animate-in fade-in-0 duration-200">
                  <div className="p-4 pt-0 space-y-4 border-t border-border">
                    <div>
                      <Label className="text-sm flex items-center gap-1.5 mb-2"><Trophy className="w-4 h-4" />Award Title</Label>
                      <Input value={award.title} onChange={e => updateAward(award.id, { title: e.target.value })} placeholder="Best Innovation Award" className="h-12" />
                    </div>
                    <div>
                      <Label className="text-sm flex items-center gap-1.5 mb-2"><Building2 className="w-4 h-4" />Issuing Organization</Label>
                      <Input value={award.issuer} onChange={e => updateAward(award.id, { issuer: e.target.value })} placeholder="Company or Organization" className="h-12" />
                    </div>
                    <div>
                      <Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />Date Received</Label>
                      <Input value={award.date} onChange={e => updateAward(award.id, { date: e.target.value })} placeholder="2024" className="h-12" />
                    </div>
                    <div>
                      <Label className="text-sm mb-2">Description (optional)</Label>
                      <Textarea value={award.description || ''} onChange={e => updateAward(award.id, { description: e.target.value })} placeholder="Brief description of the award..." className="min-h-[80px] resize-none text-base" />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button variant="ghost" size="sm" onClick={() => deleteAward(award.id)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />Remove
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

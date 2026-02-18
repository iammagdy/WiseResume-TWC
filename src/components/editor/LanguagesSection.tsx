import { memo } from 'react';
import { Plus, Trash2, Globe, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Language } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

const PROFICIENCY_OPTIONS: { value: Language['proficiency']; label: string }[] = [
  { value: 'native', label: 'Native' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'professional', label: 'Professional' },
  { value: 'basic', label: 'Basic' },
];

export const LanguagesSection = memo(function LanguagesSection() {
  const languages = useResumeStore(state => state.currentResume?.languages) || [];
  const updateResume = useResumeStore(state => state.updateResume);

  const addLanguage = () => {
    haptics.light();
    const n: Language = { id: uuidv4(), name: '', proficiency: 'professional' };
    updateResume({ languages: [...languages, n] });
  };

  const updateLang = (id: string, u: Partial<Language>) => {
    updateResume({ languages: languages.map(l => l.id === id ? { ...l, ...u } : l) });
  };

  const deleteLang = (id: string) => {
    haptics.light();
    updateResume({ languages: languages.filter(l => l.id !== id) });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    haptics.light();
    const arr = [...languages];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    updateResume({ languages: arr });
  };

  const moveDown = (index: number) => {
    if (index >= languages.length - 1) return;
    haptics.light();
    const arr = [...languages];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    updateResume({ languages: arr });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={addLanguage} className="gap-2 active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />Add
        </Button>
      </div>

      {languages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Add languages you speak</p>
        </div>
      ) : (
        <div className="space-y-3">
          {languages.map((lang, index) => (
            <div key={lang.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveUp(index)} disabled={index === 0} className="p-2 rounded hover:bg-muted disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation" aria-label="Move up"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => moveDown(index)} disabled={index === languages.length - 1} className="p-2 rounded hover:bg-muted disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation" aria-label="Move down"><ArrowDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <Input value={lang.name} onChange={e => updateLang(lang.id, { name: e.target.value })} placeholder="English, Spanish, etc." className="h-12" />
                </div>
                <button onClick={() => deleteLang(lang.id)} className="p-2 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Remove">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
              <div>
                <Label className="text-sm mb-2">Proficiency</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {PROFICIENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { haptics.light(); updateLang(lang.id, { proficiency: opt.value }); }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 touch-manipulation min-h-[44px] ${
                        lang.proficiency === opt.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

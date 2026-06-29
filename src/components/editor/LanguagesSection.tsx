import { memo } from 'react';
import { Plus, Trash2, Globe, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Language } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';
import { useLocale } from '@/i18n/LocaleProvider';

const PROFICIENCY_OPTIONS: { value: Language['proficiency'] }[] = [
  { value: 'native' },
  { value: 'fluent' },
  { value: 'professional' },
  { value: 'basic' },
];

export const LanguagesSection = memo(function LanguagesSection() {
  const languages = useResumeStore(state => state.currentResume?.languages) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const { t } = useLocale();

  const getProficiencyLabel = (val: Language['proficiency']) => {
    switch (val) {
      case 'native': return t('editor.languages.native', 'Native');
      case 'fluent': return t('editor.languages.fluent', 'Fluent');
      case 'professional': return t('editor.languages.professional', 'Professional');
      case 'basic': return t('editor.languages.basic', 'Basic');
      default: return val;
    }
  };

  const addLanguage = () => {
    haptics.light();
    const n: Language = { id: uuidv4(), name: '', proficiency: 'professional' };
    updateResume({ languages: [n, ...languages] });
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
          <Plus className="w-4 h-4" />
          {t('common.add', 'Add')}
        </Button>
      </div>

      {languages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('editor.languages.emptyTip', 'Add languages you speak')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {languages.map((lang, index) => (
            <div key={lang.id} className="rounded-xl border border-border p-4 space-y-3 transition-transform duration-200">
              <div className="flex items-center gap-2">
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-2 rounded hover:bg-muted disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation"
                    aria-label={t('common.moveUp', 'Move up')}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === languages.length - 1}
                    className="p-2 rounded hover:bg-muted disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation"
                    aria-label={t('common.moveDown', 'Move down')}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    value={lang.name}
                    onChange={e => updateLang(lang.id, { name: e.target.value })}
                    placeholder={t('editor.languages.namePlaceholder', 'English, Spanish, etc.')}
                    className="h-12"
                    aria-label={t('editor.sections.languages', 'Languages')}
                  />
                </div>
                <button
                  onClick={() => deleteLang(lang.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={t('common.delete', 'Delete')}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
              <div>
                <Label className="text-sm mb-2">{t('editor.languages.proficiencyLabel', 'Proficiency')}</Label>
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
                      {getProficiencyLabel(opt.value)}
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

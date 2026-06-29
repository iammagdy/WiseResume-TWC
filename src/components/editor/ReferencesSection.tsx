import { memo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Users, Mail, Phone, Building2, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useResumeStore } from '@/store/resumeStore';
import { useExpandedEntryRestore } from '@/hooks/useExpandedEntryRestore';
import { Reference } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';
import { useLocale } from '@/i18n/LocaleProvider';

export const ReferencesSection = memo(function ReferencesSection() {
  const references = useResumeStore(state => state.currentResume?.references) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const [expandedId, setExpandedId] = useExpandedEntryRestore('references');
  const { t } = useLocale();

  const addRef = () => {
    haptics.light();
    const n: Reference = { id: uuidv4(), name: '', title: '', company: '', email: '', phone: '', relationship: '', availableOnRequest: false };
    updateResume({ references: [n, ...references] });
    setExpandedId(n.id);
  };

  const updateRef = (id: string, u: Partial<Reference>) => {
    updateResume({ references: references.map(r => r.id === id ? { ...r, ...u } : r) });
  };

  const deleteRef = (id: string) => {
    haptics.light();
    updateResume({ references: references.filter(r => r.id !== id) });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    haptics.light();
    const arr = [...references];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    updateResume({ references: arr });
  };

  const moveDown = (index: number) => {
    if (index >= references.length - 1) return;
    haptics.light();
    const arr = [...references];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    updateResume({ references: arr });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={addRef} className="gap-2 active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
          {t('common.add', 'Add')}
        </Button>
      </div>

      {references.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('editor.references.emptyTip', 'Add professional references')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {references.map((ref, i) => (
            <div key={ref.id} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted touch-manipulation active:bg-muted/70 min-h-[72px]"
              >
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); moveUp(i); }}
                    disabled={i === 0}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
                    aria-label={t('common.moveUp', 'Move up')}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); moveDown(i); }}
                    disabled={i === references.length - 1}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
                    aria-label={t('common.moveDown', 'Move down')}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-left flex-1 min-w-0 px-3">
                  <p className="font-semibold text-sm truncate">{ref.name || t('editor.references.nameDefault', 'Reference {{index}}', { index: i + 1 })}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {ref.title
                      ? t('editor.references.titleAtCompany', '{{title}} at {{company}}', { title: ref.title, company: ref.company })
                      : t('editor.references.titleCompanyDefault', 'Title & Company')}
                  </p>
                </div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                  {expandedId === ref.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </button>

              {expandedId === ref.id && (
                <div className="animate-in fade-in-0 duration-200">
                  <div className="p-4 pt-0 space-y-4 border-t border-border">
                    <div>
                      <Label htmlFor={`ref-${ref.id}-name`} className="text-sm flex items-center gap-1.5 mb-2">
                        <Users className="w-4 h-4" />
                        {t('editor.references.nameLabel', 'Full Name')}
                      </Label>
                      <Input
                        id={`ref-${ref.id}-name`}
                        value={ref.name}
                        onChange={e => updateRef(ref.id, { name: e.target.value })}
                        placeholder={t('editor.references.namePlaceholder', 'John Doe')}
                        className="h-12"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`ref-${ref.id}-title`} className="text-sm mb-2">
                          {t('editor.references.titleLabel', 'Title')}
                        </Label>
                        <Input
                          id={`ref-${ref.id}-title`}
                          value={ref.title}
                          onChange={e => updateRef(ref.id, { title: e.target.value })}
                          placeholder={t('editor.references.titlePlaceholder', 'Senior Manager')}
                          className="h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ref-${ref.id}-company`} className="text-sm flex items-center gap-1.5 mb-2">
                          <Building2 className="w-4 h-4" />
                          {t('editor.references.companyLabel', 'Company')}
                        </Label>
                        <Input
                          id={`ref-${ref.id}-company`}
                          value={ref.company}
                          onChange={e => updateRef(ref.id, { company: e.target.value })}
                          placeholder={t('editor.references.companyPlaceholder', 'Company Name')}
                          className="h-12"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`ref-${ref.id}-email`} className="text-sm flex items-center gap-1.5 mb-2">
                          <Mail className="w-4 h-4" />
                          {t('editor.references.emailLabel', 'Email')}
                        </Label>
                        <Input
                          id={`ref-${ref.id}-email`}
                          value={ref.email}
                          onChange={e => updateRef(ref.id, { email: e.target.value })}
                          placeholder={t('editor.references.emailPlaceholder', 'john@company.com')}
                          className="h-12"
                          type="email"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ref-${ref.id}-phone`} className="text-sm flex items-center gap-1.5 mb-2">
                          <Phone className="w-4 h-4" />
                          {t('editor.references.phoneLabel', 'Phone')}
                        </Label>
                        <Input
                          id={`ref-${ref.id}-phone`}
                          value={ref.phone}
                          onChange={e => updateRef(ref.id, { phone: e.target.value })}
                          placeholder={t('editor.references.phonePlaceholder', '+1 234 567 890')}
                          className="h-12"
                          type="tel"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`ref-${ref.id}-relationship`} className="text-sm mb-2">
                        {t('editor.references.relationshipLabel', 'Relationship')}
                      </Label>
                      <Input
                        id={`ref-${ref.id}-relationship`}
                        value={ref.relationship}
                        onChange={e => updateRef(ref.id, { relationship: e.target.value })}
                        placeholder={t('editor.references.relationshipPlaceholder', 'Direct Supervisor')}
                        className="h-12"
                      />
                    </div>
                    <div className="flex items-center gap-3 py-1">
                      <Switch
                        checked={ref.availableOnRequest || false}
                        onCheckedChange={checked => updateRef(ref.id, { availableOnRequest: checked })}
                      />
                      <Label className="text-sm">{t('editor.references.availableOnRequestSwitch', 'Available upon request')}</Label>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRef(ref.id)}
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
    </div>
  );
});

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Rocket, BookOpen, Heart, Palette, Users, Award, Globe } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import haptics from '@/lib/haptics';
import { useLocale } from '@/i18n/LocaleProvider';

interface AddSectionSheetProps {
  onSelectSection: (section: string) => void;
}

const OPTIONAL_SECTION_IDS = [
  { id: 'awards',          icon: Trophy, color: 'text-amber-500' },
  { id: 'projects',        icon: Rocket, color: 'text-blue-500' },
  { id: 'certifications',  icon: Award,  color: 'text-orange-500' },
  { id: 'publications',    icon: BookOpen, color: 'text-emerald-500' },
  { id: 'volunteering',    icon: Heart,  color: 'text-rose-500' },
  { id: 'languages',       icon: Globe,  color: 'text-cyan-500' },
  { id: 'hobbies',         icon: Palette, color: 'text-purple-500' },
  { id: 'references',      icon: Users,  color: 'text-sky-500' },
] as const;

export const AddSectionSheet = memo(function AddSectionSheet({ onSelectSection }: AddSectionSheetProps) {
  const currentResume = useResumeStore(state => state.currentResume);
  const prefersReduced = useReducedMotion();
  const { t } = useLocale();

  const getCount = (sectionId: string): number => {
    if (!currentResume) return 0;
    const data = currentResume[sectionId as keyof typeof currentResume];
    return Array.isArray(data) ? data.length : 0;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {OPTIONAL_SECTION_IDS.map((section, index) => {
          const Icon = section.icon;
          const count = getCount(section.id);
          const active = count > 0;
          return (
            <motion.button
              key={section.id}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              onClick={() => {
                haptics.light();
                onSelectSection(section.id);
              }}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all touch-manipulation active:scale-95 min-h-[100px] ${
                active
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted'
              }`}
            >
              {active && (
                <span className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">{count}</span>
                </span>
              )}
              <Icon className={`w-6 h-6 ${section.color}`} />
              <span className="text-sm font-medium">{t(`editor.sections.${section.id}`, section.id)}</span>
              <span className="text-[11px] text-muted-foreground text-center leading-tight">
                {t(`editor.addSection.${section.id}Desc`, '')}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

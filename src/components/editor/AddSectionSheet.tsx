import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Rocket, BookOpen, Heart, Palette, Users, Check, Award, Globe } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import haptics from '@/lib/haptics';

interface AddSectionSheetProps {
  onSelectSection: (section: string) => void;
}

const OPTIONAL_SECTIONS = [
  { id: 'awards', label: 'Awards', icon: Trophy, description: 'Awards & achievements', color: 'text-amber-500' },
  { id: 'projects', label: 'Projects', icon: Rocket, description: 'Personal & work projects', color: 'text-blue-500' },
  { id: 'certifications', label: 'Certifications', icon: Award, description: 'Licenses & credentials', color: 'text-orange-500' },
  { id: 'publications', label: 'Publications', icon: BookOpen, description: 'Papers & articles', color: 'text-emerald-500' },
  { id: 'volunteering', label: 'Volunteering', icon: Heart, description: 'Community service', color: 'text-rose-500' },
  { id: 'languages', label: 'Languages', icon: Globe, description: 'Languages you speak', color: 'text-cyan-500' },
  { id: 'hobbies', label: 'Hobbies', icon: Palette, description: 'Interests & hobbies', color: 'text-purple-500' },
  { id: 'references', label: 'References', icon: Users, description: 'Professional references', color: 'text-sky-500' },
] as const;

export const AddSectionSheet = memo(function AddSectionSheet({ onSelectSection }: AddSectionSheetProps) {
  const currentResume = useResumeStore(state => state.currentResume);
  const prefersReduced = useReducedMotion();

  const getCount = (sectionId: string): number => {
    if (!currentResume) return 0;
    const data = currentResume[sectionId as keyof typeof currentResume];
    return Array.isArray(data) ? data.length : 0;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add optional sections to enhance your resume</p>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONAL_SECTIONS.map((section, index) => {
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
                  : 'border-border hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              {active && (
                <span className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">{count}</span>
                </span>
              )}
              <Icon className={`w-6 h-6 ${section.color}`} />
              <span className="text-sm font-medium">{section.label}</span>
              <span className="text-[11px] text-muted-foreground text-center leading-tight">{section.description}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

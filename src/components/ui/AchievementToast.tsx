import { toast } from '@/components/ui/sonner';
import { useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  xp: number;
}

export function showAchievementToast(achievement: AchievementDef) {
  const Icon = achievement.icon;
  toast.custom(
    () => (
      <div className="bg-card border border-border rounded-2xl px-[18px] py-[14px] shadow-lg flex items-center gap-3 min-w-[260px]">
        <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-0.5">
            Achievement Unlocked
          </div>
          <div className="text-sm font-semibold text-foreground leading-tight">{achievement.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">+{achievement.xp} XP</div>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}

/** Hook to detect newly unlocked achievements and fire celebrations. */
export function useAchievementCelebration(
  earnedIds: string[],
  achievements: AchievementDef[],
  prevIdsRef: React.MutableRefObject<string[]>,
) {
  const shouldReduceMotion = useReducedMotion();
  const newlyEarned = earnedIds.filter(id => !prevIdsRef.current.includes(id));
  if (newlyEarned.length > 0 && !shouldReduceMotion) {
    newlyEarned.forEach(id => {
      const def = achievements.find(a => a.id === id);
      if (def) showAchievementToast(def);
    });
  }
  prevIdsRef.current = earnedIds;
}

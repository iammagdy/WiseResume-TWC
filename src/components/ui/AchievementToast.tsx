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
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(251,191,36,0.35)',
          borderRadius: '16px',
          padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(251,191,36,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '260px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(251,191,36,0.15)',
            border: '1px solid rgba(251,191,36,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} style={{ color: '#fbbf24' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#fbbf24', textTransform: 'uppercase', marginBottom: '2px' }}>
            Achievement Unlocked
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.2 }}>{achievement.title}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>+{achievement.xp} XP</div>
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

import { Sparkles, Target, Wand2, Mic, PenTool, BarChart3 } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

const ITEMS = [
  { icon: Sparkles, label: 'AI Resume Writing', color: '#4F46E5' },
  { icon: Target, label: 'ATS Score Analysis', color: '#10B981' },
  { icon: Wand2, label: 'Smart Tailoring', color: '#3B82F6' },
  { icon: Mic, label: 'Interview Coaching', color: '#F97316' },
  { icon: PenTool, label: 'Cover Letters', color: '#A855F7' },
  { icon: BarChart3, label: 'Application Tracker', color: '#EC4899' },
];

interface FeatureTickerProps {
  lpMode?: boolean;
}

const Dot = ({ lpMode }: { lpMode?: boolean }) => (
  <span
    className="mx-6 flex-shrink-0"
    style={{
      width: 4,
      height: 4,
      borderRadius: '50%',
      background: lpMode ? 'rgba(26,26,46,0.18)' : 'hsl(var(--border))',
    }}
    aria-hidden="true"
  />
);

export function FeatureTicker({ lpMode }: FeatureTickerProps) {
  const prefersReducedMotion = useReducedMotion();

  const bgFade = lpMode ? '#F5F0EB' : 'hsl(var(--background))';
  const textColor = lpMode ? 'rgba(26,26,46,0.7)' : undefined;

  if (prefersReducedMotion) {
    return (
      <div className="flex items-center justify-center gap-6 flex-wrap py-5 px-4">
        {ITEMS.map(({ icon: Icon, label, color }) => (
          <span key={label} className="flex items-center gap-2 text-sm" style={{ color: textColor ?? 'hsl(var(--muted-foreground))' }}>
            <Icon className="w-4 h-4" style={{ color }} />
            {label}
          </span>
        ))}
      </div>
    );
  }

  const allItems = [...ITEMS, ...ITEMS];

  return (
    <div
      className="relative overflow-hidden py-5 group select-none"
      aria-label="Features overview"
      tabIndex={0}
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        {allItems.map(({ icon: Icon, label, color }, i) => (
          <span
            key={i}
            className="flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            style={{ color: textColor ?? 'hsl(var(--muted-foreground))' }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            {label}
            <Dot lpMode={lpMode} />
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10"
        style={{ background: `linear-gradient(to right, ${bgFade}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
        style={{ background: `linear-gradient(to left, ${bgFade}, transparent)` }}
      />
    </div>
  );
}

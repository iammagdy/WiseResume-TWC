import { Sparkles, Target, Wand2, Mic, PenTool, BarChart3 } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

const ITEMS = [
  { icon: Sparkles, label: 'AI Resume Writing', color: '#818CF8' },
  { icon: Target, label: 'ATS Score Analysis', color: '#34D399' },
  { icon: Wand2, label: 'Smart Tailoring', color: '#60A5FA' },
  { icon: Mic, label: 'Interview Coaching', color: '#FB923C' },
  { icon: PenTool, label: 'Cover Letters', color: '#C084FC' },
  { icon: BarChart3, label: 'Application Tracker', color: '#F472B6' },
];

interface FeatureTickerProps {
  lpMode?: boolean;
}

const Dot = () => (
  <span
    className="mx-6 flex-shrink-0"
    style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--lp-border, rgba(255,255,255,0.12))' }}
    aria-hidden="true"
  />
);

export function FeatureTicker({ lpMode }: FeatureTickerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div
        className="flex items-center justify-center gap-6 flex-wrap py-5 px-4"
        style={{ background: lpMode ? 'var(--lp-bg)' : 'hsl(var(--background))' }}
      >
        {ITEMS.map(({ icon: Icon, label, color }) => (
          <span
            key={label}
            className="flex items-center gap-2 text-sm"
            style={{ color: lpMode ? 'var(--lp-text-subtle)' : 'hsl(var(--muted-foreground))' }}
          >
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
      style={{
        background: lpMode ? 'var(--lp-bg)' : 'hsl(var(--background))',
        transition: 'background 0.3s ease',
      }}
      aria-label="Features overview"
      tabIndex={0}
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        {allItems.map(({ icon: Icon, label, color }, i) => (
          <span
            key={i}
            className="flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            style={{ color: lpMode ? 'var(--lp-text-subtle)' : 'hsl(var(--muted-foreground))' }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            {label}
            <Dot />
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
        style={{
          background: lpMode
            ? 'linear-gradient(to right, var(--lp-ticker-edge), transparent)'
            : 'linear-gradient(to right, hsl(var(--background)), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
        style={{
          background: lpMode
            ? 'linear-gradient(to left, var(--lp-ticker-edge), transparent)'
            : 'linear-gradient(to left, hsl(var(--background)), transparent)',
        }}
      />
    </div>
  );
}

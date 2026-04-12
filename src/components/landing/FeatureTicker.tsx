import { Sparkles, Target, Wand2, Mic, PenTool, BarChart3 } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

const ITEMS = [
  { icon: Sparkles, label: 'AI Resume Writing', color: 'text-primary' },
  { icon: Target, label: 'ATS Score Analysis', color: 'text-emerald-500' },
  { icon: Wand2, label: 'Smart Tailoring', color: 'text-blue-500' },
  { icon: Mic, label: 'Interview Coaching', color: 'text-orange-500' },
  { icon: PenTool, label: 'Cover Letters', color: 'text-purple-500' },
  { icon: BarChart3, label: 'Application Tracker', color: 'text-pink-500' },
];

const Dot = () => (
  <span className="mx-6 w-1 h-1 rounded-full bg-border flex-shrink-0" aria-hidden="true" />
);

export function FeatureTicker() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className="flex items-center justify-center gap-6 flex-wrap py-5 px-4">
        {ITEMS.map(({ icon: Icon, label, color }) => (
          <span key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className={`w-4 h-4 ${color}`} />
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
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap"
          >
            <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
            {label}
            <Dot />
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10"
        style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
        style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }}
      />
    </div>
  );
}

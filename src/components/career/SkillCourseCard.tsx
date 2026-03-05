import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SkillGap } from '@/lib/careerPath';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Code2, ExternalLink, GraduationCap, Info, Search, Youtube } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { findCuratedCourses, CuratedCourse } from '@/lib/curatedCourses';
import { useMemo } from 'react';

interface Props {
  gap: SkillGap;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

const priorityConfig = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle, label: 'Critical' },
  important: { color: 'text-warning', bg: 'bg-warning/10', icon: Info, label: 'Important' },
  'nice-to-have': { color: 'text-muted-foreground', bg: 'bg-muted', icon: CheckCircle2, label: 'Nice to Have' },
};

const platformConfig = {
  youtube: { icon: Youtube, label: 'YouTube', className: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30' },
  coursera: { icon: GraduationCap, label: 'Coursera', className: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30' },
  freecodecamp: { icon: Code2, label: 'freeCodeCamp', className: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
};

async function openUrl(url: string) {
  haptics.light();
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    try {
      window.top?.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}

function CuratedCourseLink({ course }: { course: CuratedCourse }) {
  const platform = platformConfig[course.platform];
  const Icon = platform.icon;

  return (
    <button
      onClick={() => openUrl(course.url)}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors touch-manipulation active:scale-[0.98]',
        platform.className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs font-medium flex-1 min-w-0 truncate">{course.title}</span>
      {course.duration && (
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0">{course.duration}</Badge>
      )}
      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
    </button>
  );
}

export function SkillCourseCard({ gap, isCompleted, onToggleComplete }: Props) {
  const config = priorityConfig[gap.priority];
  const Icon = config.icon;
  const curatedCourses = useMemo(() => findCuratedCourses(gap.skill), [gap.skill]);

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(gap.youtubeQuery || `${gap.skill} full course free 2025`)}`;

  return (
    <div className={cn('rounded-xl border p-3 space-y-2 transition-all', isCompleted && 'opacity-60', config.bg)}>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => {
            haptics.success();
            onToggleComplete();
          }}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className={cn('w-3.5 h-3.5', config.color)} />
            <p className={cn('text-sm font-medium', isCompleted && 'line-through')}>{gap.skill}</p>
            <Badge variant="secondary" className="text-[10px]">{config.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{gap.suggestion}</p>
          {gap.forRoles.length > 0 && (
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Needed for: {gap.forRoles.join(', ')}
            </p>
          )}
        </div>
      </div>

      {curatedCourses.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Recommended Courses</p>
          {curatedCourses.map((course, i) => (
            <CuratedCourseLink key={i} course={course} />
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => openUrl(youtubeUrl)}
        className="w-full h-8 text-xs gap-1.5 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40"
      >
        <Search className="w-3.5 h-3.5" />
        {curatedCourses.length > 0 ? 'Search More on YouTube' : 'Find Free Courses'}
        <ExternalLink className="w-3 h-3 ml-auto" />
      </Button>
    </div>
  );
}

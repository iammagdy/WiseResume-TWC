import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SkillGap } from '@/lib/careerPath';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Youtube } from 'lucide-react';
import { haptics } from '@/lib/haptics';

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

export function SkillCourseCard({ gap, isCompleted, onToggleComplete }: Props) {
  const config = priorityConfig[gap.priority];
  const Icon = config.icon;

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

      <Button
        variant="outline"
        size="sm"
        asChild
        className="w-full h-8 text-xs gap-1.5 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40"
      >
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => haptics.light()}
        >
          <Youtube className="w-3.5 h-3.5" />
          Find Free Courses
          <ExternalLink className="w-3 h-3 ml-auto" />
        </a>
      </Button>
    </div>
  );
}

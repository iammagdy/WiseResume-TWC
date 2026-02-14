import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkillGap } from '@/lib/careerPath';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface Props {
  skillGaps: SkillGap[];
  currentSkills: string[];
}

const priorityConfig = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle, label: 'Critical' },
  important: { color: 'text-warning', bg: 'bg-warning/10', icon: Info, label: 'Important' },
  'nice-to-have': { color: 'text-muted-foreground', bg: 'bg-muted', icon: CheckCircle2, label: 'Nice to Have' },
};

export function SkillGapAnalyzer({ skillGaps, currentSkills }: Props) {
  const totalSkillsNeeded = skillGaps.length + currentSkills.length;
  const matchPercent = totalSkillsNeeded > 0 ? Math.round((currentSkills.length / totalSkillsNeeded) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Skill Gaps</CardTitle>
          <Badge variant="outline" className="text-xs">{matchPercent}% covered</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall bar */}
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full gradient-primary transition-all duration-500"
            style={{ width: `${matchPercent}%` }}
          />
        </div>

        {/* Gap list */}
        {skillGaps.map((gap, i) => {
          const config = priorityConfig[gap.priority];
          const Icon = config.icon;

          return (
            <div key={i} className={cn('rounded-xl p-3', config.bg)}>
              <div className="flex items-start gap-2">
                <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', config.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{gap.skill}</p>
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

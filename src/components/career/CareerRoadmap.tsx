import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp, Clock, Target, TrendingUp } from 'lucide-react';
import { CareerPathResult, ActionStep } from '@/lib/careerPath';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface Props {
  result: CareerPathResult;
  completedMilestones: string[];
  onToggleMilestone: (milestoneId: string) => void;
}

const TIMELINE = [
  { id: 'now', label: 'Now', icon: Target },
  { id: '3mo', label: '3 Months', icon: Clock },
  { id: '6mo', label: '6 Months', icon: Clock },
  { id: '1yr', label: '1 Year', icon: TrendingUp },
  { id: '3yr', label: '3 Years', icon: TrendingUp },
];

export function CareerRoadmap({ result, completedMilestones, onToggleMilestone }: Props) {
  const [expanded, setExpanded] = useState<string | null>('now');

  const completedCount = completedMilestones.length;
  const totalMilestones = TIMELINE.length;
  const progressPercent = Math.round((completedCount / totalMilestones) * 100);

  // Map action plan steps to timeline milestones
  const getMilestoneContent = (timelineId: string) => {
    const stepMap: Record<string, number[]> = {
      now: [0],
      '3mo': [1],
      '6mo': [2],
      '1yr': [3],
      '3yr': [4],
    };
    const indices = stepMap[timelineId] || [];
    return indices
      .map(i => result.actionPlan[i])
      .filter(Boolean);
  };

  const getNextRolesForTimeline = (timelineId: string) => {
    if (timelineId === 'now') return [];
    const roleIndex = TIMELINE.findIndex(t => t.id === timelineId) - 1;
    return result.nextRoles.slice(roleIndex, roleIndex + 1);
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full gradient-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{progressPercent}%</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-border" />

        <div className="space-y-3">
          {TIMELINE.map((milestone, index) => {
            const Icon = milestone.icon;
            const isExpanded = expanded === milestone.id;
            const isCompleted = completedMilestones.includes(milestone.id);
            const steps = getMilestoneContent(milestone.id);
            const roles = getNextRolesForTimeline(milestone.id);

            return (
              <Card key={milestone.id} className={cn('relative ml-10', isCompleted && 'opacity-70')}>
                {/* Timeline dot */}
                <div className={cn(
                  'absolute -left-[26px] top-4 w-4 h-4 rounded-full border-2 z-10',
                  isCompleted
                    ? 'bg-primary border-primary'
                    : 'bg-background border-muted-foreground/30'
                )} />

                <button
                  onClick={() => { haptics.selection(); setExpanded(isExpanded ? null : milestone.id); }}
                  className="w-full p-4 flex items-center gap-3 text-left touch-manipulation"
                >
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1 text-sm font-semibold">{milestone.label}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {/* Action steps */}
                    {steps.map((step, i) => (
                      <div key={i} className="flex gap-2">
                        <Badge variant={step.impact === 'high' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                          {step.impact}
                        </Badge>
                        <div>
                          <p className="text-sm">{step.action}</p>
                          <p className="text-xs text-muted-foreground">{step.timeframe}</p>
                        </div>
                      </div>
                    ))}

                    {/* Next roles */}
                    {roles.map((role, i) => (
                      <div key={i} className="glass-input rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{role.title}</p>
                          <Badge className="text-[10px]">{role.matchScore}% match</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Ready in: {role.timeToReady}</p>
                      </div>
                    ))}

                    {/* Mark complete */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Checkbox
                        id={`milestone-${milestone.id}`}
                        checked={isCompleted}
                        onCheckedChange={() => {
                          haptics.success();
                          onToggleMilestone(milestone.id);
                        }}
                      />
                      <label htmlFor={`milestone-${milestone.id}`} className="text-xs text-muted-foreground">
                        Mark as complete
                      </label>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

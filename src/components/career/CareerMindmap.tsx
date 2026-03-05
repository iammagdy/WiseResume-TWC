import { useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ZoomIn } from 'lucide-react';
import { CareerMap } from '@/lib/careerPath';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface Props {
  careerMap: CareerMap;
}

function getReadinessColor(timeframe: string): string {
  const lower = timeframe.toLowerCase();
  if (lower.includes('now') || lower.includes('ready') || lower.includes('1-3 month'))
    return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
  if (lower.includes('3') || lower.includes('6') || lower.includes('month'))
    return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30';
  return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
}

function getReadinessDot(timeframe: string): string {
  const lower = timeframe.toLowerCase();
  if (lower.includes('now') || lower.includes('ready') || lower.includes('1-3 month'))
    return 'bg-green-500';
  if (lower.includes('3') || lower.includes('6') || lower.includes('month'))
    return 'bg-amber-500';
  return 'bg-red-500';
}

export function CareerMindmap({ careerMap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return;
    haptics.medium();
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = 'career-mindmap.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Mindmap downloaded!');
    } catch {
      toast.error('Failed to download mindmap');
    }
  }, []);

  if (!careerMap) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-primary" />
            Career Mindmap
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 gap-1 text-xs">
            <Download className="w-3.5 h-3.5" />
            PNG
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <div ref={containerRef} className="min-w-[500px] py-4">
            {/* Current role - center */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="px-5 py-3 rounded-2xl gradient-primary text-primary-foreground text-center shadow-lg">
                  <p className="font-bold text-sm">{careerMap.current.title}</p>
                  <p className="text-[11px] opacity-80 capitalize">{careerMap.current.level} Level</p>
                </div>
                {/* Connecting line down */}
                <div className="absolute left-1/2 -translate-x-px bottom-0 translate-y-full w-0.5 h-6 bg-border" />
              </div>
            </div>

            {/* Branches */}
            <div className="space-y-4">
              {careerMap.branches.map((branch, bi) => (
                <div key={bi} className="relative">
                  {/* Branch label */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {branch.direction}
                    </p>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Roles in branch */}
                  <div className="flex gap-3 overflow-x-auto pb-2 pl-4">
                    {branch.roles.map((role, ri) => (
                      <div
                        key={ri}
                        className={cn(
                          'shrink-0 w-44 rounded-xl border p-3 space-y-2 transition-all',
                          getReadinessColor(role.timeframe)
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-semibold leading-tight">{role.title}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {role.matchScore}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={cn('w-1.5 h-1.5 rounded-full', getReadinessDot(role.timeframe))} />
                          <p className="text-[11px]">{role.timeframe}</p>
                        </div>
                        {role.requiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {role.requiredSkills.slice(0, 3).map((s, si) => (
                              <span key={si} className="text-[9px] px-1.5 py-0.5 rounded-full bg-background/50 border border-border/50">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">Readiness:</p>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-muted-foreground">Ready now</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-muted-foreground">3-6 months</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-muted-foreground">1+ year</span></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

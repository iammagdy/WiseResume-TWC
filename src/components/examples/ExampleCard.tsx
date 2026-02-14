import { memo } from 'react';
import { Eye, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/home/ProgressRing';
import { haptics } from '@/lib/haptics';
import type { ResumeExample } from '@/types/resumeExamples';

interface ExampleCardProps {
  example: ResumeExample;
  onView: (example: ResumeExample) => void;
  onUseTemplate: (example: ResumeExample) => void;
}

const levelLabels: Record<string, string> = {
  entry: 'Entry Level',
  mid: 'Mid-Level',
  senior: 'Senior',
  executive: 'Executive',
};

export const ExampleCard = memo(function ExampleCard({ example, onView, onUseTemplate }: ExampleCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-fluid-sm font-semibold text-foreground truncate">{example.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{example.description}</p>
          </div>
          <ProgressRing percent={example.atsScore} size={44} strokeWidth={3} />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {example.industry}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">
            {levelLabels[example.experienceLevel]}
          </span>
        </div>

        {/* Highlights */}
        <ul className="space-y-1">
          {example.highlights.map((h, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/60 shrink-0" />
              <span className="line-clamp-1">{h}</span>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 active:scale-95"
            onClick={() => { haptics.light(); onView(example); }}
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View
          </Button>
          <Button
            size="sm"
            className="flex-1 active:scale-95"
            onClick={() => { haptics.medium(); onUseTemplate(example); }}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Use
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/home/ProgressRing';
import { Sparkles, Lightbulb } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import type { ResumeExample } from '@/types/resumeExamples';

interface Props {
  example: ResumeExample | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (example: ResumeExample) => void;
  onGetIdeas: (example: ResumeExample) => void;
}

export function ExampleDetailSheet({ example, open, onOpenChange, onUseTemplate, onGetIdeas }: Props) {
  if (!example) return null;

  const { resumeData } = example;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <SheetTitle className="text-fluid-base">{example.title}</SheetTitle>
          <ProgressRing percent={example.atsScore} size={40} strokeWidth={3} />
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 min-h-0">
          {/* Summary */}
          {resumeData.summary && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary</h4>
              <p className="text-sm text-foreground leading-relaxed">{resumeData.summary}</p>
            </section>
          )}

          {/* Experience */}
          {resumeData.experience.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Experience</h4>
              <div className="space-y-3">
                {resumeData.experience.map(exp => (
                  <div key={exp.id} className="glass-surface rounded-xl p-3">
                    <p className="text-sm font-medium text-foreground">{exp.position}</p>
                    <p className="text-xs text-muted-foreground">{exp.company} · {exp.startDate} – {exp.current ? 'Present' : exp.endDate}</p>
                    {exp.achievements.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {exp.achievements.map((a, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {resumeData.skills.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {resumeData.skills.map((s, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full glass-surface text-foreground">{s}</span>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {resumeData.education.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Education</h4>
              {resumeData.education.map(edu => (
                <div key={edu.id} className="mb-2">
                  <p className="text-sm font-medium text-foreground">{edu.degree} in {edu.field}</p>
                  <p className="text-xs text-muted-foreground">{edu.institution} · {edu.startDate} – {edu.endDate}</p>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="border-t border-border px-4 py-3 pb-safe flex gap-2 bg-background/80 backdrop-blur-sm">
          <Button
            variant="outline"
            className="flex-1 active:scale-95"
            onClick={() => { haptics.light(); onGetIdeas(example); }}
          >
            <Lightbulb className="w-4 h-4 mr-1.5" /> Get Ideas
          </Button>
          <Button
            className="flex-1 active:scale-95"
            onClick={() => { haptics.medium(); onUseTemplate(example); }}
          >
            <Sparkles className="w-4 h-4 mr-1.5" /> Use Template
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

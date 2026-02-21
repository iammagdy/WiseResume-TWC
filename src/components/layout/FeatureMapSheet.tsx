import { Home, FileText, Sparkles, BarChart3, Globe } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface FeatureMapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    icon: Home,
    tab: 'Home',
    features: [
      'Create, manage & score your resumes',
      'Smart next-step suggestions',
      'Quick stats & health overview',
    ],
  },
  {
    icon: FileText,
    tab: 'Editor',
    features: [
      'Edit sections with guided steps',
      'Live preview & ATS parser view',
      'Download, share & pick templates',
    ],
  },
  {
    icon: Sparkles,
    tab: 'AI Tools',
    features: [
      'Smart Tailor, Proofread & Enhance',
      'Job Match, A/B Compare & Recruiter Sim',
      'Interview Prep, Cover Letters & more',
    ],
  },
  {
    icon: BarChart3,
    tab: 'Activity',
    features: [
      'Track job applications & statuses',
      'Set reminders & deadlines',
      'Monitor your job search pipeline',
    ],
  },
  {
    icon: Globe,
    tab: 'Portfolio',
    features: [
      'Generate a shareable portfolio site',
      'Custom themes, fonts & accent colors',
      'Track visits & link analytics',
    ],
  },
];

export function FeatureMapSheet({ open, onOpenChange }: FeatureMapSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>What can I do?</SheetTitle>
          <SheetDescription>A quick overview of every tab and what's inside.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 pb-4">
          {sections.map(({ icon: Icon, tab, features }) => (
            <div key={tab} className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{tab}</p>
                <ul className="mt-1 space-y-0.5">
                  {features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-1">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

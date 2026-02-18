import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Target, Mic } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useResumeStore } from '@/store/resumeStore';
import triggerHaptic from '@/lib/haptics';
import { useAuth } from '@/hooks/useAuth';

const actions = [
  {
    icon: FileText,
    title: 'Create New',
    description: 'Start from scratch with AI guidance',
    route: '/editor',
    createBlank: true,
  },
  {
    icon: Upload,
    title: 'Upload Resume',
    description: 'Import your existing PDF or DOCX',
    route: '/upload',
  },
  {
    icon: Target,
    title: 'AI Tailor',
    description: 'Match your resume to any job posting',
    route: '/editor',
    createBlank: true,
  },
  {
    icon: Mic,
    title: 'Mock Interview',
    description: 'Practice with AI voice interviews',
    route: '/interview',
  },
];

export function QuickActions() {
  const navigate = useNavigate();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { isAuthenticated } = useAuth();

  const handleAction = (action: typeof actions[0]) => {
    triggerHaptic.light();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (action.createBlank) {
      setCurrentResumeId(null);
      setCurrentResume(null);
    }
    navigate(action.route);
  };

  return (
    <section className="px-4 py-8">
      <h2 className="text-lg font-display font-semibold text-center mb-1">What would you like to do?</h2>
      <p className="text-sm text-muted-foreground text-center mb-5">Pick a path to get started</p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4">
        {actions.map((action, index) => (
          <Card
            key={action.title}
            className="flex-shrink-0 w-[140px] snap-center p-4 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all touch-manipulation opacity-0 animate-fade-in"
            style={{ animationDelay: `${0.1 + index * 0.08}s`, animationFillMode: 'forwards' }}
            onClick={() => handleAction(action)}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <action.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold leading-tight">{action.title}</span>
            <span className="text-xs text-muted-foreground leading-tight">{action.description}</span>
          </Card>
        ))}
      </div>
    </section>
  );
}

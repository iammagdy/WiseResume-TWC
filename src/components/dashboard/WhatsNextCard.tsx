import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Wand2, Download, Mic, CheckCircle2, ArrowRight } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { calcOverallScore, getNextIncompleteSection } from '@/lib/resumeCompletionRules';
import { cn } from '@/lib/utils';

interface NextStep {
  icon: React.ElementType;
  title: string;
  description: string;
  action: () => void;
  color: string;
  bgColor: string;
}

const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact Info',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
};

export function WhatsNextCard() {
  const navigate = useNavigate();
  const { data: resumes } = useResumes();
  const setCurrentResumeId = useResumeStore(s => s.setCurrentResumeId);
  const setCurrentResume = useResumeStore(s => s.setCurrentResume);

  const step = useMemo<NextStep | null>(() => {
    if (!resumes) return null;

    // 1. No resumes
    if (resumes.length === 0) {
      return {
        icon: Plus,
        title: 'Create your first resume',
        description: 'Get started in under 2 minutes',
        action: () => navigate('/dashboard?action=create'),
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      };
    }

    // Find the best master resume
    const masterResumes = resumes.filter(r => !r.parent_resume_id);
    const best = masterResumes[0];
    if (!best) return null;
    const bestData = dbToResumeData(best);
    const score = calcOverallScore(bestData);

    // 2. Resume needs work
    if (score < 40) {
      const section = getNextIncompleteSection(bestData);
      const sectionLabel = section ? SECTION_LABELS[section] || section : 'sections';
      return {
        icon: Pencil,
        title: `Finish your ${sectionLabel}`,
        description: `Your resume is ${score}% complete — keep going!`,
        action: () => {
          setCurrentResumeId(best.id);
          setCurrentResume(bestData);
          navigate('/editor');
        },
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      };
    }

    // 3. Never tailored
    const hasTailored = resumes.some(r => r.parent_resume_id);
    if (!hasTailored) {
      return {
        icon: Wand2,
        title: 'Tailor for a job posting',
        description: 'Boost your match score with AI tailoring',
        action: () => {
          setCurrentResumeId(best.id);
          setCurrentResume(bestData);
          navigate('/ai-studio?tool=tailor');
        },
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      };
    }

    // 4. Never downloaded (simple heuristic — no download tracking yet)
    // Skip this step since we can't reliably detect it

    // 5. Try interview
    return {
      icon: Mic,
      title: 'Practice a mock interview',
      description: 'Get AI-powered feedback on your answers',
      action: () => {
        setCurrentResumeId(best.id);
        setCurrentResume(bestData);
        navigate('/interview');
      },
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    };
  }, [resumes, navigate, setCurrentResumeId, setCurrentResume]);

  if (!step) return null;

  const Icon = step.icon;

  return (
    <motion.button
      onClick={() => { haptics.light(); step.action(); }}
      className="mx-4 mb-3 w-[calc(100%-2rem)] rounded-2xl glass-elevated p-4 text-left active:scale-[0.98] transition-transform touch-manipulation"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', step.bgColor)}>
          <Icon className={cn('w-5 h-5', step.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{step.title}</p>
          <p className="text-xs text-muted-foreground">{step.description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </motion.button>
  );
}

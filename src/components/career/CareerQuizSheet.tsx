import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface QuizAnswers {
  roleSatisfaction: number;
  careerGoal: string;
  skillsToDevelop: string[];
  workPreference: string;
  timeline: string;
  salaryPriority: string;
  industryInterests: string[];
  biggestChallenge: string;
  learningPreference: string;
  geographicFlexibility: string;
}

const INITIAL_ANSWERS: QuizAnswers = {
  roleSatisfaction: 0,
  careerGoal: '',
  skillsToDevelop: [],
  workPreference: '',
  timeline: '',
  salaryPriority: '',
  industryInterests: [],
  biggestChallenge: '',
  learningPreference: '',
  geographicFlexibility: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (answers: QuizAnswers) => void;
  isAnalyzing?: boolean;
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => { haptics.selection(); onClick(); }}
      className={cn(
        'w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 touch-manipulation text-left',
        selected
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'glass-input hover:bg-muted/50'
      )}
    >
      {label}
    </button>
  );
}

function ChipButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => { haptics.selection(); onClick(); }}
      className={cn(
        'px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 touch-manipulation',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'glass-input hover:bg-muted/50'
      )}
    >
      {label}
    </button>
  );
}

const SKILLS = ['Leadership', 'Data Analysis', 'Cloud Computing', 'AI/ML', 'Project Management', 'Public Speaking', 'UX Design', 'Negotiation', 'Sales', 'Marketing', 'Coding', 'Finance'];
const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Education', 'Marketing', 'Engineering', 'Creative/Design', 'Consulting', 'Government', 'Legal', 'Hospitality', 'Retail'];

export function CareerQuizSheet({ open, onOpenChange, onComplete, isAnalyzing }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const totalSteps = 10;
  const progress = ((step + 1) / totalSteps) * 100;

  const canNext = () => {
    switch (step) {
      case 0: return answers.roleSatisfaction > 0;
      case 1: return !!answers.careerGoal;
      case 2: return answers.skillsToDevelop.length > 0;
      case 3: return !!answers.workPreference;
      case 4: return !!answers.timeline;
      case 5: return !!answers.salaryPriority;
      case 6: return answers.industryInterests.length > 0;
      case 7: return true; // optional
      case 8: return !!answers.learningPreference;
      case 9: return !!answers.geographicFlexibility;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      haptics.light();
      setStep(step + 1);
    } else {
      haptics.success();
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      haptics.light();
      setStep(step - 1);
    }
  };

  const toggleChip = (key: 'skillsToDevelop' | 'industryInterests', value: string) => {
    setAnswers(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const renderQuestion = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">How satisfied are you with your current role?</h3>
            <p className="text-sm text-muted-foreground">Rate from 1 (not at all) to 5 (very satisfied)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => { haptics.selection(); setAnswers(a => ({ ...a, roleSatisfaction: n })); }}
                  className={cn(
                    'flex-1 h-14 rounded-xl text-lg font-bold transition-all active:scale-95',
                    answers.roleSatisfaction === n
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'glass-input'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">What's your primary career goal?</h3>
            <div className="space-y-2">
              {['Get promoted', 'Switch roles', 'Switch industries', 'Go freelance', 'Move to leadership'].map(g => (
                <OptionButton key={g} label={g} selected={answers.careerGoal === g} onClick={() => setAnswers(a => ({ ...a, careerGoal: g }))} />
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Which skills do you want to develop?</h3>
            <p className="text-sm text-muted-foreground">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map(s => (
                <ChipButton key={s} label={s} selected={answers.skillsToDevelop.includes(s)} onClick={() => toggleChip('skillsToDevelop', s)} />
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">What's your work preference?</h3>
            <div className="space-y-2">
              {['Remote', 'Hybrid', 'Office'].map(w => (
                <OptionButton key={w} label={w} selected={answers.workPreference === w} onClick={() => setAnswers(a => ({ ...a, workPreference: w }))} />
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">When do you want to make your next move?</h3>
            <div className="space-y-2">
              {['Within 3 months', 'Within 6 months', 'Within 1 year', '2+ years'].map(t => (
                <OptionButton key={t} label={t} selected={answers.timeline === t} onClick={() => setAnswers(a => ({ ...a, timeline: t }))} />
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">How important is salary in your next role?</h3>
            <div className="space-y-2">
              {['Critical - must increase', 'Important but flexible', 'Flexible - growth matters more'].map(s => (
                <OptionButton key={s} label={s} selected={answers.salaryPriority === s} onClick={() => setAnswers(a => ({ ...a, salaryPriority: s }))} />
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Which industries interest you?</h3>
            <p className="text-sm text-muted-foreground">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(i => (
                <ChipButton key={i} label={i} selected={answers.industryInterests.includes(i)} onClick={() => toggleChip('industryInterests', i)} />
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">What's your biggest career challenge?</h3>
            <p className="text-sm text-muted-foreground">Optional - helps personalize advice</p>
            <Textarea
              value={answers.biggestChallenge}
              onChange={e => setAnswers(a => ({ ...a, biggestChallenge: e.target.value }))}
              placeholder="e.g. Lack of mentorship, feeling stuck, unclear growth path..."
              className="min-h-[100px]"
            />
          </div>
        );
      case 8:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">How do you prefer to learn?</h3>
            <div className="space-y-2">
              {['Online courses', 'Mentorship', 'Hands-on projects', 'Certifications'].map(l => (
                <OptionButton key={l} label={l} selected={answers.learningPreference === l} onClick={() => setAnswers(a => ({ ...a, learningPreference: l }))} />
              ))}
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Are you open to relocating?</h3>
            <div className="space-y-2">
              {['Yes, anywhere', 'Partially - within my region', 'No, staying put'].map(g => (
                <OptionButton key={g} label={g} selected={answers.geographicFlexibility === g} onClick={() => setAnswers(a => ({ ...a, geographicFlexibility: g }))} />
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90dvh] flex flex-col rounded-t-3xl">
        <SheetHeader className="shrink-0 pb-2">
          <SheetTitle className="text-base">Career Assessment</SheetTitle>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{step + 1} of {totalSteps}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {renderQuestion()}
        </div>

        <div className="shrink-0 flex gap-3 pt-3 pb-safe border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            className="min-h-[48px] flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canNext() || isAnalyzing}
            className="min-h-[48px] flex-1"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 mr-1 animate-pulse" /> Analyzing...
              </>
            ) : step === totalSteps - 1 ? (
              <>
                <Sparkles className="w-4 h-4 mr-1" /> Get My Plan
              </>
            ) : (
              <>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

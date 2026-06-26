import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { cn } from '@/lib/utils';

export type ParseStep = 
  | 'reading' 
  | 'detecting' 
  | 'extracting' 
  | 'analyzing' 
  | 'complete';

interface UploadProgressStepsProps {
  currentStep: ParseStep;
  fileName?: string;
}

const STEPS: { id: ParseStep; label: string }[] = [
  { id: 'reading', label: 'Reading PDF' },
  { id: 'detecting', label: 'Detecting text' },
  { id: 'extracting', label: 'Extracting sections' },
  { id: 'analyzing', label: 'Analyzing content' },
  { id: 'complete', label: 'Complete' },
];

export function UploadProgressSteps({ currentStep, fileName }: UploadProgressStepsProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <motion.div
      className="flex flex-col items-center w-full max-w-[300px] rounded-2xl border border-border bg-card shadow-soft px-6 py-6"
      role="status"
      aria-live="polite"
      aria-busy={currentStep !== 'complete'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Animated Icon */}
      <motion.div
        className="w-16 h-16 rounded-full bg-primary shadow-soft-md flex items-center justify-center mb-5"
        animate={{
          scale: currentStep === 'complete' ? [1, 1.08, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {currentStep === 'complete' ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Check className="w-8 h-8 text-primary-foreground" />
          </motion.div>
        ) : (
          <MiniSpinner size={32} className="text-primary-foreground" />
        )}
      </motion.div>

      {/* Current Step Label */}
      <p className="text-section-header text-foreground mb-1">Importing your resume</p>
      <motion.p
        className="text-sm font-medium text-muted-foreground mb-2"
        key={currentStep}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {STEPS.find(s => s.id === currentStep)?.label}…
      </motion.p>

      {/* File Name */}
      {fileName && (
        <p className="text-sm text-muted-foreground truncate max-w-full mb-4">
          {fileName}
        </p>
      )}

      {/* Step Indicators */}
      <div className="flex items-center gap-2 mt-2" aria-hidden="true">
        {STEPS.filter(s => s.id !== 'complete').map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === currentStep;
          
          return (
            <motion.div
              key={step.id}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                isComplete && 'bg-success w-2 h-2',
                isCurrent && 'bg-primary w-3 h-3',
                !isComplete && !isCurrent && 'bg-muted'
              )}
              initial={false}
              animate={{
                scale: isCurrent ? 1.2 : 1,
              }}
            />
          );
        })}
      </div>

      {/* Substep Progress Text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentStep}
          className="text-xs text-muted-foreground mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {getSubstepText(currentStep)}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

function getSubstepText(step: ParseStep): string {
  switch (step) {
    case 'reading':
      return 'Opening your document...';
    case 'detecting':
      return 'Looking for text content...';
    case 'extracting':
      return 'Finding your experience, skills, and education...';
    case 'analyzing':
      return 'Organizing everything nicely...';
    case 'complete':
      return 'All done!';
    default:
      return 'Processing...';
  }
}

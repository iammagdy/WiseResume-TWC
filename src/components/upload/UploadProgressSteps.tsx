import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
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
      className="flex flex-col items-center w-full max-w-[280px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Animated Icon */}
      <motion.div
        className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-5"
        animate={{ 
          scale: currentStep === 'complete' ? [1, 1.1, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.4)',
        }}
      >
        {currentStep === 'complete' ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Check className="w-8 h-8 text-primary-foreground" />
          </motion.div>
        ) : (
          <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
        )}
      </motion.div>

      {/* Current Step Label */}
      <motion.p
        className="text-lg font-semibold mb-2"
        key={currentStep}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {STEPS.find(s => s.id === currentStep)?.label}...
      </motion.p>

      {/* File Name */}
      {fileName && (
        <p className="text-sm text-muted-foreground truncate max-w-full mb-4">
          {fileName}
        </p>
      )}

      {/* Step Indicators */}
      <div className="flex items-center gap-2 mt-2">
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

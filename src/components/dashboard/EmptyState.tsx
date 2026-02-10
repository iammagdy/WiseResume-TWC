import { motion } from 'framer-motion';
import { FileText, Plus, Sparkles, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateNew: () => void;
}

const steps = [
  { icon: Upload, label: 'Create or Upload', description: 'Start from scratch or import a PDF' },
  { icon: Sparkles, label: 'AI Enhances It', description: 'Tailor content for any job posting' },
  { icon: Download, label: 'Download PDF', description: 'Export an ATS-ready resume instantly' },
];

export function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-6"
        style={{
          boxShadow: '0 20px 40px -10px hsl(var(--primary) / 0.4)',
        }}
      >
        <FileText className="w-10 h-10 text-primary-foreground" />
      </motion.div>

      <h2 className="text-xl font-semibold mb-1">No Resumes Yet</h2>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        Get started in 3 simple steps
      </p>

      {/* How it works steps */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 w-full max-w-xs mb-8"
      >
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <step.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{i + 1}. {step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <Button
        size="lg"
        onClick={onCreateNew}
        className="gradient-primary h-14 px-8 text-lg font-semibold"
        style={{
          boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
        }}
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Your First Resume
      </Button>
    </motion.div>
  );
}

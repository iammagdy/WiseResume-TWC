import { motion } from 'framer-motion';
import { FileText, Plus, Sparkles, Download, Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateNew: () => void;
  onBrowseTemplates?: () => void;
  onStartOnboarding?: () => void;
}

const steps = [
  { icon: Upload, label: 'Create or Upload', description: 'Start from scratch or import a PDF' },
  { icon: Sparkles, label: 'AI Enhances It', description: 'Tailor content for any job posting' },
  { icon: Download, label: 'Download PDF', description: 'Export an ATS-ready resume instantly' },
];

const templatePreviews = [
  { id: 'modern', name: 'Modern', headerColor: 'hsl(var(--primary))' },
  { id: 'classic', name: 'Classic', headerColor: 'hsl(var(--foreground))' },
  { id: 'minimal', name: 'Minimal', headerColor: 'hsl(var(--muted-foreground))' },
];

export function EmptyState({ onCreateNew, onBrowseTemplates, onStartOnboarding }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
    >
      {/* Animated Floating Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1, y: [0, -8, 0] }}
        transition={{ 
          scale: { delay: 0.1, type: 'spring', stiffness: 200 },
          y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-5 relative"
        style={{
          boxShadow: '0 20px 40px -10px hsl(var(--primary) / 0.4)',
        }}
      >
        <FileText className="w-8 h-8 text-primary-foreground" />
        <div className="absolute inset-0 rounded-2xl animate-ring-pulse border-2 border-primary/40" />
      </motion.div>

      <h2 className="text-xl font-semibold mb-1">No Resumes Yet</h2>
      
      {/* Clickable steps subtitle */}
      {onStartOnboarding ? (
        <button
          onClick={onStartOnboarding}
          className="text-muted-foreground mb-6 max-w-sm text-sm underline decoration-dashed underline-offset-4 hover:text-foreground transition-colors"
        >
          Get started in 3 simple steps
        </button>
      ) : (
        <p className="text-muted-foreground mb-6 max-w-sm text-sm">
          Get started in 3 simple steps
        </p>
      )}

      {/* How it works steps */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 w-full max-w-xs mb-6"
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

      {/* Template preview row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x mb-6 w-full max-w-xs justify-center"
      >
        {templatePreviews.map((tpl, i) => (
          <motion.button
            key={tpl.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            onClick={onCreateNew}
            className="flex flex-col items-center gap-1.5 snap-center flex-shrink-0 group"
          >
            <div
              className="w-[80px] rounded-xl border border-border bg-card overflow-hidden transition-transform group-active:scale-95"
              style={{ aspectRatio: '8.5/11' }}
            >
              {/* Header bar */}
              <div
                className="h-3 w-full"
                style={{ backgroundColor: tpl.headerColor }}
              />
              {/* Skeleton lines */}
              <div className="p-2 space-y-1.5">
                <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
                <div className="h-1 w-full rounded-full bg-muted-foreground/10" />
                <div className="h-1 w-full rounded-full bg-muted-foreground/10" />
                <div className="h-1 w-5/6 rounded-full bg-muted-foreground/10" />
                <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/20 mt-2" />
                <div className="h-1 w-full rounded-full bg-muted-foreground/10" />
                <div className="h-1 w-4/5 rounded-full bg-muted-foreground/10" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{tpl.name}</span>
          </motion.button>
        ))}
      </motion.div>

      <Button
        size="lg"
        onClick={onCreateNew}
        className="gradient-primary h-12 px-6 text-base font-semibold"
        style={{
          boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
        }}
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Your First Resume
      </Button>

      {onBrowseTemplates && (
        <Button
          variant="outline"
          onClick={onBrowseTemplates}
          className="mt-3 gap-2"
        >
          Browse All Templates
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
}

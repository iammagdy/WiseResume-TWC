import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateNew: () => void;
}

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
        className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center mb-6"
        style={{
          boxShadow: '0 20px 40px -10px hsl(var(--primary) / 0.4)',
        }}
      >
        <FileText className="w-12 h-12 text-primary-foreground" />
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-2">No Resumes Yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create your first resume and start applying to your dream job with AI-powered assistance.
        </p>

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

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
          }}
        />
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { Briefcase, Plus, Search } from 'lucide-react';

interface EmptyApplicationsProps {
  onAddApplication: () => void;
  onSaveJob: () => void;
}

export function EmptyApplications({ onAddApplication, onSaveJob }: EmptyApplicationsProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg"
      >
        <Briefcase className="w-8 h-8 text-primary-foreground" />
      </motion.div>
      <h3 className="font-semibold text-foreground text-lg mb-1">Track Your Job Hunt</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
        Keep all your applications organized in one place. Add your first application to get started.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        <motion.button
          whileTap={{ scale: 0.95 }}
          style={{ touchAction: 'pan-y' }}
          onClick={onAddApplication}
          className="gradient-primary text-primary-foreground px-6 py-3 rounded-2xl font-medium flex items-center justify-center gap-2 active:scale-95 min-h-[44px] touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          style={{ touchAction: 'pan-y' }}
          onClick={onSaveJob}
          className="bg-muted text-foreground px-6 py-3 rounded-2xl font-medium flex items-center justify-center gap-2 active:scale-95 min-h-[44px] touch-manipulation"
        >
          <Search className="w-4 h-4" />
          Save a Job
        </motion.button>
      </div>
    </div>
  );
}

import { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface DashboardHeroProps {
  hasResumes: boolean;
  onBuild: () => void;
  onTailor: () => void;
}

export const DashboardHero = memo(function DashboardHero({
  hasResumes,
  onBuild,
  onTailor,
}: DashboardHeroProps) {
  if (hasResumes) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-4 mt-4 mb-4 rounded-2xl bg-card border border-border px-4 py-4"
      >
        <p className="text-[11px] font-medium text-muted-foreground mb-3">Jump back in</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-10 gap-2 justify-center active:scale-[0.98] touch-manipulation"
            onClick={() => { haptics.light(); onBuild(); }}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate text-sm">Build a Resume</span>
          </Button>
          <Button
            className="h-10 gap-2 justify-center active:scale-[0.98] touch-manipulation"
            onClick={() => { haptics.light(); onTailor(); }}
          >
            <Wand2 className="w-4 h-4 shrink-0" />
            <span className="truncate text-sm">Optimize for a Job</span>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-4 mt-5 mb-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 px-5 py-8"
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-widest mb-2">
        <Wand2 className="w-3 h-3" aria-hidden="true" />
        AI-Powered
      </span>
      <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">
        Optimize your resume.<br />Get more interviews.
      </h2>
      <p className="text-sm text-muted-foreground mb-6 leading-snug">
        Start in under 2 minutes — build from scratch or optimize for a specific job.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Button
            size="lg"
            variant="outline"
            className="h-12 gap-2.5 justify-center border-border hover:border-primary/30 active:scale-[0.98] touch-manipulation"
            onClick={() => { haptics.light(); onBuild(); }}
          >
            <FileText className="w-5 h-5 shrink-0" />
            Build a Resume
          </Button>
          <p className="text-[11px] text-muted-foreground text-center leading-tight px-1">
            Create a professional resume in minutes with AI
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Button
            size="lg"
            className="h-12 gap-2.5 justify-center active:scale-[0.98] touch-manipulation"
            onClick={() => { haptics.light(); onTailor(); }}
          >
            <Wand2 className="w-5 h-5 shrink-0" />
            Optimize for a Job
          </Button>
          <p className="text-[11px] text-muted-foreground text-center leading-tight px-1">
            Match your resume to any job and boost your interview chances
          </p>
        </div>
      </div>
    </motion.div>
  );
});

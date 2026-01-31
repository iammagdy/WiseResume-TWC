import { motion } from 'framer-motion';
import { User, Briefcase, GraduationCap, Sparkles } from 'lucide-react';

export function AppHeroVisual() {
  return (
    <div className="relative w-full h-[280px] flex items-center justify-center">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-secondary/20 blur-2xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Floating Resume Card */}
      <motion.div
        className="relative z-10"
        animate={{
          y: [0, -10, 0],
          rotateY: [0, 5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Resume Document */}
        <div
          className="w-48 h-64 rounded-2xl glass border border-border/50 p-4 shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
            boxShadow: '0 25px 50px -12px hsl(var(--primary) / 0.25), 0 0 0 1px hsl(var(--border) / 0.5)',
            transform: 'perspective(1000px) rotateX(5deg) rotateY(-5deg)',
          }}
        >
          {/* Header section */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="h-3 w-20 rounded bg-foreground/20 mb-1" />
              <div className="h-2 w-16 rounded bg-muted-foreground/20" />
            </div>
          </div>

          {/* Experience section */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Briefcase className="w-3 h-3 text-primary" />
              <div className="h-2 w-16 rounded bg-primary/30" />
            </div>
            <div className="space-y-1.5 pl-4">
              <div className="h-2 w-full rounded bg-muted-foreground/15" />
              <div className="h-2 w-4/5 rounded bg-muted-foreground/15" />
              <div className="h-2 w-3/5 rounded bg-muted-foreground/15" />
            </div>
          </div>

          {/* Education section */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <GraduationCap className="w-3 h-3 text-secondary" />
              <div className="h-2 w-14 rounded bg-secondary/30" />
            </div>
            <div className="space-y-1.5 pl-4">
              <div className="h-2 w-full rounded bg-muted-foreground/15" />
              <div className="h-2 w-2/3 rounded bg-muted-foreground/15" />
            </div>
          </div>

          {/* Skills pills */}
          <div className="flex flex-wrap gap-1">
            <div className="h-4 w-10 rounded-full bg-primary/20" />
            <div className="h-4 w-8 rounded-full bg-secondary/20" />
            <div className="h-4 w-12 rounded-full bg-accent/20" />
            <div className="h-4 w-9 rounded-full bg-primary/20" />
          </div>
        </div>

        {/* Floating sparkles */}
        <motion.div
          className="absolute -top-4 -right-4"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.6, 1, 0.6],
            rotate: [0, 15, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.div>

        <motion.div
          className="absolute -bottom-2 -left-6"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.9, 0.5],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        >
          <Sparkles className="w-5 h-5 text-secondary" />
        </motion.div>

        <motion.div
          className="absolute top-1/2 -right-8"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        >
          <Sparkles className="w-4 h-4 text-accent" />
        </motion.div>
      </motion.div>
    </div>
  );
}

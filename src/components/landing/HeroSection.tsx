import { motion } from 'framer-motion';
import { Sparkles, Target, FileCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onUploadClick: () => void;
  onSignInClick: () => void;
}

export function HeroSection({ onUploadClick, onSignInClick }: HeroSectionProps) {
  return (
    <section className="relative px-4 pt-12 pb-8 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full gradient-primary opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 -left-20 w-48 h-48 rounded-full bg-secondary opacity-15 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Land Your{' '}
          <span className="gradient-text">Dream Job</span>
          {' '}with AI
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg text-muted-foreground mb-8 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Upload your resume, paste a job description, and let AI optimize it for ATS systems. Get hired faster.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary hover:opacity-90 glow-primary transition-all active:scale-[0.98] touch-manipulation"
            onClick={onUploadClick}
          >
            <FileCheck className="w-5 h-5 mr-2" />
            Upload Your Resume
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-lg font-semibold border-primary/50 hover:bg-primary/10 transition-all active:scale-[0.98] touch-manipulation"
            onClick={onSignInClick}
          >
            Sign In to Save Progress
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

export function FeatureHighlights() {
  const features = [
    {
      icon: Target,
      title: 'AI Scoring',
      description: 'Get your resume scored against any job',
      color: 'primary',
    },
    {
      icon: Sparkles,
      title: 'Gap Analysis',
      description: 'Find missing keywords & skills',
      color: 'secondary',
    },
    {
      icon: FileCheck,
      title: 'ATS-Friendly',
      description: 'Templates that pass ATS systems',
      color: 'accent',
    },
    {
      icon: Zap,
      title: 'Instant Export',
      description: 'Download professional PDFs',
      color: 'success',
    },
  ];

  const colorClasses = {
    primary: 'bg-primary/20 text-primary border-primary/30',
    secondary: 'bg-secondary/20 text-secondary border-secondary/30',
    accent: 'bg-accent/20 text-accent border-accent/30',
    success: 'bg-success/20 text-success border-success/30',
  };

  return (
    <section className="px-4 py-8">
      <motion.h2
        className="text-xl font-display font-semibold mb-6 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Everything You Need
      </motion.h2>

      <div className="grid grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="p-5 rounded-2xl glass border border-border hover:border-primary/30 transition-colors touch-manipulation active:scale-[0.98]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 border ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

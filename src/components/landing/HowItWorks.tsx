import { Upload, Sparkles, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: Upload,
    number: 1,
    title: 'Upload',
    description: 'or Create',
  },
  {
    icon: Sparkles,
    number: 2,
    title: 'AI Tailors',
    description: 'for the Job',
  },
  {
    icon: Download,
    number: 3,
    title: 'Export',
    description: 'as PDF',
  },
];

export function HowItWorks() {
  return (
    <section className="py-12 px-6">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-display text-2xl font-bold text-center text-foreground mb-10"
      >
        How It Works
      </motion.h2>

      <div className="flex items-start justify-center gap-4 sm:gap-8 max-w-md mx-auto">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 }}
            className="flex flex-col items-center text-center flex-1"
          >
            {/* Step circle */}
            <div className="relative mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <step.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 + 0.3, duration: 0.5 }}
                  className="absolute top-1/2 left-full w-8 sm:w-12 h-0.5 bg-gradient-to-r from-primary/50 to-accent/50 origin-left -translate-y-1/2 ml-2"
                />
              )}
            </div>

            {/* Step number */}
            <span className="text-xs font-medium text-muted-foreground mb-1">
              Step {step.number}
            </span>

            {/* Title */}
            <h3 className="font-display font-semibold text-foreground text-sm">
              {step.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-muted-foreground">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

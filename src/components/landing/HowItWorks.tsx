import { motion } from 'framer-motion';
import { Upload, Target, Sparkles, Download } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      step: '01',
      title: 'Upload',
      description: 'Drop your PDF resume',
    },
    {
      icon: Target,
      step: '02',
      title: 'Target',
      description: 'Paste job description',
    },
    {
      icon: Sparkles,
      step: '03',
      title: 'Optimize',
      description: 'AI analyzes & improves',
    },
    {
      icon: Download,
      step: '04',
      title: 'Download',
      description: 'Export ATS-ready PDF',
    },
  ];

  return (
    <section className="px-4 py-8">
      <motion.h2
        className="text-xl font-display font-semibold mb-6 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        How It Works
      </motion.h2>

      <div className="space-y-5">
        {steps.map((step, index) => (
          <motion.div
            key={step.step}
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Step number */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="absolute -top-2 -right-2 text-sm font-bold text-primary">
                {step.step}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-base text-muted-foreground">{step.description}</p>
            </div>

            {/* Connector line (except last) */}
            {index < steps.length - 1 && (
              <div className="absolute left-7 top-14 h-4 w-0.5 bg-gradient-to-b from-primary to-transparent hidden" />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

import { Rocket, Cpu, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: Rocket,
    number: 1,
    title: 'Docking',
    description: 'Upload or Create',
  },
  {
    icon: Cpu,
    number: 2,
    title: 'AI Boost',
    description: 'Enhance & Optimize',
  },
  {
    icon: Radio,
    number: 3,
    title: 'Transmit',
    description: 'Export as PDF',
  },
];

export function HowItWorks() {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8 sm:mb-10"
      >
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          🛸 Your Journey
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Mission Control
        </h2>
      </motion.div>

      <div className="flex items-start justify-center gap-2 sm:gap-4 md:gap-8 max-w-md mx-auto">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 }}
            className="flex flex-col items-center text-center flex-1"
          >
            {/* Step circle with cosmic glow */}
            <div className="relative mb-3 sm:mb-4">
              <motion.div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center relative"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)`,
                  boxShadow: `0 0 30px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.2)`,
                }}
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <step.icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
              </motion.div>

              {/* Connecting orbital path */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  whileInView={{ scaleX: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 + 0.3, duration: 0.6 }}
                  className="absolute top-1/2 left-full w-4 xs:w-6 sm:w-8 md:w-12 h-px origin-left -translate-y-1/2 ml-1 sm:ml-2"
                  style={{
                    background: 'linear-gradient(90deg, hsl(var(--primary) / 0.8), hsl(var(--secondary) / 0.4))',
                  }}
                >
                  {/* Animated particle along the path */}
                  <motion.div
                    className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-secondary top-1/2 -translate-y-1/2"
                    animate={{ left: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: index * 0.3 }}
                  />
                </motion.div>
              )}
            </div>

            {/* Step number badge */}
            <span className="text-xs font-medium text-secondary mb-1 px-2 py-0.5 rounded-full bg-secondary/10">
              Step {step.number}
            </span>

            {/* Title */}
            <h3 className="font-display font-semibold text-foreground text-sm mb-1">
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

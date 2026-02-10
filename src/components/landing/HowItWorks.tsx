import { Rocket, Cpu, Radio } from 'lucide-react';

const steps = [
  { icon: Rocket, number: 1, title: 'Docking', description: 'Upload or Create' },
  { icon: Cpu, number: 2, title: 'AI Boost', description: 'Enhance & Optimize' },
  { icon: Radio, number: 3, title: 'Transmit', description: 'Export as PDF' },
];

export function HowItWorks() {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="text-center mb-8 sm:mb-10 animate-fade-in-up">
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          Your Journey
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Mission Control
        </h2>
      </div>

      <div className="flex items-start justify-center gap-2 sm:gap-4 md:gap-8 max-w-md mx-auto">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className="flex flex-col items-center text-center flex-1 animate-fade-in-up"
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            {/* Step circle with cosmic glow */}
            <div className="relative mb-3 sm:mb-4">
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center relative transition-transform duration-300 hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)`,
                  boxShadow: `0 0 30px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.2)`,
                }}
              >
                <step.icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
              </div>

              {/* Static connecting line */}
              {index < steps.length - 1 && (
                <div
                  className="absolute top-1/2 left-full w-4 xs:w-6 sm:w-8 md:w-12 h-px -translate-y-1/2 ml-1 sm:ml-2"
                  style={{
                    background: 'linear-gradient(90deg, hsl(var(--primary) / 0.8), hsl(var(--secondary) / 0.4))',
                  }}
                />
              )}
            </div>

            <span className="text-xs font-medium text-secondary mb-1 px-2 py-0.5 rounded-full bg-secondary/10">
              Step {step.number}
            </span>
            <h3 className="font-display font-semibold text-foreground text-sm mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

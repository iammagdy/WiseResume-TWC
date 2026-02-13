import { useNavigate } from 'react-router-dom';
import { Pencil, Sparkles, Download, BarChart3, LayoutGrid } from 'lucide-react';
import { AppIcon } from '@/components/brand/AppIcon';
import { SpaceBackground } from '@/components/landing/SpaceBackground';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { motion, useReducedMotion, type Easing } from 'framer-motion';

const steps = [
  { icon: Pencil, label: 'Create' },
  { icon: Sparkles, label: 'AI Polish' },
  { icon: Download, label: 'Export' },
];

const features = [
  { icon: Sparkles, title: 'AI Writing Assistant', desc: 'Enhance bullets and summaries instantly' },
  { icon: BarChart3, title: 'ATS Score Checker', desc: 'See how well you match any job' },
  { icon: LayoutGrid, title: 'Professional Templates', desc: '12 designs for every industry' },
];

const templatePreviews = [
  { name: 'Modern', accent: '#8B5CF6' },
  { name: 'Classic', accent: '#3B82F6' },
  { name: 'Creative', accent: '#EC4899' },
];


const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const fade = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { delay, duration: 0.6, ease: 'easeOut' as Easing },
        };

  const inView = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 } as const,
          whileInView: { opacity: 1, y: 0 } as const,
          viewport: { once: true, margin: '-50px' },
          transition: { delay, duration: 0.5, ease: 'easeOut' as Easing },
        };

  return (
    <SpaceBackground>
      <main className="min-h-screen pb-12">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-16 pb-6">
          {/* Floating icon with glow */}
          <motion.div className="relative mb-6 animate-float" {...fade(0)}>
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-50 animate-glow-pulse"
              style={{
                background: 'radial-gradient(circle, hsl(270 70% 60% / 0.6) 0%, hsl(330 70% 60% / 0.4) 50%, transparent 70%)',
                width: 140,
                height: 140,
                top: -10,
                left: -10,
              }}
              aria-hidden="true"
            />
            <AppIcon size={120} className="relative z-10" />
          </motion.div>

          <motion.h1
            className="text-[32px] font-bold text-foreground leading-tight mb-2"
            {...fade(0.1)}
          >
            Build Your Dream Resume
          </motion.h1>

          <motion.p
            className="text-base text-muted-foreground mb-8"
            {...fade(0.2)}
          >
            AI-powered&nbsp;•&nbsp;ATS-optimized&nbsp;•&nbsp;Free forever
          </motion.p>

          <motion.div className="w-full flex justify-center" {...fade(0.25)}>
            <motion.div
              className="w-full max-w-sm"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-[hsl(330_70%_50%)] hover:from-primary/90 hover:to-[hsl(330_70%_45%)] shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_32px_-4px_hsl(var(--primary)/0.7)] transition-shadow"
                onClick={() => navigate(user ? '/dashboard' : '/dashboard')}
              >
                {user ? 'Go to Dashboard' : 'Create My Resume'}
              </Button>
            </motion.div>
          </motion.div>

          {!user && (
            <motion.button
              onClick={() => navigate('/auth')}
              className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation"
              {...fade(0.3)}
            >
              Already have an account? <span className="text-primary font-medium">Sign In</span>
            </motion.button>
          )}

          <motion.div
            className="flex items-center gap-1.5 mt-4 text-xs text-muted-foreground"
            {...fade(0.35)}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Free&nbsp;•&nbsp;No credit card&nbsp;•&nbsp;5 minutes
          </motion.div>
        </section>

        {/* Steps Row */}
        <motion.section className="px-6 mb-6" {...inView(0)}>
          <div className="glass-surface border border-border/30 rounded-2xl p-4 flex items-center justify-around">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <motion.div
                  className="flex flex-col items-center gap-1.5"
                  {...inView(0.1 * i)}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-shadow hover:shadow-lg hover:shadow-primary/20">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">{step.label}</span>
                </motion.div>
                {i < steps.length - 1 && (
                  <motion.div
                    className="w-8 h-px bg-border/50 mx-2 mb-6 origin-left"
                    initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
                    whileInView={prefersReducedMotion ? undefined : { scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + 0.1 * i, duration: 0.4 }}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Features */}
        <motion.section className="px-6 mb-6" {...inView(0)}>
          <motion.h2
            className="text-2xl font-bold text-foreground text-center mb-4"
            {...inView(0)}
          >
            Why WiseResume?
          </motion.h2>
          <div className="space-y-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass-surface border border-border/30 rounded-2xl p-4 flex items-center gap-4 group transition-colors hover:border-primary/40 hover:bg-primary/5"
                {...inView(0.15 * i)}
                whileHover={prefersReducedMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center transition-transform group-hover:rotate-[5deg]">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Template Preview */}
        <motion.section className="px-6 mb-6" {...inView(0)}>
          <p className="text-sm text-muted-foreground mb-3 text-center">Templates</p>
          <div className="relative">
            {/* Gradient fade overlays */}
            <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
              {templatePreviews.map((t, i) => (
                <motion.div
                  key={t.name}
                  className="snap-start shrink-0 w-28"
                  initial={prefersReducedMotion ? undefined : { opacity: 0, x: 30 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                >
                  <div className="aspect-[612/792] rounded-lg overflow-hidden border border-border/30 bg-white mb-1.5 transition-shadow hover:shadow-lg">
                    <div className="w-full h-full p-2 flex flex-col gap-1">
                      <div className="h-1.5 rounded-full w-3/4 mx-auto" style={{ backgroundColor: t.accent }} />
                      <div className="h-1 rounded-full w-full bg-gray-200 mt-1" />
                      <div className="h-1 rounded-full w-5/6 bg-gray-200" />
                      <div className="h-1 rounded-full w-4/6 bg-gray-200" />
                      <div className="mt-auto h-1 rounded-full w-2/3 bg-gray-100" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{t.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="story-link block mx-auto mt-2 text-sm text-primary hover:text-primary/80 transition-colors touch-manipulation"
          >
            <span>Browse All Templates →</span>
          </button>
        </motion.section>
      </main>

    </SpaceBackground>
  );
};

export default Index;

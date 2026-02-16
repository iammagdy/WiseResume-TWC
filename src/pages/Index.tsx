import { useNavigate, Navigate } from 'react-router-dom';
import { Pencil, Sparkles, Download, LayoutGrid, Wand2, Target, Mic, Users, Shield } from 'lucide-react';
import wiseAiLogo from '@/assets/wise-ai-logo.png';
import { EditorDemo } from '@/components/landing/EditorDemo';
import { SpaceBackground } from '@/components/landing/SpaceBackground';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { motion, useReducedMotion, type Easing } from 'framer-motion';

const steps = [
  { icon: Pencil, label: 'Create' },
  { icon: Sparkles, label: 'AI Polish' },
  { icon: Download, label: 'Export' },
];

const features = [
  { icon: Sparkles, title: 'AI Writing Assistant', desc: 'Enhance bullets and summaries with one tap', iconColor: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
  { icon: Target, title: 'ATS Score Checker', desc: 'Real-time scoring against any job posting', iconColor: 'text-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: Wand2, title: 'Smart Job Tailoring', desc: 'AI adapts your resume to each job automatically', iconColor: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
  { icon: Mic, title: 'Voice Mock Interviews', desc: 'Practice with AI voice coaching & real-time feedback', iconColor: 'text-orange-500', gradient: 'from-orange-500/20 to-orange-500/5' },
  { icon: Users, title: '4 AI Recruiter Perspectives', desc: 'Fortune 500, Startup, Tech & Executive viewpoints', iconColor: 'text-rose-500', gradient: 'from-rose-500/20 to-rose-500/5' },
  { icon: LayoutGrid, title: '12 Professional Templates', desc: 'Designs for every industry, fully customizable', iconColor: 'text-violet-500', gradient: 'from-violet-500/20 to-violet-500/5' },
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

  // No redirect — authenticated users can view the landing page too

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

  const handleCTA = () => {
    navigate(user ? '/dashboard' : '/auth');
  };

  return (
    <SpaceBackground>
      <main className="min-h-screen pb-12">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-4 sm:px-6 pt-16 pb-6">
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
            <img src={wiseAiLogo} alt="Wise AI Logo" className="relative z-10 w-[120px] h-[120px] object-contain" />
          </motion.div>

          <motion.h1
            className="text-fluid-2xl font-bold text-foreground leading-tight mb-2"
            {...fade(0.1)}
          >
            Build Your Dream Resume
          </motion.h1>

          <motion.p
            className="text-base text-muted-foreground mb-8"
            {...fade(0.2)}
          >
            The AI resume builder that actually gets you hired
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
                onClick={handleCTA}
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
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
            Free forever&nbsp;•&nbsp;No credit card&nbsp;•&nbsp;Ready in 5 minutes
          </motion.div>
        </section>

        {/* Steps Row */}
        <motion.section className="px-4 sm:px-6 mb-6" {...inView(0)}>
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


        {/* Interactive Editor Demo */}
        <motion.section className="px-4 sm:px-6 mb-8" {...inView(0)}>
          <EditorDemo />
        </motion.section>

        {/* Social Proof Bar */}
        <motion.section className="px-4 sm:px-6 mb-8" {...inView(0)}>
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-5 sm:gap-8 px-5 py-3 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/20">
              {[
                { icon: '⭐', value: '4.9', label: 'Rating' },
                { icon: '📄', value: '10,000+', label: 'Resumes Built' },
                { icon: '💚', value: 'Free', label: 'Forever' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg">{stat.icon}</span>
                  <div className="text-center">
                    <p className="font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>


        {/* Features - 6 items */}
        <motion.section className="px-4 sm:px-6 mb-8" {...inView(0)}>
          <motion.h2
            className="text-2xl font-bold text-foreground text-center mb-2"
            {...inView(0)}
          >
            Everything You Need
          </motion.h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Powerful features to land your dream job</p>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 max-w-md mx-auto">
            {features.map((f, i) => (
              <motion.div key={f.title} {...inView(0.08 * i)}>
                <Card className="p-4 border-border/30 bg-card/50 backdrop-blur-sm h-full hover:border-primary/40 transition-colors">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3`}>
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Template Preview */}
        <motion.section className="px-4 sm:px-6 mb-8" {...inView(0)}>
          <p className="text-sm text-muted-foreground mb-3 text-center">Templates</p>
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
              {templatePreviews.map((t, i) => (
                <motion.div
                  key={t.name}
                  className="snap-start shrink-0 w-24 xs:w-28"
                  initial={prefersReducedMotion ? undefined : { opacity: 0, x: 30 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                >
                  <div className="aspect-[612/792] rounded-lg overflow-hidden bg-white/90 shadow-md mb-1.5 transition-all hover:shadow-xl hover:scale-105">
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
            onClick={handleCTA}
            className="story-link block mx-auto mt-2 text-sm text-primary hover:text-primary/80 transition-colors touch-manipulation"
          >
            <span>Browse All 12 Templates →</span>
          </button>
        </motion.section>

        {/* Bottom CTA */}
        <motion.section className="px-4 sm:px-6 py-12" {...inView(0)}>
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Ready to Land Your Dream Job?
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Join thousands building better resumes with AI
            </p>
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary to-[hsl(330_70%_50%)] hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
              onClick={handleCTA}
            >
              <Sparkles className="w-5 h-5" />
              Get Started Free
            </Button>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Free forever</span>
              <span>•</span>
              <span>No credit card</span>
              <span>•</span>
              <span>5 minutes</span>
            </div>
          </div>
        </motion.section>
      </main>
    </SpaceBackground>
  );
};

export default Index;

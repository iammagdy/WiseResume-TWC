import { useNavigate } from 'react-router-dom';
import { Pencil, Sparkles, Download, BarChart3, LayoutGrid, FileText, Settings, Home, Briefcase } from 'lucide-react';
import { AppIcon } from '@/components/brand/AppIcon';
import { SpaceBackground } from '@/components/landing/SpaceBackground';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

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

const bottomTabs = [
  { icon: Home, label: 'Home' },
  { icon: FileText, label: 'Editor' },
  { icon: Briefcase, label: 'Jobs' },
  { icon: Settings, label: 'Settings' },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <SpaceBackground>
      <main className="min-h-screen pb-24">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-16 pb-6">
          {/* Glowing icon */}
          <div className="relative mb-6">
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-50 animate-pulse"
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
          </div>

          <h1 className="text-[32px] font-bold text-foreground leading-tight mb-2">
            Build Your Dream Resume
          </h1>
          <p className="text-base text-muted-foreground mb-8">
            AI-powered&nbsp;•&nbsp;ATS-optimized&nbsp;•&nbsp;Free forever
          </p>

          <Button
            size="lg"
            className="w-full max-w-sm h-14 text-lg font-semibold bg-gradient-to-r from-primary to-[hsl(330_70%_50%)] hover:from-primary/90 hover:to-[hsl(330_70%_45%)] shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)]"
            onClick={() => navigate(user ? '/dashboard' : '/dashboard')}
          >
            {user ? 'Go to Dashboard' : 'Create My Resume'}
          </Button>

          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation"
            >
              Already have an account? <span className="text-primary font-medium">Sign In</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 mt-4 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Free&nbsp;•&nbsp;No credit card&nbsp;•&nbsp;5 minutes
          </div>
        </section>

        {/* Steps Row */}
        <section className="px-6 mb-6">
          <div className="glass-surface border border-border/30 rounded-2xl p-4 flex items-center justify-around">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-8 h-px bg-border/50 mx-2 mb-6" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground text-center mb-4">Why WiseResume?</h2>
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.title} className="glass-surface border border-border/30 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Template Preview */}
        <section className="px-6 mb-6">
          <p className="text-sm text-muted-foreground mb-3 text-center">Templates</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
            {templatePreviews.map((t) => (
              <div key={t.name} className="snap-start shrink-0 w-28">
                <div className="aspect-[612/792] rounded-lg overflow-hidden border border-border/30 bg-white mb-1.5">
                  {/* Mini template preview */}
                  <div className="w-full h-full p-2 flex flex-col gap-1">
                    <div className="h-1.5 rounded-full w-3/4 mx-auto" style={{ backgroundColor: t.accent }} />
                    <div className="h-1 rounded-full w-full bg-gray-200 mt-1" />
                    <div className="h-1 rounded-full w-5/6 bg-gray-200" />
                    <div className="h-1 rounded-full w-4/6 bg-gray-200" />
                    <div className="mt-auto h-1 rounded-full w-2/3 bg-gray-100" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">{t.name}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="block mx-auto mt-2 text-sm text-primary hover:text-primary/80 transition-colors touch-manipulation"
          >
            Browse All Templates →
          </button>
        </section>
      </main>

      {/* Visual-only bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass-surface border-t border-border/30 pb-safe" aria-hidden="true">
        <div className="flex items-center justify-around h-16">
          {bottomTabs.map((tab) => (
            <div key={tab.label} className="flex flex-col items-center gap-0.5 opacity-40">
              <tab.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">{tab.label}</span>
            </div>
          ))}
        </div>
      </div>
    </SpaceBackground>
  );
};

export default Index;

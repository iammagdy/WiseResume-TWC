import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Target,
  Star,
  Zap,
  Wand2,
  Mic,
  PenTool,
  BarChart3,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  Github,
  Linkedin,
  Layout,
  FileText,
  Briefcase
} from "lucide-react";

export function Elevated() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <style dangerouslySetInline={{ __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .dark .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
        }
      `}} />

      {/* Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles size={18} />
            </div>
            WiseResume
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Wall of Love</a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
            <Button className="rounded-full px-6">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[75vh] flex items-center pt-20 pb-32 overflow-hidden bg-grid-pattern">
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background pointer-events-none" />
        
        <div className="container relative z-10 mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-8 rounded-full px-4 py-1.5 border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="w-3.5 h-3.5 mr-2 inline" />
              AI-Powered Career Platform
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              The resume that <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                gets you hired.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
              Stop guessing what ATS wants. Our AI rewrites your bullets, analyzes job descriptions, and matches you to roles with mathematical precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button size="lg" className="rounded-full h-14 px-8 text-base shadow-lg shadow-primary/20">
                Build Your Resume <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-base bg-background">
                View Examples
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Free to start</span>
              <span className="w-1.5 h-1.5 rounded-full bg-border inline-block" />
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> No credit card</span>
              <span className="w-1.5 h-1.5 rounded-full bg-border inline-block" />
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> AI-powered</span>
            </div>
          </div>

          <div className="relative hidden lg:block perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent blur-3xl rounded-full" />
            <div className="animate-float relative z-10 w-full max-w-md mx-auto bg-card rounded-2xl border shadow-2xl p-6 flex flex-col gap-6 transform rotate-y-[-5deg] rotate-x-[5deg]">
              {/* Mock Resume Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-2xl font-bold font-serif text-card-foreground">Alex Developer</h3>
                  <p className="text-sm text-muted-foreground mt-1">Senior Frontend Engineer</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Target className="w-3 h-3" />
                  ATS: 92%
                </div>
              </div>

              {/* Mock Bullet Edit */}
              <div className="space-y-3">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Experience
                </div>
                
                <div className="relative pl-4 border-l-2 border-muted space-y-4">
                  {/* Original */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-red-400" />
                    <p className="text-sm text-muted-foreground line-through opacity-70">
                      Made the website faster by fixing some code and using React components.
                    </p>
                  </div>
                  
                  {/* Improved */}
                  <div className="relative bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <div className="absolute -left-[21px] top-4 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-background" />
                    <Badge variant="outline" className="absolute -top-3 right-3 bg-background text-[10px] py-0 border-primary/20 text-primary">AI Improved</Badge>
                    <p className="text-sm text-foreground font-medium leading-relaxed">
                      Architected React component library reducing bundle size by 42% and improving First Contentful Paint (FCP) by 1.2s.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Skeleton lines to fill it out */}
              <div className="space-y-2 mt-2">
                <div className="h-2 w-full bg-muted rounded" />
                <div className="h-2 w-5/6 bg-muted rounded" />
                <div className="h-2 w-4/6 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Sparkles className="w-5 h-5 text-blue-500" />, stat: "50K+", label: "Resumes" },
              { icon: <Target className="w-5 h-5 text-emerald-500" />, stat: "92%", label: "ATS pass rate" },
              { icon: <Star className="w-5 h-5 text-amber-500" />, stat: "4.8★", label: "Rating" },
              { icon: <Zap className="w-5 h-5 text-purple-500" />, stat: "30s", label: "Avg. tailor" },
            ].map((s, i) => (
              <Card key={i} className="p-6 rounded-2xl bg-card hover:bg-muted/50 transition-colors border-border/50 shadow-sm flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-xl bg-background border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <div className="text-3xl font-bold mb-1 tracking-tight">{s.stat}</div>
                <div className="text-sm text-muted-foreground font-medium">{s.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 tracking-tight">Everything you need to stand out</h2>
            <p className="text-muted-foreground text-lg">Build, tailor, and present your professional story with tools designed for the modern job market.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="min-h-[380px] overflow-hidden rounded-3xl border-border/50 flex flex-col bg-gradient-to-b from-card to-muted/20">
              <div className="p-8 pb-0 flex-1">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <Wand2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">AI Editor</h3>
                <p className="text-muted-foreground">Context-aware suggestions that understand your industry. Rewrite bullets, fix gaps, and optimize for keywords.</p>
              </div>
              <div className="mt-8 mx-8 bg-background border-t border-x rounded-t-xl p-4 shadow-xl flex-1 relative overflow-hidden">
                <div className="flex gap-2 mb-4 border-b pb-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-10 w-full bg-primary/5 border border-primary/20 rounded flex items-center px-3 gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Generate metric-driven bullet...</span>
                  </div>
                  <div className="h-4 w-5/6 bg-muted rounded" />
                  <div className="h-4 w-4/6 bg-muted rounded" />
                </div>
              </div>
            </Card>

            <Card className="min-h-[380px] overflow-hidden rounded-3xl border-border/50 flex flex-col bg-gradient-to-b from-card to-muted/20">
              <div className="p-8 pb-0 flex-1">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3">One-Click Portfolio</h3>
                <p className="text-muted-foreground">Turn your resume into a stunning personal website instantly. No coding or design skills required.</p>
              </div>
              <div className="mt-8 mx-8 bg-background border-t border-x rounded-t-xl p-4 shadow-xl flex-1 relative overflow-hidden flex items-center justify-center">
                {/* Mini Portfolio Mockup */}
                <div className="w-full max-w-[200px] border rounded-lg shadow-sm bg-card p-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full mb-3" />
                  <div className="h-3 w-2/3 bg-foreground/20 rounded mx-auto mb-2" />
                  <div className="h-2 w-1/2 bg-muted rounded mx-auto mb-4" />
                  <div className="flex gap-2 justify-center">
                    <div className="w-6 h-6 rounded bg-muted" />
                    <div className="w-6 h-6 rounded bg-muted" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Complete career toolkit</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">Everything you need to land your next role, built into one seamless platform.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 bg-border gap-[1px] border rounded-3xl overflow-hidden shadow-sm">
            {[
              { icon: <PenTool />, title: "AI Resume Writing", desc: "Generate tailored bullets and summaries based on your experience." },
              { icon: <Target />, title: "ATS Score Analysis", desc: "Real-time scoring against job descriptions with actionable fixes." },
              { icon: <Zap />, title: "Smart Tailoring", desc: "Instantly adapt your resume for different roles with one click." },
              { icon: <Mic />, title: "Interview Coaching", desc: "Practice with AI voice mock interviews tailored to the job." },
              { icon: <FileText />, title: "Cover Letters", desc: "Generate hyper-personalized cover letters that match your resume." },
              { icon: <Layout />, title: "Application Tracker", desc: "Kanban board to manage your entire job search pipeline." }
            ].map((f, i) => (
              <div key={i} className="bg-card p-8 hover:bg-muted/50 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h4 className="text-xl font-bold mb-2">{f.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start for free, upgrade when you need more power.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <Card className="p-8 rounded-3xl border-border shadow-sm flex flex-col relative overflow-hidden bg-card">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">$0</span>
                  <span className="text-muted-foreground font-medium">/ forever</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-8 text-sm">Perfect for building your first resume.</p>
              <ul className="space-y-4 mb-8 flex-1 text-sm font-medium">
                {['1 resume', 'Basic AI suggestions', 'ATS score check', 'PDF export', 'Portfolio site'].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-xl h-12">Get Started</Button>
            </Card>

            {/* Pro - Inverted */}
            <Card className="p-8 rounded-3xl border-0 shadow-2xl flex flex-col relative overflow-hidden bg-foreground text-background transform md:-translate-y-4">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-xl tracking-wider uppercase">
                MOST POPULAR
              </div>
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-emerald-500" />
              
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2 text-background/80">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">$9</span>
                  <span className="text-background/60 font-medium">/ month</span>
                </div>
              </div>
              <p className="text-background/70 mb-8 text-sm">Everything you need for a serious job hunt.</p>
              <ul className="space-y-4 mb-8 flex-1 text-sm font-medium">
                {['Unlimited resumes', 'Advanced AI tools', 'Smart tailoring', 'Interview coaching', 'Cover letter generator', 'Application tracker', 'Priority support'].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary fill-background" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-xl h-12 shadow-lg shadow-primary/20">Upgrade to Pro</Button>
            </Card>

            {/* Premium */}
            <Card className="p-8 rounded-3xl border-border shadow-sm flex flex-col relative overflow-hidden bg-card">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Premium</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">$19</span>
                  <span className="text-muted-foreground font-medium">/ month</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-8 text-sm">For maximum visibility and coaching.</p>
              <ul className="space-y-4 mb-8 flex-1 text-sm font-medium">
                {['Everything in Pro', 'Custom branding', 'Analytics dashboard', 'White-label exports', 'Early access features', 'Dedicated support'].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-xl h-12">Upgrade to Premium</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Banner CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto p-1 rounded-3xl bg-gradient-to-r from-primary/30 via-blue-500/30 to-emerald-500/30">
            <div className="bg-card rounded-[22px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left shadow-xl">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to upgrade your career?</h2>
                <p className="text-muted-foreground text-lg">Join 50,000+ professionals landing interviews.</p>
              </div>
              <div className="flex shrink-0 gap-4">
                <Button size="lg" className="rounded-full px-8 h-12">Create Free Resume</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-b from-primary/10 to-background border-t mt-12 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-extrabold tracking-tight mb-6">Stop applying to the void.</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Get past the ATS, impress recruiters, and land your dream job faster.
          </p>
          <Button size="lg" className="rounded-full h-14 px-10 text-lg shadow-xl shadow-primary/25">
            Get Started For Free <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="mt-6 text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" /> Join 50,000+ professionals
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-16 bg-muted/20">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <Sparkles size={18} />
              </div>
              WiseResume
            </div>
            <p className="text-muted-foreground max-w-xs text-sm">
              The AI-powered career platform helping professionals build resumes, prep for interviews, and land jobs.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">AI Resume Builder</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cover Letters</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Portfolio Site</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Examples</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Career Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              </ul>
            </div>
          </div>

          <div className="md:text-right">
            <h4 className="font-semibold mb-4">Connect</h4>
            <div className="flex md:justify-end gap-4 mb-6">
              <a href="#" className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} WiseResume. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

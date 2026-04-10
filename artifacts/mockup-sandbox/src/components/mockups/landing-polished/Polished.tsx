import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  LineChart,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  Wand2,
  Zap,
  Download,
  Shield,
  Clock,
  ThumbsUp,
  Award
} from "lucide-react";

export function Polished() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="w-5 h-5" />
            </div>
            WiseResume
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="font-medium hidden sm:inline-flex">Sign In</Button>
            <Button className="font-medium rounded-full px-6">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Subtle radial gradient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5 text-primary">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            AI-Powered Resume Builder
          </Badge>
          
          <h1 className="text-[clamp(52px,8vw,72px)] leading-[1.05] font-[900] tracking-tight mb-6 text-balance text-foreground">
            Land your dream job with an <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">intelligent</span> resume.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop guessing what ATS systems want. Our AI writes, analyzes, and tailors your resume for every application in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="h-14 px-8 text-base font-bold rounded-full w-full sm:w-auto shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
              Build Your Resume Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-full w-full sm:w-auto border-border/50 hover:bg-muted/50">
              View Examples
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Free to start</span>
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> No credit card</span>
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> AI-powered</span>
          </div>

          {/* Floating Mini Card */}
          <div className="hidden lg:flex absolute -right-4 top-24 flex-col bg-background border border-border shadow-xl rounded-xl p-4 w-72 transform rotate-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Before</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 rounded-full text-[10px] px-2 h-5">
                <CheckCircle2 className="w-3 h-3 mr-1" /> AI Improved
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground line-through decoration-muted-foreground/40 mb-3 opacity-60">
              Responsible for managing the team and increasing sales.
            </div>
            <div className="text-sm font-medium text-foreground leading-snug">
              Led a 5-person cross-functional team, driving a 34% increase in Q3 revenue through optimized workflows.
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-8">
          <div className="border border-border/50 rounded-2xl bg-muted/30 p-8 grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="flex flex-col items-center justify-center text-center pt-4 md:pt-0">
              <FileText className="w-6 h-6 text-primary mb-3 opacity-80" />
              <div className="text-3xl font-bold text-primary mb-1 tracking-tight">50K+</div>
              <div className="text-sm font-medium text-muted-foreground">Resumes Created</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center pt-4 md:pt-0">
              <Target className="w-6 h-6 text-emerald-500 mb-3 opacity-80" />
              <div className="text-3xl font-bold text-emerald-600 mb-1 tracking-tight">92%</div>
              <div className="text-sm font-medium text-muted-foreground">ATS Pass Rate</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center pt-4 md:pt-0">
              <Star className="w-6 h-6 text-amber-500 mb-3 opacity-80 fill-amber-500/20" />
              <div className="text-3xl font-bold text-amber-600 mb-1 tracking-tight">4.8★</div>
              <div className="text-sm font-medium text-muted-foreground">User Rating</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center pt-4 md:pt-0">
              <Zap className="w-6 h-6 text-blue-500 mb-3 opacity-80" />
              <div className="text-3xl font-bold text-blue-600 mb-1 tracking-tight">30s</div>
              <div className="text-sm font-medium text-muted-foreground">Avg. Tailor Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Cards */}
      <section className="py-20 md:py-32 bg-background relative">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Powerful tools to accelerate your search</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">Everything you need to write, optimize, and manage your job applications in one unified platform.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="group relative bg-card border border-border/60 rounded-3xl overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/40 to-transparent" />
              <div className="p-8 pb-0">
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 mb-6 py-1.5 px-3 rounded-full text-xs font-semibold">
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI Writer
                </Badge>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Write faster, not harder</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">
                  Generate compelling summary statements, role descriptions, and achievements tailored to your specific industry.
                </p>
              </div>
              <div className="mt-8 flex-1 bg-muted/40 border-t border-border/50 mx-8 rounded-t-xl relative overflow-hidden flex items-start justify-center p-6 min-h-[220px]">
                <div className="w-full max-w-sm space-y-3">
                  <div className="h-4 bg-muted-foreground/10 rounded w-3/4" />
                  <div className="h-4 bg-primary/20 rounded w-full" />
                  <div className="h-4 bg-primary/20 rounded w-5/6" />
                  <div className="h-4 bg-muted-foreground/10 rounded w-1/2" />
                </div>
              </div>
            </div>

            <div className="group relative bg-card border border-border/60 rounded-3xl overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
              <div className="p-8 pb-0">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 mb-6 py-1.5 px-3 rounded-full text-xs font-semibold">
                  <Target className="w-3.5 h-3.5 mr-1.5" /> ATS Optimizer
                </Badge>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Beat the screening bots</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">
                  Scan your resume against any job description. We'll tell you exactly which keywords you're missing to score a 90%+.
                </p>
              </div>
              <div className="mt-8 flex-1 bg-muted/40 border-t border-border/50 mx-8 rounded-t-xl relative overflow-hidden flex items-start justify-center p-6 min-h-[220px]">
                <div className="w-32 h-32 rounded-full border-[12px] border-emerald-500/20 border-t-emerald-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">94%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Alternating */}
      <section className="py-20 md:py-32 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Complete career toolkit</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">Everything works together to land you interviews.</p>
          </div>

          <div className="space-y-6">
            {[
              {
                icon: Wand2,
                title: "AI Resume Writing",
                desc: "Draft professional bullet points and summaries instantly with our fine-tuned AI models designed specifically for career documents.",
                color: "text-blue-500",
                bg: "bg-blue-500/10"
              },
              {
                icon: LineChart,
                title: "ATS Score Analysis",
                desc: "Get instant feedback on how well your resume matches a target job description, including missing keywords and formatting checks.",
                color: "text-emerald-500",
                bg: "bg-emerald-500/10"
              },
              {
                icon: Target,
                title: "Smart Tailoring",
                desc: "Generate custom, highly-targeted versions of your resume for different roles with a single click, saving hours of manual editing.",
                color: "text-amber-500",
                bg: "bg-amber-500/10"
              },
              {
                icon: MessageSquare,
                title: "Interview Coaching",
                desc: "Practice with our AI recruiter. Get custom questions based on your resume and the specific job you applied for.",
                color: "text-purple-500",
                bg: "bg-purple-500/10"
              },
              {
                icon: FileText,
                title: "Cover Letters",
                desc: "Create perfectly aligned cover letters that bridge the gap between your experience and the job requirements automatically.",
                color: "text-rose-500",
                bg: "bg-rose-500/10"
              },
              {
                icon: Clock,
                title: "Application Tracker",
                desc: "Keep all your applications organized. Know when to follow up, what version you sent, and track your progress in one dashboard.",
                color: "text-primary",
                bg: "bg-primary/10"
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`flex flex-col ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'} bg-card border border-border/60 rounded-2xl p-6 hover:-translate-y-[2px] hover:shadow-md transition-all duration-300 group cursor-default`}
              >
                <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${feature.bg} ${feature.color} shrink-0 mb-4 sm:mb-0`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <div className={`flex-1 ${i % 2 === 0 ? 'sm:ml-6' : 'sm:mr-6'} flex flex-col justify-center`}>
                  <h4 className="text-xl font-bold tracking-tight mb-1">{feature.title}</h4>
                  <p className="text-muted-foreground text-[15px] leading-relaxed">{feature.desc}</p>
                </div>
                <div className="hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">Start for free, upgrade when you need more power.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Free */}
            <div className="bg-card border border-border/60 rounded-3xl p-8 flex flex-col">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <p className="text-muted-foreground text-sm mb-6 min-h-[40px]">Perfect for your first professional resume.</p>
              <div className="text-4xl font-bold tracking-tight mb-8">
                $0
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> 1 Resume</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Basic templates</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> PDF export</li>
              </ul>
              <Button variant="outline" className="w-full h-12 rounded-full font-bold">Get Started</Button>
            </div>

            {/* Pro */}
            <div className="bg-card border-2 border-primary rounded-3xl p-8 flex flex-col relative shadow-xl shadow-primary/5 bg-gradient-to-b from-primary/8 to-primary/3 scale-105 z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground hover:bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                  Most Popular
                </Badge>
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-muted-foreground text-sm mb-6 min-h-[40px]">For active job seekers applying to multiple roles.</p>
              <div className="text-5xl font-black tracking-tight mb-8 flex items-baseline">
                <span className="text-2xl font-bold text-muted-foreground mr-1">$</span>
                9
                <span className="text-lg font-bold text-muted-foreground ml-1">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Unlimited Resumes</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> AI Bullet Writing</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Basic ATS Scoring</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Premium templates</li>
              </ul>
              <Button className="w-full h-12 rounded-full font-bold shadow-lg shadow-primary/20">Upgrade to Pro</Button>
            </div>

            {/* Premium */}
            <div className="bg-card border border-border/60 rounded-3xl p-8 flex flex-col">
              <h3 className="text-xl font-bold mb-2">Premium</h3>
              <p className="text-muted-foreground text-sm mb-6 min-h-[40px]">The ultimate toolkit for career advancement.</p>
              <div className="text-4xl font-bold tracking-tight mb-8 flex items-baseline">
                <span className="text-xl font-bold text-muted-foreground mr-1">$</span>
                19
                <span className="text-base font-bold text-muted-foreground ml-1">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Everything in Pro</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Smart Tailoring</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Cover Letter Gen</li>
                <li className="flex items-start text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" /> Interview Coaching</li>
              </ul>
              <Button variant="outline" className="w-full h-12 rounded-full font-bold">Go Premium</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Install CTA */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 md:px-8 flex justify-center">
          <div className="w-full max-w-2xl bg-card border border-border/60 rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Download className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h4 className="text-xl font-bold tracking-tight mb-1">Install the Desktop App</h4>
              <p className="text-muted-foreground text-sm">Work offline, get native notifications, and access your documents instantly from your dock.</p>
            </div>
            <Button variant="secondary" className="rounded-full font-bold px-6 shrink-0">Install Now</Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 bg-primary/5 border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 md:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-balance max-w-3xl mx-auto">
            Ready to build a resume that actually gets interviews?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Join thousands of job seekers who have successfully landed their dream roles using our platform.
          </p>
          <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-full shadow-xl shadow-primary/20 transition-transform hover:-translate-y-1">
            Create Your Free Resume
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-border/40">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <div className="flex items-center justify-center gap-2 font-bold text-xl tracking-tight mb-6">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            WiseResume
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-muted-foreground mb-8">
            <a href="#" className="hover:text-foreground transition-colors">Templates</a>
            <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#" className="hover:text-foreground transition-colors">Guides</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
          <p className="text-sm text-muted-foreground/60">
            © {new Date().getFullYear()} WiseResume Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

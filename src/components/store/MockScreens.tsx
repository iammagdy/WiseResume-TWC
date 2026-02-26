import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLogo } from '@/components/brand/AppLogo';
import {
  Sparkles, FileText, Target, Mic, Users, LayoutGrid, Briefcase, Globe,
  CheckCircle2, Star, TrendingUp, Zap, Brain, MessageSquare, Eye,
  Award, BookOpen, Palette,
} from 'lucide-react';

/* ─── Shared helpers ─── */
const ScoreDot = ({ score, color }: { score: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
    <span className="text-sm font-semibold text-foreground">{score}%</span>
  </div>
);

/* ════════════════════════════════════════════════
   1. Hero Screen
   ════════════════════════════════════════════════ */
export function MockHeroScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-background">
      <div className="mb-8 scale-150">
        <AppLogo size="lg" showTagline={false} />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-3 text-center">
        Land Your Dream Job
      </h1>
      <p className="text-muted-foreground text-center text-lg mb-8 max-w-[80%]">
        AI-powered resume builder, interview coach & job tracker — all in one app.
      </p>
      <Button size="lg" className="rounded-full px-10 text-lg h-14">
        <Sparkles className="w-5 h-5 mr-2" /> Get Started Free
      </Button>
      <div className="flex gap-6 mt-10">
        {['4.9 ★ Rating', '50K+ Users', '100% Free'].map((t) => (
          <Badge key={t} variant="secondary" className="text-sm px-3 py-1">{t}</Badge>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   2. Resume Builder / Dashboard
   ════════════════════════════════════════════════ */
export function MockDashboardScreen() {
  const resumes = [
    { title: 'Senior Frontend Developer', score: 92, updated: '2 hours ago', color: 'hsl(142 71% 45%)' },
    { title: 'Full-Stack Engineer', score: 78, updated: 'Yesterday', color: 'hsl(48 96% 53%)' },
    { title: 'Product Manager', score: 85, updated: '3 days ago', color: 'hsl(142 71% 45%)' },
  ];
  return (
    <div className="flex flex-col h-full bg-background p-6 pt-16">
      <h2 className="text-2xl font-bold text-foreground mb-1">My Resumes</h2>
      <p className="text-muted-foreground text-sm mb-6">3 resumes · 2 tailored</p>
      <div className="flex flex-col gap-4">
        {resumes.map((r) => (
          <Card key={r.title} className="border border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-base">{r.title}</p>
                  <p className="text-muted-foreground text-xs">{r.updated}</p>
                </div>
              </div>
              <ScoreDot score={r.score} color={r.color} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Button className="mt-6 rounded-full" size="lg">
        <Sparkles className="w-4 h-4 mr-2" /> Create New Resume
      </Button>
    </div>
  );
}

/* ════════════════════════════════════════════════
   3. AI Tailoring / AI Studio
   ════════════════════════════════════════════════ */
export function MockAIStudioScreen() {
  const tools = [
    { icon: <Target className="w-7 h-7" />, label: 'Job Tailoring', desc: 'Match to any job', color: 'bg-blue-500/10 text-blue-500' },
    { icon: <Brain className="w-7 h-7" />, label: 'Smart Enhance', desc: 'AI-powered rewrite', color: 'bg-purple-500/10 text-purple-500' },
    { icon: <TrendingUp className="w-7 h-7" />, label: 'ATS Analyzer', desc: 'Score & optimize', color: 'bg-green-500/10 text-green-500' },
    { icon: <Users className="w-7 h-7" />, label: 'Recruiter Sim', desc: '4 AI personas', color: 'bg-orange-500/10 text-orange-500' },
    { icon: <Zap className="w-7 h-7" />, label: 'One-Page Mode', desc: 'Auto condense', color: 'bg-yellow-500/10 text-yellow-500' },
    { icon: <Eye className="w-7 h-7" />, label: 'Proofreader', desc: 'Grammar & tone', color: 'bg-rose-500/10 text-rose-500' },
  ];
  return (
    <div className="flex flex-col h-full bg-background p-6 pt-16">
      <h2 className="text-2xl font-bold text-foreground mb-1">AI Studio</h2>
      <p className="text-muted-foreground text-sm mb-6">Smart tools for your resume</p>
      <div className="grid grid-cols-2 gap-4">
        {tools.map((t) => (
          <Card key={t.label} className="border border-border">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.color}`}>
                {t.icon}
              </div>
              <p className="font-semibold text-foreground">{t.label}</p>
              <p className="text-muted-foreground text-xs">{t.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   4. Mock Interview
   ════════════════════════════════════════════════ */
export function MockInterviewScreen() {
  return (
    <div className="flex flex-col items-center h-full bg-background p-6 pt-16">
      <h2 className="text-2xl font-bold text-foreground mb-1">Mock Interview</h2>
      <p className="text-muted-foreground text-sm mb-8">AI Voice Coach</p>

      {/* Waveform placeholder */}
      <div className="w-full flex items-center justify-center gap-1 my-8" style={{ height: 120 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="w-2 rounded-full bg-primary/60"
            style={{
              height: `${25 + Math.sin(i * 0.5) * 50 + Math.random() * 30}%`,
            }}
          />
        ))}
      </div>

      <Card className="w-full border border-border mb-6">
        <CardContent className="p-5">
          <p className="text-foreground font-medium mb-2">"Tell me about your experience with React…"</p>
          <p className="text-muted-foreground text-sm">Question 3 of 8 · Technical Round</p>
        </CardContent>
      </Card>

      <div className="flex gap-4 mt-auto mb-8">
        <Button variant="outline" size="lg" className="rounded-full px-8">Skip</Button>
        <Button size="lg" className="rounded-full px-8">
          <Mic className="w-5 h-5 mr-2" /> Answer
        </Button>
      </div>

      <div className="flex gap-6">
        <Badge variant="secondary">⏱ 14:32</Badge>
        <Badge variant="secondary">🎯 Score: 82%</Badge>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   5. Recruiter Simulator
   ════════════════════════════════════════════════ */
export function MockRecruiterScreen() {
  const personas = [
    { name: 'Sarah', role: 'Tech Recruiter', verdict: 'Strong Hire', emoji: '👩‍💼', score: 88 },
    { name: 'Marcus', role: 'Hiring Manager', verdict: 'Hire', emoji: '👨‍💻', score: 76 },
    { name: 'Priya', role: 'HR Director', verdict: 'Strong Hire', emoji: '👩‍🏫', score: 91 },
    { name: 'James', role: 'Senior Recruiter', verdict: 'Consider', emoji: '🧑‍💼', score: 68 },
  ];
  return (
    <div className="flex flex-col h-full bg-background p-6 pt-16">
      <h2 className="text-2xl font-bold text-foreground mb-1">Recruiter Simulator</h2>
      <p className="text-muted-foreground text-sm mb-6">4 AI personas reviewed your resume</p>
      <div className="flex flex-col gap-4">
        {personas.map((p) => (
          <Card key={p.name} className="border border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <span className="text-4xl">{p.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-muted-foreground text-xs">{p.role}</p>
              </div>
              <div className="text-right">
                <Badge variant={p.score >= 80 ? 'default' : 'secondary'}>{p.verdict}</Badge>
                <p className="text-xs mt-1 font-medium text-foreground">{p.score}%</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   6. Templates
   ════════════════════════════════════════════════ */
export function MockTemplatesScreen() {
  const templates = [
    { name: 'Executive', color: 'bg-slate-800' },
    { name: 'Modern', color: 'bg-blue-600' },
    { name: 'Creative', color: 'bg-purple-600' },
    { name: 'Minimal', color: 'bg-gray-400' },
    { name: 'Bold', color: 'bg-rose-600' },
    { name: 'Classic', color: 'bg-amber-700' },
  ];
  return (
    <div className="flex flex-col h-full bg-background p-6 pt-16">
      <h2 className="text-2xl font-bold text-foreground mb-1">Templates</h2>
      <p className="text-muted-foreground text-sm mb-6">30+ professional designs</p>
      <div className="grid grid-cols-2 gap-4">
        {templates.map((t) => (
          <div key={t.name} className="flex flex-col gap-2">
            <div className={`${t.color} rounded-2xl aspect-[3/4] flex items-end p-4`}>
              {/* Mini resume lines */}
              <div className="w-full space-y-2">
                <div className="h-2 w-3/4 bg-white/30 rounded" />
                <div className="h-1.5 w-full bg-white/20 rounded" />
                <div className="h-1.5 w-5/6 bg-white/20 rounded" />
                <div className="h-1.5 w-2/3 bg-white/20 rounded" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground text-center">{t.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   7. Job Tracker / Kanban
   ════════════════════════════════════════════════ */
export function MockJobTrackerScreen() {
  const columns = [
    {
      title: 'Applied',
      color: 'bg-blue-500',
      items: [
        { company: 'Google', role: 'Senior FE', days: '2d ago' },
        { company: 'Meta', role: 'Staff Eng', days: '5d ago' },
      ],
    },
    {
      title: 'Interview',
      color: 'bg-yellow-500',
      items: [{ company: 'Stripe', role: 'Full-Stack', days: 'Tomorrow' }],
    },
    {
      title: 'Offer',
      color: 'bg-green-500',
      items: [{ company: 'Vercel', role: 'DX Engineer', days: 'Today' }],
    },
  ];
  return (
    <div className="flex flex-col h-full bg-background p-6 pt-16">
      <h2 className="text-2xl font-bold text-foreground mb-1">Applications</h2>
      <p className="text-muted-foreground text-sm mb-6">4 active · 12 total</p>
      <div className="flex flex-col gap-6">
        {columns.map((col) => (
          <div key={col.title}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${col.color}`} />
              <span className="font-semibold text-foreground">{col.title}</span>
              <Badge variant="secondary" className="ml-auto">{col.items.length}</Badge>
            </div>
            <div className="flex flex-col gap-3">
              {col.items.map((item) => (
                <Card key={item.company} className="border border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{item.role}</p>
                      <p className="text-muted-foreground text-xs">{item.company}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{item.days}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   8. Portfolio
   ════════════════════════════════════════════════ */
export function MockPortfolioScreen() {
  return (
    <div className="flex flex-col h-full bg-background p-6 pt-16">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Globe className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Ahmed Hassan</h2>
        <p className="text-muted-foreground text-sm">Senior Software Engineer</p>
        <Badge className="mt-2">🟢 Open to Work</Badge>
      </div>

      <div className="flex gap-4 mb-6">
        {[
          { label: 'Views', value: '1.2K' },
          { label: 'Links', value: '8' },
          { label: 'Score', value: '94%' },
        ].map((s) => (
          <Card key={s.label} className="flex-1 border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-muted-foreground text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="font-semibold text-foreground mb-3">Projects</h3>
      <div className="flex flex-col gap-3">
        {['E-commerce Platform', 'AI Chat Assistant', 'Design System'].map((p) => (
          <Card key={p} className="border border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent-foreground" />
              </div>
              <p className="font-medium text-foreground">{p}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

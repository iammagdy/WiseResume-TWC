import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppLogo } from '@/components/brand/AppLogo';
import {
  Sparkles, FileText, Target, Mic, Users, Briefcase, Globe,
  CheckCircle2, Star, TrendingUp, Zap, Brain, MessageSquare, Eye,
  Award, BookOpen, Palette, Shield, ChevronRight, Search,
} from 'lucide-react';

/* ─── Shared helpers ─── */
const ScoreDot = ({ score, color }: { score: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 rounded-full shadow-lg" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    <span className="text-lg font-bold" style={{ color }}>{score}%</span>
  </div>
);

const StatBox = ({ value, label }: { value: string; label: string }) => (
  <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-sm text-white/60">{label}</p>
  </div>
);

/* ════════════════════════════════════════════════
   1. Hero Screen
   ════════════════════════════════════════════════ */
export function MockHeroScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-8"
      style={{ background: 'linear-gradient(165deg, #0f0c29 0%, #1a1040 30%, #302b63 60%, #24243e 100%)' }}
    >
      <div className="mb-6 scale-150">
        <AppLogo size="lg" showTagline={false} />
      </div>

      <div className="w-20 h-1 rounded-full mb-8" style={{ background: 'linear-gradient(90deg, hsl(262 83% 58%), hsl(330 81% 60%))' }} />

      <h1 className="text-4xl font-extrabold text-white mb-4 text-center leading-tight">
        Land Your<br />Dream Job
      </h1>
      <p className="text-white/70 text-center text-xl mb-10 max-w-[85%] leading-relaxed">
        AI-powered resume builder, interview coach & job tracker — all in one app.
      </p>

      <Button
        size="lg"
        className="rounded-full px-12 text-xl h-16 font-bold shadow-2xl border-0"
        style={{ background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(330 81% 60%))', color: '#fff' }}
      >
        <Sparkles className="w-6 h-6 mr-3" /> Get Started Free
      </Button>

      <div className="flex gap-4 mt-12">
        {[
          { icon: <Star className="w-4 h-4" />, text: '4.9 Rating' },
          { icon: <Users className="w-4 h-4" />, text: '50K+ Users' },
          { icon: <Shield className="w-4 h-4" />, text: '100% Free' },
        ].map((t) => (
          <div
            key={t.text}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
          >
            {t.icon} {t.text}
          </div>
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
    { title: 'Senior Frontend Developer', score: 92, updated: '2 hours ago', color: '#22c55e' },
    { title: 'Full-Stack Engineer', score: 78, updated: 'Yesterday', color: '#eab308' },
    { title: 'Product Manager', score: 85, updated: '3 days ago', color: '#22c55e' },
  ];
  return (
    <div
      className="flex flex-col h-full p-7 pt-16"
      style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #111827 40%, #0f172a 100%)' }}
    >
      <h2 className="text-3xl font-extrabold text-white mb-1">My Resumes</h2>
      <p className="text-white/50 text-base mb-5">3 resumes · 2 tailored</p>

      {/* Stats row */}
      <div className="flex gap-3 mb-6">
        <StatBox value="3" label="Resumes" />
        <StatBox value="2" label="Tailored" />
        <StatBox value="85" label="Avg Score" />
      </div>

      <div className="flex flex-col gap-4">
        {resumes.map((r) => (
          <div
            key={r.title}
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${r.color}20` }}
              >
                <FileText className="w-7 h-7" style={{ color: r.color }} />
              </div>
              <div>
                <p className="font-bold text-white text-lg">{r.title}</p>
                <p className="text-white/40 text-sm">{r.updated}</p>
              </div>
            </div>
            <ScoreDot score={r.score} color={r.color} />
          </div>
        ))}
      </div>

      <Button
        className="mt-6 rounded-full h-14 text-lg font-bold shadow-xl border-0"
        size="lg"
        style={{ background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(330 81% 60%))', color: '#fff' }}
      >
        <Sparkles className="w-5 h-5 mr-2" /> Create New Resume
      </Button>
    </div>
  );
}

/* ════════════════════════════════════════════════
   3. AI Tailoring / AI Studio
   ════════════════════════════════════════════════ */
export function MockAIStudioScreen() {
  const tools = [
    { icon: <Target className="w-8 h-8" />, label: 'Job Tailoring', desc: 'Match to any job', bg: '#3b82f620', fg: '#60a5fa' },
    { icon: <Brain className="w-8 h-8" />, label: 'Smart Enhance', desc: 'AI-powered rewrite', bg: '#a855f720', fg: '#c084fc' },
    { icon: <TrendingUp className="w-8 h-8" />, label: 'ATS Analyzer', desc: 'Score & optimize', bg: '#22c55e20', fg: '#4ade80' },
    { icon: <Users className="w-8 h-8" />, label: 'Recruiter Sim', desc: '4 AI personas', bg: '#f9731620', fg: '#fb923c' },
    { icon: <Zap className="w-8 h-8" />, label: 'One-Page Mode', desc: 'Auto condense', bg: '#eab30820', fg: '#facc15' },
  ];
  return (
    <div
      className="flex flex-col h-full p-7 pt-16"
      style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #0f172a 40%, #1e1b4b 100%)' }}
    >
      <h2 className="text-3xl font-extrabold text-white mb-1">AI Studio</h2>
      <p className="text-white/50 text-base mb-5">Smart tools for your resume</p>

      {/* AI Chat banner */}
      <div
        className="rounded-2xl p-5 mb-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, hsl(262 83% 58% / 0.2), hsl(330 81% 60% / 0.15))', border: '1px solid rgba(168,85,247,0.2)' }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'hsl(262 83% 58% / 0.3)' }}>
          <MessageSquare className="w-6 h-6" style={{ color: '#c084fc' }} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-white text-base">Wise AI Chat</p>
          <p className="text-white/50 text-sm">Ask anything about your resume</p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/30" />
      </div>

      {/* Prompt chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['Improve summary', 'Add metrics', 'Fix grammar'].map((c) => (
          <div key={c} className="px-4 py-2 rounded-full text-sm font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
            {c}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {tools.map((t) => (
          <div
            key={t.label}
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: t.bg }}>
              <span style={{ color: t.fg }}>{t.icon}</span>
            </div>
            <p className="font-bold text-white text-base">{t.label}</p>
            <p className="text-white/40 text-sm">{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Credits bar */}
      <div className="mt-auto pt-4 flex items-center gap-3">
        <Zap className="w-5 h-5" style={{ color: '#facc15' }} />
        <div className="flex-1">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full" style={{ width: '65%', background: 'linear-gradient(90deg, #facc15, #f97316)' }} />
          </div>
        </div>
        <span className="text-sm font-medium text-white/60">13/20 credits</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   4. Mock Interview
   ════════════════════════════════════════════════ */
export function MockInterviewScreen() {
  return (
    <div
      className="flex flex-col items-center h-full p-7 pt-16"
      style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #111827 40%, #1e1b4b 100%)' }}
    >
      <h2 className="text-3xl font-extrabold text-white mb-1">Mock Interview</h2>
      <p className="text-white/50 text-base mb-4">AI Voice Coach</p>

      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-sm text-white/50 mb-2">
          <span>Question 3 of 8</span>
          <span>Technical Round</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full" style={{ width: '37.5%', background: 'linear-gradient(90deg, hsl(262 83% 58%), hsl(330 81% 60%))' }} />
        </div>
      </div>

      {/* Waveform */}
      <div className="w-full flex items-center justify-center gap-1 my-6" style={{ height: 120 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="w-2.5 rounded-full"
            style={{
              height: `${25 + Math.sin(i * 0.5) * 50 + Math.random() * 30}%`,
              background: `linear-gradient(to top, hsl(262 83% 58%), hsl(330 81% 60%))`,
              opacity: 0.6 + Math.sin(i * 0.3) * 0.3,
            }}
          />
        ))}
      </div>

      {/* Question card */}
      <div
        className="w-full rounded-2xl p-6 mb-6"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-white font-semibold text-lg mb-2">"Tell me about your experience with React…"</p>
        <p className="text-white/40 text-sm">Tap the mic to answer or skip this question</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mt-auto mb-6 w-full">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full flex-1 h-14 text-lg font-bold"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: 'rgba(255,255,255,0.15)' }}
        >
          Skip
        </Button>
        <Button
          size="lg"
          className="rounded-full flex-[2] h-14 text-lg font-bold shadow-xl border-0"
          style={{ background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(330 81% 60%))', color: '#fff' }}
        >
          <Mic className="w-6 h-6 mr-2" /> Answer
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <span className="text-white/70 text-sm font-medium">⏱ 14:32</span>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)' }}>
          <span className="text-sm font-bold" style={{ color: '#4ade80' }}>🎯 Score: 82%</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   5. Recruiter Simulator
   ════════════════════════════════════════════════ */
export function MockRecruiterScreen() {
  const personas = [
    { name: 'Sarah', role: 'Tech Recruiter', verdict: 'Strong Hire', emoji: '👩‍💼', score: 88, verdictColor: '#4ade80' },
    { name: 'Marcus', role: 'Hiring Manager', verdict: 'Hire', emoji: '👨‍💻', score: 76, verdictColor: '#60a5fa' },
    { name: 'Priya', role: 'HR Director', verdict: 'Strong Hire', emoji: '👩‍🏫', score: 91, verdictColor: '#4ade80' },
    { name: 'James', role: 'Senior Recruiter', verdict: 'Consider', emoji: '🧑‍💼', score: 68, verdictColor: '#facc15' },
  ];
  return (
    <div
      className="flex flex-col h-full p-7 pt-16"
      style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #111827 40%, #1a1040 100%)' }}
    >
      <h2 className="text-3xl font-extrabold text-white mb-1">Recruiter Simulator</h2>
      <p className="text-white/50 text-base mb-6">4 AI personas reviewed your resume</p>

      {/* Overall verdict */}
      <div
        className="rounded-2xl p-5 mb-6 flex items-center gap-4"
        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: '#4ade80' }} />
        <div>
          <p className="font-bold text-white text-lg">Overall: Strong Hire</p>
          <p className="text-white/50 text-sm">Average score: 81%</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {personas.map((p) => (
          <div
            key={p.name}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-4xl">{p.emoji}</span>
            <div className="flex-1">
              <p className="font-bold text-white text-base">{p.name}</p>
              <p className="text-white/40 text-sm">{p.role}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${p.verdictColor}20`, color: p.verdictColor }}>
                {p.verdict}
              </div>
              <p className="text-sm font-bold" style={{ color: p.verdictColor }}>{p.score}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   6. Templates
   ════════════════════════════════════════════════ */
export function MockTemplatesScreen() {
  const filters = ['All', 'Modern', 'Classic', 'Creative'];
  const templates = [
    { name: 'Executive', color: '#1e293b' },
    { name: 'Modern', color: '#2563eb' },
    { name: 'Creative', color: '#9333ea' },
    { name: 'Minimal', color: '#64748b' },
    { name: 'Bold', color: '#e11d48' },
    { name: 'Classic', color: '#92400e' },
  ];
  return (
    <div
      className="flex flex-col h-full p-7 pt-16"
      style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #111827 40%, #0f172a 100%)' }}
    >
      <h2 className="text-3xl font-extrabold text-white mb-1">Templates</h2>
      <p className="text-white/50 text-base mb-5">30+ professional designs</p>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6">
        {filters.map((f, i) => (
          <div
            key={f}
            className="px-5 py-2.5 rounded-full text-sm font-bold"
            style={{
              background: i === 0 ? 'linear-gradient(135deg, hsl(262 83% 58%), hsl(330 81% 60%))' : 'rgba(255,255,255,0.08)',
              color: i === 0 ? '#fff' : 'rgba(255,255,255,0.6)',
            }}
          >
            {f}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {templates.map((t) => (
          <div key={t.name} className="flex flex-col gap-2">
            <div
              className="rounded-2xl aspect-[3/4] flex items-end p-5 relative overflow-hidden"
              style={{ background: t.color }}
            >
              {/* Header line */}
              <div className="absolute top-5 left-5 right-5 space-y-3">
                <div className="h-3 w-1/2 bg-white/25 rounded" />
                <div className="h-1 w-full bg-white/10 rounded" />
              </div>
              {/* Body lines */}
              <div className="w-full space-y-2.5">
                <div className="h-2 w-3/4 bg-white/20 rounded" />
                <div className="h-2 w-full bg-white/15 rounded" />
                <div className="h-2 w-5/6 bg-white/15 rounded" />
                <div className="h-2 w-2/3 bg-white/15 rounded" />
                <div className="h-2 w-4/5 bg-white/10 rounded" />
              </div>
            </div>
            <p className="text-base font-bold text-white text-center">{t.name}</p>
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
      title: 'Applied', color: '#3b82f6',
      items: [
        { company: 'Google', role: 'Senior FE', days: '2d ago' },
        { company: 'Meta', role: 'Staff Eng', days: '5d ago' },
      ],
    },
    {
      title: 'Interview', color: '#eab308',
      items: [{ company: 'Stripe', role: 'Full-Stack', days: 'Tomorrow' }],
    },
    {
      title: 'Offer', color: '#22c55e',
      items: [{ company: 'Vercel', role: 'DX Engineer', days: 'Today' }],
    },
  ];
  return (
    <div
      className="flex flex-col h-full p-7 pt-16"
      style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #111827 40%, #0f172a 100%)' }}
    >
      <h2 className="text-3xl font-extrabold text-white mb-1">Applications</h2>
      <p className="text-white/50 text-base mb-5">4 active · 12 total</p>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <StatBox value="4" label="Active" />
        <StatBox value="12" label="Total" />
        <StatBox value="75%" label="Response" />
      </div>

      <div className="flex flex-col gap-6">
        {columns.map((col) => (
          <div key={col.title}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3.5 h-3.5 rounded-full" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
              <span className="font-bold text-white text-lg">{col.title}</span>
              <div className="ml-auto px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                {col.items.length}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {col.items.map((item) => (
                <div
                  key={item.company}
                  className="rounded-2xl p-5 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div>
                    <p className="font-bold text-white text-base">{item.role}</p>
                    <p className="text-white/40 text-sm">{item.company}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: `${col.color}15`, color: col.color }}>
                    {item.days}
                  </div>
                </div>
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
    <div
      className="flex flex-col h-full p-7 pt-16"
      style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #1a1040 40%, #111827 100%)' }}
    >
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, hsl(262 83% 58% / 0.3), hsl(330 81% 60% / 0.3))', border: '2px solid rgba(168,85,247,0.3)' }}
        >
          <Globe className="w-12 h-12" style={{ color: '#c084fc' }} />
        </div>
        <h2 className="text-3xl font-extrabold text-white">Ahmed Hassan</h2>
        <p className="text-white/50 text-base">Senior Software Engineer</p>
        <div
          className="mt-3 px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#4ade80' }} />
          Open to Work
        </div>
      </div>

      <div className="flex gap-3 mb-7">
        <StatBox value="1.2K" label="Views" />
        <StatBox value="8" label="Links" />
        <StatBox value="94%" label="Score" />
      </div>

      <h3 className="font-bold text-white text-lg mb-4">Projects</h3>
      <div className="flex flex-col gap-3">
        {[
          { name: 'E-commerce Platform', icon: <Briefcase className="w-6 h-6" />, color: '#60a5fa' },
          { name: 'AI Chat Assistant', icon: <MessageSquare className="w-6 h-6" />, color: '#c084fc' },
          { name: 'Design System', icon: <Palette className="w-6 h-6" />, color: '#fb923c' },
        ].map((p) => (
          <div
            key={p.name}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${p.color}20` }}>
              <span style={{ color: p.color }}>{p.icon}</span>
            </div>
            <p className="font-bold text-white text-base">{p.name}</p>
            <ChevronRight className="w-5 h-5 text-white/20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

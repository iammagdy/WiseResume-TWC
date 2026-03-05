import { useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ZoomIn, ChevronDown, ChevronUp } from 'lucide-react';
import { CareerMap, CareerMapRole } from '@/lib/careerPath';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { PORTFOLIO_DOMAIN } from '@/lib/portfolioUrl';

interface Props {
  careerMap: CareerMap;
}

/* ── Branch accent colors ── */
const BRANCH_COLORS = [
  { bg: 'from-violet-500/20 to-purple-600/20', border: 'border-violet-500/40', dot: 'bg-violet-500', glow: 'shadow-violet-500/20', text: 'text-violet-400', line: '#8b5cf6' },
  { bg: 'from-cyan-500/20 to-blue-600/20', border: 'border-cyan-500/40', dot: 'bg-cyan-500', glow: 'shadow-cyan-500/20', text: 'text-cyan-400', line: '#06b6d4' },
  { bg: 'from-amber-500/20 to-orange-600/20', border: 'border-amber-500/40', dot: 'bg-amber-500', glow: 'shadow-amber-500/20', text: 'text-amber-400', line: '#f59e0b' },
  { bg: 'from-emerald-500/20 to-green-600/20', border: 'border-emerald-500/40', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/20', text: 'text-emerald-400', line: '#10b981' },
  { bg: 'from-rose-500/20 to-pink-600/20', border: 'border-rose-500/40', dot: 'bg-rose-500', glow: 'shadow-rose-500/20', text: 'text-rose-400', line: '#f43f5e' },
];

function getReadinessLabel(timeframe: string): { label: string; color: string } {
  const lower = timeframe.toLowerCase();
  if (lower.includes('now') || lower.includes('ready') || lower.includes('1-3 month'))
    return { label: 'Ready', color: 'bg-emerald-500' };
  if (lower.includes('3') || lower.includes('6') || lower.includes('month'))
    return { label: '3-6 mo', color: 'bg-amber-500' };
  return { label: '1+ yr', color: 'bg-rose-500' };
}

/* ── Mini score ring ── */
function MiniScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={center} cy={center} r={radius}
          stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e'}
          strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-white/90">{score}%</span>
      </div>
    </div>
  );
}

/* ── Role node card ── */
function RoleNode({
  role,
  branchColor,
  index,
  branchIndex,
}: {
  role: CareerMapRole;
  branchColor: typeof BRANCH_COLORS[0];
  index: number;
  branchIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const readiness = getReadinessLabel(role.timeframe);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.2 + branchIndex * 0.15 + index * 0.1, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative w-40 shrink-0 rounded-2xl border backdrop-blur-md p-3 cursor-pointer',
        'bg-gradient-to-br', branchColor.bg, branchColor.border,
        'shadow-lg', branchColor.glow,
        'transition-all duration-200 active:scale-95'
      )}
      onClick={() => { setExpanded(!expanded); haptics.light(); }}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <MiniScoreRing score={role.matchScore} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-tight truncate">{role.title}</p>
          <div className="flex items-center gap-1 mt-1">
            <div className={cn('w-1.5 h-1.5 rounded-full', readiness.color)} />
            <span className="text-[10px] text-white/60">{role.timeframe}</span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <div className="flex justify-center mt-1.5">
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-white/40" />
        ) : (
          <ChevronDown className="w-3 h-3 text-white/40" />
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && role.requiredSkills.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-white/10 mt-1.5">
              <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Skills needed</p>
              <div className="flex flex-wrap gap-1">
                {role.requiredSkills.slice(0, 5).map((s, si) => (
                  <span key={si} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CareerMindmap({ careerMap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return;
    haptics.medium();
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = 'career-mindmap.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Mindmap downloaded!');
    } catch {
      toast.error('Failed to download mindmap');
    }
  }, []);

  if (!careerMap) return null;

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-primary" />
            Career Mindmap
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 gap-1 text-xs">
            <Download className="w-3.5 h-3.5" />
            PNG
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div
            ref={containerRef}
            className="relative min-w-[520px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-8 pb-4"
          >
            {/* ── Watermark ── */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
              aria-hidden="true"
            >
              <span
                className="text-white/[0.04] text-6xl font-black tracking-widest uppercase"
                style={{ transform: 'rotate(-25deg)' }}
              >
                WiseResume
              </span>
            </div>

            {/* ── Central Node ── */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-3 rounded-full bg-primary/20 blur-xl animate-pulse" />
                <div className="relative px-6 py-4 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground text-center shadow-2xl shadow-primary/30 border border-white/10">
                  <p className="font-bold text-sm tracking-tight">{careerMap.current.title}</p>
                  <p className="text-[11px] opacity-70 capitalize mt-0.5">{careerMap.current.level} Level</p>
                </div>
              </div>
            </motion.div>

            {/* ── Branches ── */}
            <div className="space-y-6">
              {careerMap.branches.map((branch, bi) => {
                const color = BRANCH_COLORS[bi % BRANCH_COLORS.length];
                return (
                  <motion.div
                    key={bi}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + bi * 0.12, duration: 0.4 }}
                  >
                    {/* Branch connector line from center */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative flex items-center gap-2">
                        {/* Connecting dot */}
                        <div className={cn('w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-slate-900', color.dot, `ring-${color.dot.replace('bg-', '')}/30`)} />
                        {/* Horizontal connector line */}
                        <div className="w-8 h-px" style={{ background: `linear-gradient(90deg, ${color.line}, transparent)` }} />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: color.line }}>
                        {branch.direction}
                      </p>
                      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color.line}33, transparent)` }} />
                    </div>

                    {/* Role nodes */}
                    <div className="flex gap-3 overflow-x-auto pb-2 pl-6 scrollbar-hide">
                      {branch.roles.map((role, ri) => (
                        <RoleNode key={ri} role={role} branchColor={color} index={ri} branchIndex={bi} />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 mt-6 pt-3 border-t border-white/10">
              <p className="text-[10px] text-white/40">Readiness:</p>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-white/50">Ready now</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-white/50">3-6 months</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[10px] text-white/50">1+ year</span></div>
            </div>

            {/* ── Branded Footer (visible in PNG) ── */}
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-white/10">
              <span className="text-[10px] text-white/30">Made with</span>
              <span className="text-[10px] font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>
                WiseResume AI
              </span>
              <span className="text-[10px] text-white/20">•</span>
              <span className="text-[10px] text-white/30">{PORTFOLIO_DOMAIN.replace('https://', '')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

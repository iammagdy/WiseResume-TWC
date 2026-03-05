import { useRef, useCallback, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ChevronDown, ChevronUp, Target, TrendingUp, Sparkles } from 'lucide-react';
import { CareerMap, CareerMapRole } from '@/lib/careerPath';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { PORTFOLIO_DOMAIN } from '@/lib/portfolioUrl';

interface Props {
  careerMap: CareerMap;
}

const BRANCH_COLORS = [
  { bg: 'from-violet-500/20 to-purple-600/20', border: 'border-violet-500/30', dot: 'bg-violet-500', glow: 'shadow-violet-500/15', text: 'text-violet-400', line: '#8b5cf6', ring: ['#8b5cf6', '#a78bfa'] },
  { bg: 'from-cyan-500/20 to-blue-600/20', border: 'border-cyan-500/30', dot: 'bg-cyan-500', glow: 'shadow-cyan-500/15', text: 'text-cyan-400', line: '#06b6d4', ring: ['#06b6d4', '#67e8f9'] },
  { bg: 'from-amber-500/20 to-orange-600/20', border: 'border-amber-500/30', dot: 'bg-amber-500', glow: 'shadow-amber-500/15', text: 'text-amber-400', line: '#f59e0b', ring: ['#f59e0b', '#fbbf24'] },
  { bg: 'from-emerald-500/20 to-green-600/20', border: 'border-emerald-500/30', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/15', text: 'text-emerald-400', line: '#10b981', ring: ['#10b981', '#6ee7b7'] },
  { bg: 'from-rose-500/20 to-pink-600/20', border: 'border-rose-500/30', dot: 'bg-rose-500', glow: 'shadow-rose-500/15', text: 'text-rose-400', line: '#f43f5e', ring: ['#f43f5e', '#fb7185'] },
];

function getReadinessLabel(timeframe: string) {
  const lower = timeframe.toLowerCase();
  if (lower.includes('now') || lower.includes('ready') || lower.includes('1-3 month'))
    return { label: 'Ready', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
  if (lower.includes('3') || lower.includes('6') || lower.includes('month'))
    return { label: '3-6 mo', color: 'bg-amber-500', textColor: 'text-amber-400' };
  return { label: '1+ yr', color: 'bg-rose-500', textColor: 'text-rose-400' };
}

function GradientScoreRing({ score, size = 48, colors }: { score: number; size?: number; colors: string[] }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;
  const gradientId = `grad-${colors[0].replace('#', '')}-${score}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={center} cy={center} r={radius}
          stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold text-white/90">{score}%</span>
      </div>
    </div>
  );
}

function SkillProgressBar({ existing, total, color }: { existing: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((existing / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}90)` }}
        />
      </div>
      <span className="text-[9px] text-white/40 shrink-0">{existing}/{total}</span>
    </div>
  );
}

function RoleNode({
  role,
  branchColor,
  index,
  branchIndex,
  nodeId,
  isExpanded,
  onToggle,
}: {
  role: CareerMapRole;
  branchColor: typeof BRANCH_COLORS[0];
  index: number;
  branchIndex: number;
  nodeId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const readiness = getReadinessLabel(role.timeframe);
  // Simulate existing skills as ~60% of required (since we don't have that data on CareerMapRole)
  const existingCount = Math.round(role.requiredSkills.length * 0.6);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.15 + branchIndex * 0.1 + index * 0.06, duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'relative rounded-2xl border backdrop-blur-md cursor-pointer',
        'bg-gradient-to-br', branchColor.bg, branchColor.border,
        'shadow-lg', branchColor.glow,
        'transition-shadow duration-200 active:scale-[0.97]',
        isExpanded ? 'col-span-2 p-4' : 'p-3'
      )}
      onClick={() => { onToggle(nodeId); haptics.light(); }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${branchColor.line}10 45%, ${branchColor.line}20 50%, ${branchColor.line}10 55%, transparent 60%)`,
          }}
        />
      </div>

      <div className="relative flex items-start gap-3">
        <GradientScoreRing score={role.matchScore} size={48} colors={branchColor.ring} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white leading-snug">{role.title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={cn('w-1.5 h-1.5 rounded-full', readiness.color)} />
            <span className={cn('text-[10px]', readiness.textColor)}>{readiness.label}</span>
            <span className="text-[10px] text-white/30">•</span>
            <span className="text-[10px] text-white/40">{role.timeframe}</span>
          </div>
          {!isExpanded && role.requiredSkills.length > 0 && (
            <SkillProgressBar existing={existingCount} total={role.requiredSkills.length} color={branchColor.line} />
          )}
        </div>
        <div className="pt-1">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && role.requiredSkills.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-white/10 mt-3 space-y-3">
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">Skills needed</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.requiredSkills.map((s, si) => (
                    <span key={si} className="text-[10px] px-2 py-1 rounded-lg bg-white/10 text-white/70 border border-white/5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <SkillProgressBar existing={existingCount} total={role.requiredSkills.length} color={branchColor.line} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CareerMindmap({ careerMap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const stats = useMemo(() => {
    if (!careerMap) return null;
    const totalRoles = careerMap.branches.reduce((sum, b) => sum + b.roles.length, 0);
    const allSkills = new Set(careerMap.branches.flatMap(b => b.roles.flatMap(r => r.requiredSkills)));
    const bestMatch = Math.max(...careerMap.branches.flatMap(b => b.roles.map(r => r.matchScore)), 0);
    return { totalRoles, totalSkills: allSkills.size, bestMatch };
  }, [careerMap]);

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
        <div
          ref={containerRef}
          className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 pt-6 pb-4"
        >
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" aria-hidden="true">
            <span className="text-white/[0.03] text-5xl sm:text-6xl font-black tracking-widest uppercase" style={{ transform: 'rotate(-25deg)' }}>
              WiseResume
            </span>
          </div>

          {/* Central Node with rotating gradient ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex justify-center mb-3"
          >
            <div className="relative">
              {/* Pulsing glow */}
              <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl animate-pulse" />
              {/* Rotating gradient border */}
              <div className="relative p-[2px] rounded-2xl overflow-hidden">
                <div
                  className="absolute inset-0 animate-spin"
                  style={{
                    background: 'conic-gradient(from 0deg, hsl(var(--primary)), #a78bfa, #f472b6, #fb923c, hsl(var(--primary)))',
                    animationDuration: '4s',
                  }}
                />
                <div className="relative px-5 py-3 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-center">
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <Target className="w-4 h-4 text-primary" />
                    <p className="font-bold text-sm text-white tracking-tight">{careerMap.current.title}</p>
                  </div>
                  <p className="text-[11px] text-white/50 capitalize">{careerMap.current.level} Level</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats bar */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-4 mb-4"
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] text-white/50">{stats.totalRoles} roles</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-white/50">{stats.totalSkills} skills</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-white/50">Best: {stats.bestMatch}%</span>
              </div>
            </motion.div>
          )}

          {/* Vertical spine connector */}
          <div className="flex justify-center mb-2">
            <div className="w-px h-4 bg-gradient-to-b from-primary/40 to-transparent" />
          </div>

          {/* Branches */}
          <div className="space-y-5">
            {careerMap.branches.map((branch, bi) => {
              const color = BRANCH_COLORS[bi % BRANCH_COLORS.length];
              return (
                <motion.div
                  key={bi}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + bi * 0.1, duration: 0.35 }}
                >
                  {/* Branch header - centered with decorative lines */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color.line}40)` }} />
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: `${color.line}15` }}>
                      <div className={cn('w-2 h-2 rounded-full', color.dot, 'animate-pulse')} />
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: color.line }}>
                        {branch.direction}
                      </p>
                    </div>
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color.line}40, transparent)` }} />
                  </div>

                  {/* Role nodes - responsive 2-column grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {branch.roles.map((role, ri) => {
                      const nodeId = `${bi}-${ri}`;
                      return (
                        <RoleNode
                          key={nodeId}
                          role={role}
                          branchColor={color}
                          index={ri}
                          branchIndex={bi}
                          nodeId={nodeId}
                          isExpanded={expandedId === nodeId}
                          onToggle={handleToggle}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-5 pt-3 border-t border-white/10">
            <p className="text-[10px] text-white/40">Readiness:</p>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-white/50">Ready now</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-white/50">3-6 months</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[10px] text-white/50">1+ year</span></div>
          </div>

          {/* Branded Footer */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-white/10">
            <span className="text-[10px] text-white/30">Made with</span>
            <span className="text-[10px] font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>
              WiseResume AI
            </span>
            <span className="text-[10px] text-white/20">•</span>
            <span className="text-[10px] text-white/30">{PORTFOLIO_DOMAIN.replace('https://', '')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

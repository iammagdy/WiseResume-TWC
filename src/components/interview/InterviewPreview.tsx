import { motion } from 'framer-motion';
import { Sparkles, Rocket, Brain, MessageSquare, Target, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RoleAnalysis } from '@/hooks/useVoiceInterview';

interface InterviewPreviewProps {
  roleAnalysis: RoleAnalysis | null;
  isLoading: boolean;
  onReady: () => void;
}

const categoryIcons: Record<string, typeof Brain> = {
  Technical: Brain,
  Behavioral: MessageSquare,
  Situational: Target,
  'Culture Fit': Users,
  'System Design': Brain,
  Leadership: Users,
};

export function InterviewPreview({ roleAnalysis, isLoading, onReady }: InterviewPreviewProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-6 px-4 py-12 max-w-lg mx-auto text-center"
      >
        <div className="relative w-20 h-20">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-3 rounded-full bg-card/60 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">Wise AI is Researching...</h2>
          <p className="text-sm text-muted-foreground">Analyzing the role, market trends, and preparing tailored questions</p>
        </div>
      </motion.div>
    );
  }

  if (!roleAnalysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 px-4 py-6 max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Interview Preview</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">{roleAnalysis.title}</h2>
      </div>

      {/* Key Skills */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Key Skills Being Tested</h3>
        <div className="flex flex-wrap gap-2">
          {roleAnalysis.keySkills.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 border border-primary/20 text-primary"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Question Categories */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Question Categories</h3>
        <div className="grid grid-cols-2 gap-2">
          {roleAnalysis.questionCategories.map((cat, i) => {
            const Icon = categoryIcons[cat] || MessageSquare;
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{cat}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Industry Insights */}
      <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wide">Market Insight</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{roleAnalysis.industryInsights}</p>
      </div>

      {/* Ready button */}
      <Button
        onClick={onReady}
        size="lg"
        className="w-full text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
      >
        <Rocket className="w-5 h-5 mr-2" />
        I'm Ready — Start Interview
      </Button>
    </motion.div>
  );
}

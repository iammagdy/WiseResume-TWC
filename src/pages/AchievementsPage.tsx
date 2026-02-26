import { useMemo } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  FileText, Target, Briefcase, Flame, Trophy, Star, Lock, Share2,
  Award, Zap, BookOpen, Sparkles,
} from 'lucide-react';
import { useResumes } from '@/hooks/useResumes';
import { useJobApplications } from '@/hooks/useJobApplications';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useResumeScore } from '@/hooks/useResumeScore';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  check: (ctx: AchievementContext) => boolean;
  xp: number;
}

interface AchievementContext {
  resumeCount: number;
  appCount: number;
  maxScore: number;
  streak: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-resume', title: 'First Steps', description: 'Create your first resume', icon: FileText, check: (c) => c.resumeCount >= 1, xp: 10 },
  { id: '3-resumes', title: 'Portfolio Builder', description: 'Create 3 resumes', icon: BookOpen, check: (c) => c.resumeCount >= 3, xp: 25 },
  { id: '5-resumes', title: 'Resume Expert', description: 'Create 5 resumes', icon: Award, check: (c) => c.resumeCount >= 5, xp: 50 },
  { id: 'first-app', title: 'Job Seeker', description: 'Track your first application', icon: Briefcase, check: (c) => c.appCount >= 1, xp: 10 },
  { id: '5-apps', title: 'Active Applicant', description: 'Track 5 applications', icon: Zap, check: (c) => c.appCount >= 5, xp: 30 },
  { id: 'score-60', title: 'Getting There', description: 'Achieve 60+ ATS score', icon: Target, check: (c) => c.maxScore >= 60, xp: 15 },
  { id: 'score-80', title: 'ATS Master', description: 'Achieve 80+ ATS score', icon: Star, check: (c) => c.maxScore >= 80, xp: 40 },
  { id: 'score-95', title: 'Perfect Score', description: 'Achieve 95+ ATS score', icon: Trophy, check: (c) => c.maxScore >= 95, xp: 100 },
  { id: 'streak-3', title: 'Consistent', description: '3-day login streak', icon: Flame, check: (c) => c.streak >= 3, xp: 15 },
  { id: 'streak-7', title: 'Dedicated', description: '7-day login streak', icon: Flame, check: (c) => c.streak >= 7, xp: 35 },
  { id: 'streak-30', title: 'Unstoppable', description: '30-day login streak', icon: Sparkles, check: (c) => c.streak >= 30, xp: 100 },
  { id: '10-apps', title: 'Power Applicant', description: 'Track 10 applications', icon: Briefcase, check: (c) => c.appCount >= 10, xp: 50 },
];

export default function AchievementsPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { data: applications = [] } = useJobApplications();
  const { getCachedScore } = useResumeScore();

  const ctx: AchievementContext = useMemo(() => {
    const scores = resumes
      .map(r => getCachedScore(r.id, r.updated_at)?.overallScore)
      .filter((s): s is number => s != null);
    return {
      resumeCount: resumes.length,
      appCount: applications.length,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      streak: profile?.loginStreak ?? 0,
    };
  }, [resumes, applications, getCachedScore, profile]);

  const earned = ACHIEVEMENTS.filter(a => a.check(ctx));
  const locked = ACHIEVEMENTS.filter(a => !a.check(ctx));
  const totalXP = earned.reduce((sum, a) => sum + a.xp, 0);
  const maxXP = ACHIEVEMENTS.reduce((sum, a) => sum + a.xp, 0);
  const level = Math.floor(totalXP / 50) + 1;
  const levelProgress = ((totalXP % 50) / 50) * 100;

  const handleShare = () => {
    haptics.light();
    toast('Achievement sharing coming soon!', { icon: '🏆' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 glass-header backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Achievements</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="w-9 h-9" onClick={handleShare} aria-label="Share achievements">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Level & XP */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg">Level {level}</span>
              </div>
              <span className="text-sm text-muted-foreground">{totalXP} / {maxXP} XP</span>
            </div>
            <Progress value={levelProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">{50 - (totalXP % 50)} XP to next level</p>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{earned.length}</p><p className="text-[10px] text-muted-foreground">Earned</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{locked.length}</p><p className="text-[10px] text-muted-foreground">Locked</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{ctx.streak}</p><p className="text-[10px] text-muted-foreground">Streak</p></CardContent></Card>
        </div>

        {/* Earned */}
        {earned.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Earned ({earned.length})</h2>
            <div className="grid grid-cols-2 gap-3">
              {earned.map((a) => (
                <Card key={a.id} className="border-primary/20">
                  <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <a.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold leading-tight">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{a.description}</p>
                    <span className="text-[10px] font-bold text-primary">+{a.xp} XP</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Locked */}
        {locked.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Locked ({locked.length})</h2>
            <div className="grid grid-cols-2 gap-3">
              {locked.map((a) => (
                <Card key={a.id} className="opacity-60">
                  <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-semibold leading-tight">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{a.description}</p>
                    <span className="text-[10px] font-medium text-muted-foreground">+{a.xp} XP</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

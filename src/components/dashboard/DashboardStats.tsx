import { useMemo, useEffect, useState, useRef, memo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { FileText, Flame, Lightbulb, X, Star, Target, Hash, ChevronDown } from 'lucide-react';

import { ResumeHealthScore } from '@/hooks/useResumeScore';

import { DatabaseResume } from '@/hooks/useResumes';

import { databases, DATABASE_ID, Query } from '@/lib/appwrite';

import { COLLECTIONS } from '@/lib/appwrite-collections';

import { cn } from '@/lib/utils';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';



function useLoginStreak(userId?: string | null) {

  const cacheKey = userId ? `wr-streak-${userId}` : 'wr-streak-guest';

  const [streak, setStreak] = useState(() => {

    try {

      const cached = localStorage.getItem(cacheKey);

      return cached ? parseInt(cached, 10) : 1;

    } catch { return 1; }

  });

  const syncedForUserId = useRef<string | null | undefined>(undefined);



  useEffect(() => {

    if (syncedForUserId.current === userId) return;

    syncedForUserId.current = userId;



    const LS_KEY = 'wise_resume_streak';

    const LS_LAST = 'wise_resume_last_login';

    const today = new Date().toDateString();



    const computeNewStreak = (lastLogin: string | null, currentStreak: number): number => {

      if (lastLogin === today) return currentStreak;

      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);

      if (lastLogin === yesterday.toDateString()) return currentStreak + 1;

      return 1;

    };



    if (!userId) {

      const lastLogin = localStorage.getItem(LS_LAST);

      const stored = parseInt(localStorage.getItem(LS_KEY) || '1', 10);

      if (lastLogin === today) { setStreak(stored); return; }

      const newStreak = computeNewStreak(lastLogin, stored);

      localStorage.setItem(LS_KEY, String(newStreak));

      localStorage.setItem(LS_LAST, today);

      setStreak(newStreak);

      return;

    }



    const runWithProfile = async () => {

      try {

        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [

          Query.equal('user_id', userId),

          Query.select(['$id', 'last_login_date', 'streak_count']),

          Query.limit(1),

        ]);

        const doc = res.documents[0];

        if (!doc) throw new Error('no profile');



        const lastLogin = (doc.last_login_date as string) ?? null;

        const storedCount = (doc.streak_count as number) ?? 1;



        if (lastLogin === today) {

          setStreak(storedCount);

          localStorage.setItem(LS_KEY, String(storedCount));

          localStorage.setItem(LS_LAST, today);

          return;

        }



        const newStreak = computeNewStreak(lastLogin, storedCount);

        setStreak(newStreak);

        localStorage.setItem(LS_KEY, String(newStreak));

        localStorage.setItem(LS_LAST, today);



        await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, doc.$id, {

          last_login_date: today,

          streak_count: newStreak,

        });

      } catch {

        const lastLogin = localStorage.getItem(LS_LAST);

        const stored = parseInt(localStorage.getItem(LS_KEY) || '1', 10);

        if (lastLogin === today) { setStreak(stored); return; }

        const newStreak = computeNewStreak(lastLogin, stored);

        localStorage.setItem(LS_KEY, String(newStreak));

        localStorage.setItem(LS_LAST, today);

        setStreak(newStreak);

      }

    };



    runWithProfile();

  }, [userId]);



  useEffect(() => {

    try { localStorage.setItem(cacheKey, String(streak)); } catch { /* ignore */ }

  }, [streak, cacheKey]);



  return streak;

}



const motivationalSubtitles = [

  "Let's create something amazing today!",

  "Your next opportunity starts here",

  "One great resume away from your dream job",

  "Today is the perfect day to stand out",

];



const tips = [
  'Tailoring your resume to each job description tends to increase callbacks.',
  'Use numbers and metrics — recruiters skim quickly, so quantified results stand out.',
  'A strong summary section helps recruiters grasp your value at a glance.',
  'Keep your resume to one page if you have under 10 years of experience.',
  'Use action verbs like "led", "built", and "improved" to stand out.',
  'Adding relevant keywords from the job posting helps you pass ATS filters.',
  'Proofread your resume twice — typos are one of the fastest ways to get screened out.',
  'Quantify achievements: "Increased revenue by 25%" reads stronger than vague claims.',
  'Update your resume every few months, even if you\'re not job hunting.',
];



interface DashboardStatsProps {

  totalResumes: number;

  healthScores: Record<string, ResumeHealthScore>;

  userName?: string | null;

  isScoring?: boolean;

  resumes?: DatabaseResume[];

  loginStreak?: number;

  userId?: string | null;

  tailoredCount?: number;

  missingKeywordsCount?: number;

  /** When true, only render the Atlas metric strip (page header is separate). */

  metricsOnly?: boolean;

}



export const DashboardStats = memo(function DashboardStats({

  totalResumes,

  healthScores,

  userName,

  isScoring = false,

  loginStreak: externalStreak,

  userId,

  tailoredCount = 0,

  missingKeywordsCount = 0,

  metricsOnly = false,

}: DashboardStatsProps) {

  const appwriteStreak = useLoginStreak(userId);

  const streak = externalStreak ?? appwriteStreak;

  const [subtitleIndex, setSubtitleIndex] = useState(0);

  const [tipDismissed, setTipDismissed] = useState(() => !!localStorage.getItem('wr-tip-dismissed'));



  const tip = tips[new Date().getDate() % tips.length];



  const handleDismissTip = () => {

    setTipDismissed(true);

    localStorage.setItem('wr-tip-dismissed', 'true');

  };



  useEffect(() => {

    if (totalResumes > 0) return undefined;

    const interval = setInterval(() => {

      setSubtitleIndex(prev => (prev + 1) % motivationalSubtitles.length);

    }, 4000);

    return () => clearInterval(interval);

  }, [totalResumes]);



  const avgScore = useMemo(() => {

    const scores = Object.values(healthScores).map(s => s.overallScore);

    if (scores.length === 0) return 0;

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  }, [healthScores]);



  const greeting = useMemo(() => {

    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';

    if (hour < 17) return 'Good afternoon';

    return 'Good evening';

  }, []);



  const firstName = userName ? userName.split(' ')[0] : '';



  if (totalResumes > 0) {

    const metrics = [
      {
        Icon: Star,
        value: avgScore > 0 ? `${avgScore}%` : isScoring ? '…' : '—',
        label: 'ATS average',
        accent: avgScore >= 80 ? 'text-success' : avgScore >= 50 ? 'text-warning' : 'text-muted-foreground',
        iconBg: avgScore >= 80 ? 'bg-success/10' : avgScore >= 50 ? 'bg-warning/10' : 'bg-muted/60',
        show: true,
      },
      {
        Icon: Target,
        value: tailoredCount,
        label: 'Tailored resumes',
        accent: 'text-foreground',
        iconBg: 'bg-primary/8',
        show: tailoredCount > 0,
      },
      {
        Icon: Hash,
        value: missingKeywordsCount,
        label: 'Missing keywords',
        accent: 'text-warning',
        iconBg: 'bg-warning/10',
        show: missingKeywordsCount > 0,
      },
      {
        Icon: FileText,
        value: totalResumes,
        label: 'Saved resumes',
        accent: 'text-foreground',
        iconBg: 'bg-muted/50',
        show: true,
      },
    ].filter((m) => m.show);

    const gridClass =
      metrics.length >= 4
        ? 'grid-cols-2 lg:grid-cols-4'
        : metrics.length === 3
          ? 'grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-2';

    return (
      <div className={cn('px-4', metricsOnly ? 'pb-2 pt-0' : 'pb-4')}>
        <div className={cn('grid gap-2', gridClass)}>
          {metrics.map(({ Icon, value, label, accent, iconBg }) => (
            <div key={label} className="dashboard-atlas-metric p-2.5 sm:p-3 flex justify-between gap-2 items-center min-w-0">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none">
                  {label}
                </p>
                <p className={cn('text-lg sm:text-xl font-semibold leading-none tabular-nums mt-1 tracking-tight', accent)}>
                  {value}
                </p>
              </div>
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border/60',
                  iconBg,
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', accent)} aria-hidden />
              </div>
            </div>
          ))}
        </div>



        {!metricsOnly && !tipDismissed && (

          <Collapsible className="mt-4">

            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground w-full hover:text-foreground transition-colors px-1">

              <Lightbulb className="w-3.5 h-3.5 shrink-0" />

              <span>Daily tip</span>

              <ChevronDown className="w-3 h-3 ml-auto transition-transform duration-200 [[data-state=open]_&]:rotate-180" />

            </CollapsibleTrigger>

            <CollapsibleContent>

              <div className="flex items-start gap-2 mt-2 p-3 rounded-xl bg-muted/40 border border-border">

                <p className="text-xs text-muted-foreground flex-1 min-w-0">{tip}</p>

                <button

                  onClick={handleDismissTip}

                  className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground touch-manipulation shrink-0"

                  aria-label="Dismiss tip"

                >

                  <X className="w-3 h-3" />

                </button>

              </div>

            </CollapsibleContent>

          </Collapsible>

        )}

      </div>

    );

  }



  return (

    <div className="px-4 pt-2 pb-2">

      <div className="rounded-2xl border border-primary/15 bg-card shadow-soft-md overflow-hidden">

        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">

          <div className="min-w-0">

            <p className="text-label text-muted-foreground mb-0.5 normal-case tracking-wide">Welcome</p>

            <h2 className="text-page-title font-bold text-foreground truncate">

              {greeting}{firstName ? `, ${firstName}` : ''}

            </h2>

          </div>

          {streak > 1 && (

            <motion.div

              initial={{ scale: 0 }}

              animate={{ scale: 1 }}

              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/25"

            >

              <Flame className="w-3.5 h-3.5 text-warning" />

              <span className="text-xs font-bold text-warning tabular-nums">{streak}d</span>

            </motion.div>

          )}

        </div>

        <div className="px-4 py-3 min-h-[2.75rem] flex items-center border-t border-border/60">

          <AnimatePresence mode="wait">

            <motion.p

              key={subtitleIndex}

              initial={{ opacity: 0, y: 8 }}

              animate={{ opacity: 1, y: 0 }}

              exit={{ opacity: 0, y: -8 }}

              transition={{ duration: 0.25 }}

              className="text-sm text-muted-foreground"

            >

              {motivationalSubtitles[subtitleIndex]}

            </motion.p>

          </AnimatePresence>

        </div>

      </div>

    </div>

  );

});


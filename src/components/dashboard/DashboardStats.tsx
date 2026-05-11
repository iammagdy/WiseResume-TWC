import { useMemo, useEffect, useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Flame, AlertCircle, Lightbulb, X } from 'lucide-react';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { DatabaseResume } from '@/hooks/useResumes';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

function useLoginStreak(userId?: string | null) {
  const [streak, setStreak] = useState(1);
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

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

  return streak;
}

const motivationalSubtitles = [
  "Let's create something amazing today!",
  "Your next opportunity starts here",
  "One great resume away from your dream job",
  "Today is the perfect day to stand out",
];

const tips = [
  'Tailoring your resume to each job increases callbacks by 40%.',
  'Use numbers and metrics — recruiters spend 6 seconds scanning.',
  'A strong summary section can boost interview chances by 30%.',
  'Keep your resume to one page if under 10 years of experience.',
  'Use action verbs like "led", "built", and "improved" to stand out.',
  'Adding relevant keywords from the job posting helps beat ATS filters.',
  'Review your resume twice — 77% of hiring managers reject resumes with typos.',
  'Quantify achievements: "Increased revenue by 25%" beats vague claims.',
  'Update your resume every 3 months, even if you\'re not job hunting.',
];

interface DashboardStatsProps {
  totalResumes: number;
  healthScores: Record<string, ResumeHealthScore>;
  userName?: string | null;
  isScoring?: boolean;
  resumes?: DatabaseResume[];
  loginStreak?: number;
  userId?: string | null;
}

export const DashboardStats = memo(function DashboardStats({
  totalResumes, healthScores, userName, isScoring = false, resumes,
  loginStreak: externalStreak, userId,
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
    if (totalResumes > 0) return;
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

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-foreground truncate">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h2>
        {streak > 1 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20"
          >
            <Flame className="w-3 h-3 text-warning" />
            <span className="text-xs font-bold text-warning">{streak}</span>
          </motion.div>
        )}
      </div>

      {totalResumes === 0 && (
        <div className="h-5 overflow-hidden mb-2">
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
      )}

      {totalResumes > 0 && (
        <div className="flex items-center gap-4 mt-0.5 mb-1">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {totalResumes} {totalResumes === 1 ? 'resume' : 'resumes'}
            </span>
          </div>
          {avgScore > 0 && (
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${avgScore >= 80 ? 'bg-emerald-500' : avgScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                Avg. score {avgScore}%
              </span>
            </div>
          )}
          {resumes && resumes.length > 0 && (() => {
            const oldest = resumes.reduce((a, b) =>
              new Date(a.$updatedAt || a.$createdAt) < new Date(b.$updatedAt || b.$createdAt) ? a : b
            );
            const daysSince = Math.floor((Date.now() - new Date(oldest.$updatedAt || oldest.$createdAt || Date.now()).getTime()) / 86_400_000);
            if (daysSince < 30) return null;
            return (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-warning" />
                <span className="text-sm text-warning">{daysSince}d old</span>
              </div>
            );
          })()}
        </div>
      )}

      {!tipDismissed && (
        <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-card border border-border">
          <Lightbulb className="w-3.5 h-3.5 text-warning shrink-0" />
          <p className="text-xs text-muted-foreground flex-1 min-w-0 line-clamp-1">{tip}</p>
          <button
            onClick={handleDismissTip}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground touch-manipulation shrink-0"
            aria-label="Dismiss tip"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
});

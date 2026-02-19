import { useMemo } from 'react';
import { useResumes } from '@/hooks/useResumes';
import { useJobApplications } from '@/hooks/useJobApplications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export interface Milestone {
  id: string;
  emoji: string;
  label: string;
  description: string;
  unlockHint: string;
  earned: boolean;
}

export function useCareerMilestones() {
  const { user } = useAuth();
  const { data: resumes } = useResumes();
  const { data: applications } = useJobApplications();
  const { profile } = useProfile(user?.id, user);

  const { data: interviewCount } = useQuery({
    queryKey: ['interview-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('interview_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const { data: tailorCount } = useQuery({
    queryKey: ['tailor-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('tailor_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const loginStreak = profile?.loginStreak ?? 1;

  const milestones = useMemo<Milestone[]>(() => [
    {
      id: 'first_resume',
      emoji: '🏆',
      label: 'Resume Builder',
      description: 'Created your first resume',
      unlockHint: 'Create your first resume to unlock',
      earned: (resumes?.length ?? 0) >= 1,
    },
    {
      id: 'interview_ace',
      emoji: '🎤',
      label: 'Interview Ace',
      description: 'Completed a practice interview',
      unlockHint: 'Practice a mock interview to unlock',
      earned: (interviewCount ?? 0) >= 1,
    },
    {
      id: 'ats_optimizer',
      emoji: '🎯',
      label: 'ATS Pro',
      description: 'Tailored a resume for a job',
      unlockHint: 'Tailor your resume to a job posting to unlock',
      earned: (tailorCount ?? 0) >= 1,
    },
    {
      id: 'portfolio_live',
      emoji: '🌐',
      label: 'Online Presence',
      description: 'Published your portfolio',
      unlockHint: 'Enable your public portfolio to unlock',
      earned: profile?.portfolioEnabled === true,
    },
    {
      id: 'streak_7',
      emoji: '🔥',
      label: 'Dedicated',
      description: '7-day login streak',
      unlockHint: 'Log in 7 days in a row to unlock',
      earned: loginStreak >= 7,
    },
    {
      id: 'streak_30',
      emoji: '💎',
      label: 'Career Committed',
      description: '30-day login streak',
      unlockHint: 'Log in 30 days in a row to unlock',
      earned: loginStreak >= 30,
    },
    {
      id: 'application_tracker',
      emoji: '📋',
      label: 'Organized',
      description: 'Tracked 5+ job applications',
      unlockHint: 'Log 5 job applications to unlock',
      earned: (applications?.length ?? 0) >= 5,
    },
  ], [resumes, interviewCount, tailorCount, profile, loginStreak, applications]);

  const earnedCount = milestones.filter(m => m.earned).length;

  return { milestones, earnedCount };
}

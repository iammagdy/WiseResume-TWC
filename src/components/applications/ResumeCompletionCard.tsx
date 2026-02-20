import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { calcOverallScore, calcContactScore, calcSummaryScore, calcExperienceScore, calcEducationScore, calcSkillsScore, getSectionStatus } from '@/lib/resumeCompletionRules';
import { ProgressRing } from '@/components/home/ProgressRing';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const SECTIONS = [
  { key: 'contact', label: 'Contact' },
  { key: 'summary', label: 'Summary' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
] as const;

const scoreFns: Record<string, (r: any) => number> = {
  contact: r => calcContactScore(r.contactInfo),
  summary: r => calcSummaryScore(r.summary),
  experience: r => calcExperienceScore(r.experience),
  education: r => calcEducationScore(r.education),
  skills: r => calcSkillsScore(r.skills),
};

const statusColors: Record<string, string> = {
  empty: 'bg-muted-foreground/20',
  partial: 'bg-warning',
  complete: 'bg-success',
};

export const ResumeCompletionCard = memo(function ResumeCompletionCard() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { data: resumes } = useResumes();

  const primaryDb = resumes?.find(r => r.is_primary) || resumes?.[0];
  const resume = primaryDb ? dbToResumeData(primaryDb) : null;

  if (!resume) return null;

  const score = calcOverallScore(resume);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="glass-elevated rounded-2xl p-4 border border-border/20"
    >
      <div className="flex items-center gap-4">
        <ProgressRing percent={score} size={56} strokeWidth={4} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Resume Completion</p>
          <p className="text-xs text-muted-foreground truncate">
            {primaryDb?.title || 'Your resume'}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {SECTIONS.map(s => {
              const sectionScore = scoreFns[s.key](resume);
              const status = getSectionStatus(sectionScore);
              return (
                <div key={s.key} className="flex flex-col items-center gap-0.5">
                  <div className={`w-5 h-1.5 rounded-full ${statusColors[status]}`} title={`${s.label}: ${status}`} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
            {SECTIONS.map(s => (
              <span key={s.key} className="truncate">{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {score < 100 && (
        <button
          onClick={() => navigate(primaryDb ? `/resume/${primaryDb.id}` : '/')}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-xl py-2.5 min-h-[44px] transition-colors active:scale-95 touch-manipulation"
        >
          Continue editing
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
});

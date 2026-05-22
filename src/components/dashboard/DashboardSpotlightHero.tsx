import { memo } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { Wand2, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { haptics } from '@/lib/haptics';

import { cn } from '@/lib/utils';

import { safeFormatDistanceToNow } from '@/lib/dateUtils';

import { DatabaseResume } from '@/hooks/useResumes';

import { ResumeHealthScore } from '@/hooks/useResumeScore';

import { HeroAtsScoreRing } from './HeroAtsScoreRing';



interface DashboardSpotlightHeroProps {

  resume: DatabaseResume;

  healthScore?: ResumeHealthScore | null;

  isScoring?: boolean;

  onTailor: () => void;

  onOpenEditor: () => void;

}



export const DashboardSpotlightHero = memo(function DashboardSpotlightHero({

  resume,

  healthScore,

  isScoring = false,

  onTailor,

  onOpenEditor,

}: DashboardSpotlightHeroProps) {

  const shouldReduceMotion = useReducedMotion();

  const score = healthScore?.overallScore ?? 0;

  const gapCount = healthScore?.keywordGaps?.length ?? 0;

  const statusLabel =

    score >= 80

      ? 'Ready for tailoring'

      : score >= 50

        ? 'Good foundation'

        : 'Needs optimization';



  const subcopy =

    gapCount > 0

      ? `${gapCount} keyword gap${gapCount === 1 ? '' : 's'} — tailor before you apply`

      : healthScore?.topImprovement ??

        'Tailor for your next role to boost ATS alignment.';



  const updatedLabel = safeFormatDistanceToNow(

    resume.$updatedAt || resume.$createdAt || Date.now(),

    { addSuffix: true },

  );



  return (

    <motion.section

      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.3 }}

      aria-label="Featured resume"

      className="relative mx-4 mb-2 overflow-hidden rounded-xl dashboard-atlas-hero text-primary-foreground"

    >

      <div

        className="pointer-events-none absolute -right-12 -bottom-16 h-32 w-32 rounded-full bg-white/[0.07]"

        aria-hidden

      />



      <div className="relative z-10 p-3 sm:p-4">

        <div className="flex gap-3 sm:gap-4 items-center">

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-2 mb-1">

              <span

                className={cn(

                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',

                  score >= 80

                    ? 'bg-emerald-500/20 text-emerald-50 border border-emerald-400/25'

                    : 'bg-white/12 text-white/95 border border-white/15',

                )}

              >

                {statusLabel}

              </span>

              <span className="text-[10px] text-white/60 truncate">{updatedLabel}</span>

            </div>

            <h2 className="text-base sm:text-[1.125rem] font-bold tracking-tight leading-tight truncate pr-1">

              {resume.title}

            </h2>

            <p className="text-xs text-white/75 leading-snug line-clamp-2 mt-1 max-w-md">

              {subcopy}

            </p>



            <div

              data-testid="returning-user-cta-grid"

              className="flex flex-wrap gap-2 mt-2.5"

            >

              <Button

                size="sm"

                className="h-10 min-h-[44px] gap-1.5 font-semibold rounded-xl bg-white text-primary hover:bg-white/92 shadow-soft-sm px-3"

                onClick={() => {

                  haptics.light();

                  onTailor();

                }}

              >

                <Wand2 className="w-4 h-4 shrink-0" />

                Tailor to Job

              </Button>

              <Button

                variant="outline"

                size="sm"

                className="h-10 min-h-[44px] gap-1.5 rounded-xl border-white/20 bg-white/8 text-white hover:bg-white/15 hover:text-white px-3"

                onClick={() => {

                  haptics.light();

                  onOpenEditor();

                }}

                aria-label="Continue editing"

              >

                <Pencil className="w-4 h-4 shrink-0" />

                Open Editor

              </Button>

            </div>

          </div>



          <div className="shrink-0 flex flex-col items-center justify-center pl-1 border-l border-white/10">

            <HeroAtsScoreRing
              score={score}
              size={84}
              isLoading={isScoring && !healthScore}
            />

            <span className="text-[9px] font-medium text-white/55 mt-1 hidden sm:block">

              Featured

            </span>

          </div>

        </div>

      </div>

    </motion.section>

  );

});


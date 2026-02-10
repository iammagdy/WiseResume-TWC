 import { motion } from 'framer-motion';
 import { Trophy } from 'lucide-react';
 import { JobComparisonEntry } from '@/types/resume';
 import { cn } from '@/lib/utils';
 import { haptics } from '@/lib/haptics';
 
 interface CompareScoreBarsProps {
   jobs: JobComparisonEntry[];
   selectedJobId: string | null;
   onSelectJob: (jobId: string) => void;
   metric: 'overall' | 'skills' | 'experience' | 'ats';
 }
 
 export function CompareScoreBars({ 
   jobs, 
   selectedJobId, 
   onSelectJob,
   metric 
 }: CompareScoreBarsProps) {
   const getScore = (job: JobComparisonEntry): number => {
     switch (metric) {
       case 'overall':
         return job.tailorResult.overallScore.after;
       case 'skills':
         return job.tailorResult.sectionScores.skills.after;
       case 'experience':
         return job.tailorResult.sectionScores.experience.after;
       case 'ats':
         return job.tailorResult.atsAnalysis?.optimizedKeywordDensity || 0;
       default:
         return 0;
     }
   };
 
   const maxScore = Math.max(...jobs.map(getScore));
   const sortedJobs = [...jobs].sort((a, b) => getScore(b) - getScore(a));
 
   const handleSelect = (jobId: string) => {
     haptics.light();
     onSelectJob(jobId);
   };
 
   return (
     <div className="space-y-3">
       {sortedJobs.map((job, index) => {
         const score = getScore(job);
         const isSelected = job.id === selectedJobId;
         const isTop = index === 0;
         
         return (
           <motion.button
             key={job.id}
             className={cn(
               "w-full p-3 rounded-xl border transition-all text-left touch-manipulation",
               isSelected 
                 ? "border-primary bg-primary/5" 
                 : "border-border hover:border-primary/50"
             )}
             onClick={() => handleSelect(job.id)}
             whileTap={{ scale: 0.98 }}
           >
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 {isTop && (
                   <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                     <Trophy className="w-3 h-3 text-amber-500" />
                   </div>
                 )}
                 <span className="font-medium text-sm truncate max-w-[140px]">
                   {job.company}
                 </span>
               </div>
               <span className={cn(
                 "font-bold text-sm",
                 score >= 80 ? "text-success" :
                 score >= 60 ? "text-warning" :
                 "text-destructive"
               )}>
                 {score}%
               </span>
             </div>
             
             {/* Progress Bar */}
             <div className="h-2 rounded-full bg-muted overflow-hidden">
               <motion.div
                 className={cn(
                   "h-full rounded-full",
                   score >= 80 ? "bg-success" :
                   score >= 60 ? "bg-warning" :
                   "bg-destructive"
                 )}
                 initial={{ width: 0 }}
                 animate={{ width: `${(score / maxScore) * 100}%` }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
               />
             </div>
           </motion.button>
         );
       })}
     </div>
   );
 }
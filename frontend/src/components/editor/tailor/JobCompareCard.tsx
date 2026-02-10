 import { motion } from 'framer-motion';
 import { Check, Trash2, ChevronRight, TrendingUp, Briefcase, MapPin, DollarSign } from 'lucide-react';
 import { Card, CardContent } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { JobComparisonEntry } from '@/types/resume';
 import { cn } from '@/lib/utils';
 import { haptics } from '@/lib/haptics';
 
 interface JobCompareCardProps {
   job: JobComparisonEntry;
   isSelected: boolean;
   onSelect: () => void;
   onRemove: () => void;
   onViewDetails: () => void;
 }
 
 export function JobCompareCard({ 
   job, 
   isSelected, 
   onSelect, 
   onRemove,
   onViewDetails
 }: JobCompareCardProps) {
   const score = job.tailorResult.overallScore.after;
   const improvement = job.tailorResult.overallScore.after - job.tailorResult.overallScore.before;
   const jobIntel = job.tailorResult.jobIntelligence;
   const sectionScores = job.tailorResult.sectionScores;
 
   const handleSelect = () => {
     haptics.medium();
     onSelect();
   };
 
   const handleRemove = (e: React.MouseEvent) => {
     e.stopPropagation();
     haptics.warning();
     onRemove();
   };
 
   return (
     <motion.div
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.95 }}
       className="px-2"
     >
       <Card 
         className={cn(
           "relative overflow-hidden cursor-pointer transition-all touch-manipulation",
           isSelected 
             ? "ring-2 ring-primary border-primary bg-primary/5" 
             : "border-border hover:border-primary/50"
         )}
         onClick={handleSelect}
       >
         {/* Selection Indicator */}
         {isSelected && (
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
           >
             <Check className="w-4 h-4 text-primary-foreground" />
           </motion.div>
         )}
 
         {/* Remove Button */}
         <Button
           variant="ghost"
           size="icon"
           className="absolute top-3 left-3 h-7 w-7 rounded-full bg-muted/80"
           onClick={handleRemove}
         >
           <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
         </Button>
 
         <CardContent className="p-5 pt-12">
           {/* Job Title & Company */}
           <div className="text-center mb-4">
             <h3 className="font-semibold text-lg line-clamp-1">{job.jobTitle}</h3>
             <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
               <Briefcase className="w-3.5 h-3.5" />
               {job.company}
             </p>
           </div>
 
           {/* Score Ring */}
           <div className="flex justify-center mb-4">
             <div className="relative w-24 h-24">
               {/* Background Ring */}
               <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                 <circle
                   cx="50"
                   cy="50"
                   r="42"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="none"
                   className="text-muted"
                 />
                 <motion.circle
                   cx="50"
                   cy="50"
                   r="42"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="none"
                   strokeLinecap="round"
                   className={cn(
                     score >= 80 ? "text-success" :
                     score >= 60 ? "text-warning" :
                     "text-destructive"
                   )}
                   initial={{ pathLength: 0 }}
                   animate={{ pathLength: score / 100 }}
                   transition={{ duration: 0.8, ease: "easeOut" }}
                   style={{
                     strokeDasharray: `${2 * Math.PI * 42}`,
                   }}
                 />
               </svg>
               {/* Score Text */}
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <motion.span 
                   className="text-2xl font-bold"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.3 }}
                 >
                   {score}%
                 </motion.span>
                 <span className="text-xs text-success flex items-center gap-0.5">
                   <TrendingUp className="w-3 h-3" />
                   +{improvement}
                 </span>
               </div>
             </div>
           </div>
 
           {/* Score Breakdown */}
           <div className="grid grid-cols-2 gap-2 mb-4">
             <ScoreItem 
               label="Skills" 
               value={sectionScores.skills.after} 
               change={sectionScores.skills.after - sectionScores.skills.before}
             />
             <ScoreItem 
               label="Experience" 
               value={sectionScores.experience.after}
               change={sectionScores.experience.after - sectionScores.experience.before}
             />
             <ScoreItem 
               label="Summary" 
               value={sectionScores.summary.after}
               change={sectionScores.summary.after - sectionScores.summary.before}
             />
             <ScoreItem 
               label="ATS" 
               value={job.tailorResult.atsAnalysis?.optimizedKeywordDensity || 0}
               change={
                 (job.tailorResult.atsAnalysis?.optimizedKeywordDensity || 0) - 
                 (job.tailorResult.atsAnalysis?.originalKeywordDensity || 0)
               }
             />
           </div>
 
           {/* Job Intel Badges */}
           {jobIntel && (
             <div className="flex flex-wrap gap-1.5 justify-center mb-4">
               {jobIntel.workMode !== 'unknown' && (
                 <Badge variant="secondary" className="text-xs">
                   <MapPin className="w-3 h-3 mr-1" />
                   {jobIntel.workMode}
                 </Badge>
               )}
               {jobIntel.salaryRange && (
                 <Badge variant="secondary" className="text-xs">
                   <DollarSign className="w-3 h-3 mr-0.5" />
                   {Math.round(jobIntel.salaryRange.min / 1000)}k-{Math.round(jobIntel.salaryRange.max / 1000)}k
                 </Badge>
               )}
               <Badge variant="outline" className="text-xs capitalize">
                 {jobIntel.experienceLevel}
               </Badge>
             </div>
           )}
 
           {/* View Details */}
           <Button 
             variant="ghost" 
             className="w-full text-sm"
             onClick={(e) => {
               e.stopPropagation();
               onViewDetails();
             }}
           >
             View Full Details
             <ChevronRight className="w-4 h-4 ml-1" />
           </Button>
         </CardContent>
       </Card>
     </motion.div>
   );
 }
 
 function ScoreItem({ label, value, change }: { label: string; value: number; change: number }) {
   return (
     <div className="p-2 rounded-lg bg-muted/50 text-center">
       <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
       <p className="font-semibold text-sm">
         {value}%
         {change > 0 && (
           <span className="text-success text-xs ml-1">+{change}</span>
         )}
       </p>
     </div>
   );
 }
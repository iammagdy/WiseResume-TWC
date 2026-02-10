 import { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { MessageSquare, ChevronDown, ChevronUp, Sparkles, Lightbulb } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { InterviewTalkingPoint } from '@/types/resume';
 import { cn } from '@/lib/utils';
 
 interface InterviewPrepCardProps {
   talkingPoints: InterviewTalkingPoint[];
 }
 
 export function InterviewPrepCard({ talkingPoints }: InterviewPrepCardProps) {
   const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
   const [showAll, setShowAll] = useState(false);
 
   if (!talkingPoints || talkingPoints.length === 0) {
     return null;
   }
 
   const displayedPoints = showAll ? talkingPoints : talkingPoints.slice(0, 3);
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-background to-pink-500/5 border border-purple-500/20"
     >
       <div className="flex items-center justify-between mb-4">
         <h4 className="font-semibold flex items-center gap-2">
           <MessageSquare className="w-4 h-4 text-purple-500" />
           Interview Prep
         </h4>
         <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-700 dark:text-purple-400">
           {talkingPoints.length} questions
         </Badge>
       </div>
 
       <p className="text-sm text-muted-foreground mb-4">
         Prepare for these likely interview questions based on the job requirements:
       </p>
 
       <div className="space-y-3">
         {displayedPoints.map((point, index) => (
           <motion.div
             key={index}
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: index * 0.1 }}
             className={cn(
               'p-3 rounded-lg bg-card border border-border transition-all',
               expandedIndex === index && 'ring-1 ring-purple-500/50'
             )}
           >
             <button
               onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
               className="w-full text-left"
             >
               <div className="flex items-start justify-between gap-2">
                 <div className="flex items-start gap-2">
                   <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center text-xs font-medium shrink-0">
                     {index + 1}
                   </span>
                   <span className="text-sm font-medium">{point.question}</span>
                 </div>
                 {expandedIndex === index ? (
                   <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                 ) : (
                   <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                 )}
               </div>
             </button>
 
             <AnimatePresence>
               {expandedIndex === index && (
                 <motion.div
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="mt-3 pl-7 space-y-3">
                     <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                       <div className="flex items-center gap-2 mb-2">
                         <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                         <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                           SUGGESTED ANSWER
                         </span>
                       </div>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                         {point.suggestedAnswer}
                       </p>
                     </div>
                     
                     {point.relatedExperience && (
                       <div className="flex items-start gap-2 text-xs text-muted-foreground">
                         <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                         <span>
                           <span className="font-medium">Reference:</span> {point.relatedExperience}
                         </span>
                       </div>
                     )}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </motion.div>
         ))}
       </div>
 
       {talkingPoints.length > 3 && (
         <Button
           variant="ghost"
           size="sm"
           className="w-full mt-3"
           onClick={() => setShowAll(!showAll)}
         >
           {showAll ? 'Show Less' : `Show ${talkingPoints.length - 3} More Questions`}
         </Button>
       )}
     </motion.div>
   );
 }
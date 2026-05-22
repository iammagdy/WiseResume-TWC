 import { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { 
   Target, Plus, ArrowUp, Sparkles, AlertCircle, 
   CheckCircle, Star, Zap, BookOpen
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { SkillSuggestion } from '@/types/resume';
 import { cn } from '@/lib/utils';
 
 interface SmartSkillSuggestionsProps {
   missingSkills: SkillSuggestion[];
   boostableSkills: SkillSuggestion[];
   onAddSkill: (skill: string) => void;
   onBoostSkill: (skill: string) => void;
   onAddAllCritical?: () => void;
   onAddAllSuggested?: () => void;
 }
 
 type SkillCategory = 'critical' | 'recommended' | 'boost';
 
 export function SmartSkillSuggestions({
   missingSkills,
   boostableSkills,
   onAddSkill,
   onBoostSkill,
   onAddAllCritical,
   onAddAllSuggested,
 }: SmartSkillSuggestionsProps) {
   const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());
   const [boostedSkills, setBoostedSkills] = useState<Set<string>>(new Set());
 
   // Categorize missing skills by frequency/importance
   const criticalSkills = missingSkills.filter(s => s.frequency >= 3);
   const recommendedSkills = missingSkills.filter(s => s.frequency < 3);
 
   const handleAddSkill = (skill: string) => {
     onAddSkill(skill);
     setAddedSkills(prev => new Set([...prev, skill]));
   };
 
   const handleBoostSkill = (skill: string) => {
     onBoostSkill(skill);
     setBoostedSkills(prev => new Set([...prev, skill]));
   };
 
   const handleAddAllCritical = () => {
     criticalSkills.forEach(s => {
       if (!addedSkills.has(s.skill)) {
         handleAddSkill(s.skill);
       }
     });
     onAddAllCritical?.();
   };
 
   if (missingSkills.length === 0 && boostableSkills.length === 0) {
     return (
       <div className="p-4 rounded-xl bg-success/10 border border-success/30">
         <div className="flex items-center gap-2">
           <CheckCircle className="w-5 h-5 text-success" />
           <span className="font-medium">Great job! Your skills match the job requirements well.</span>
         </div>
       </div>
     );
   }
 
   const totalImpact = [...criticalSkills, ...recommendedSkills].reduce((acc, s) => acc + s.frequency, 0);
   const addedImpact = [...addedSkills].reduce((acc, skill) => {
     const found = missingSkills.find(s => s.skill === skill);
     return acc + (found?.frequency || 0);
   }, 0);
   const impactPercentage = totalImpact > 0 ? Math.round((addedImpact / totalImpact) * 100) : 0;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="p-4 rounded-2xl bg-card border border-border shadow-soft-sm"
     >
       {/* Header */}
       <div className="flex items-center justify-between mb-4">
         <h4 className="font-semibold flex items-center gap-2">
           <Target className="w-4 h-4 text-primary" />
           Skills Gap Analysis
         </h4>
         {addedSkills.size > 0 && (
           <Badge variant="secondary" className="text-xs bg-success/20 text-success">
             {addedSkills.size} added
           </Badge>
         )}
       </div>
 
       {/* Impact Progress */}
       {missingSkills.length > 0 && (
         <div className="mb-4 p-3 rounded-lg bg-card border border-border">
           <div className="flex items-center justify-between mb-2">
             <span className="text-sm font-medium">Skills Coverage Impact</span>
             <span className="text-sm text-muted-foreground">{impactPercentage}%</span>
           </div>
           <Progress value={impactPercentage} className="h-2" />
           <p className="text-xs text-muted-foreground mt-1">
             Adding suggested skills increases your match score
           </p>
         </div>
       )}
 
       {/* Critical Skills */}
       {criticalSkills.length > 0 && (
         <div className="mb-4">
           <div className="flex items-center justify-between mb-3">
             <h5 className="text-sm font-semibold flex items-center gap-2">
               <AlertCircle className="w-4 h-4 text-red-500" />
               CRITICAL (mentioned {'>'}3x)
             </h5>
              <Button
                variant="outline"
                size="sm"
                className="text-xs min-h-[44px] active:scale-95 transition-transform"
                onClick={handleAddAllCritical}
              >
               <Plus className="w-3 h-3 mr-1" />
               Add All Critical
             </Button>
           </div>
           <div className="space-y-2">
             {criticalSkills.map((skill, i) => (
               <SkillRow
                 key={i}
                 skill={skill}
                 category="critical"
                 isAdded={addedSkills.has(skill.skill)}
                 onAdd={() => handleAddSkill(skill.skill)}
               />
             ))}
           </div>
         </div>
       )}
 
       {/* Recommended Skills */}
       {recommendedSkills.length > 0 && (
         <div className="mb-4">
           <h5 className="text-sm font-semibold flex items-center gap-2 mb-3">
             <Sparkles className="w-4 h-4 text-primary" />
             RECOMMENDED
           </h5>
           <div className="space-y-2">
             {recommendedSkills.slice(0, 5).map((skill, i) => (
               <SkillRow
                 key={i}
                 skill={skill}
                 category="recommended"
                 isAdded={addedSkills.has(skill.skill)}
                 onAdd={() => handleAddSkill(skill.skill)}
               />
             ))}
             {recommendedSkills.length > 5 && (
               <p className="text-xs text-muted-foreground text-center py-2">
                 +{recommendedSkills.length - 5} more recommended skills
               </p>
             )}
           </div>
         </div>
       )}
 
       {/* Boostable Skills */}
       {boostableSkills.length > 0 && (
         <div>
           <h5 className="text-sm font-semibold flex items-center gap-2 mb-3">
             <ArrowUp className="w-4 h-4 text-success" />
             BOOST THESE (already on your resume)
           </h5>
           <div className="space-y-2">
             {boostableSkills.map((skill, i) => (
               <SkillRow
                 key={i}
                 skill={skill}
                 category="boost"
                 isAdded={boostedSkills.has(skill.skill)}
                 onAdd={() => handleBoostSkill(skill.skill)}
               />
             ))}
           </div>
         </div>
       )}
     </motion.div>
   );
 }
 
 interface SkillRowProps {
   skill: SkillSuggestion;
   category: SkillCategory;
   isAdded: boolean;
   onAdd: () => void;
 }
 
 function SkillRow({ skill, category, isAdded, onAdd }: SkillRowProps) {
   const categoryStyles = {
     critical: {
       bg: 'bg-destructive/10',
       border: 'border-destructive/25',
       badge: 'bg-destructive/15 text-destructive border-destructive/30',
       icon: AlertCircle,
     },
     recommended: {
       bg: 'bg-warning/10',
       border: 'border-warning/25',
       badge: 'bg-warning/15 text-warning border-warning/30',
       icon: Star,
     },
     boost: {
       bg: 'bg-success/10',
       border: 'border-success/25',
       badge: 'bg-success/15 text-success border-success/30',
       icon: ArrowUp,
     },
   };
 
   const style = categoryStyles[category];
   const Icon = style.icon;
 
   return (
     <motion.div
       initial={{ opacity: 0, x: -10 }}
       animate={{ opacity: 1, x: 0 }}
       className={cn(
         'p-3 rounded-lg border flex items-center justify-between gap-3',
         style.bg,
         style.border,
         isAdded && 'opacity-50'
       )}
     >
       <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2 mb-1">
           <span className="font-medium text-sm">{skill.skill}</span>
           {skill.frequency > 1 && (
             <Badge variant="outline" className="text-xs">
               {skill.frequency}x mentioned
             </Badge>
           )}
         </div>
         <p className="text-xs text-muted-foreground line-clamp-1">
           {skill.reason}
         </p>
       </div>
       
       <Button
         variant={isAdded ? 'ghost' : 'secondary'}
         size="sm"
         className={cn('shrink-0', isAdded && 'text-success')}
         onClick={onAdd}
         disabled={isAdded}
       >
         {isAdded ? (
           <>
             <CheckCircle className="w-3 h-3 mr-1" />
             {category === 'boost' ? 'Boosted' : 'Added'}
           </>
         ) : (
           <>
             {category === 'boost' ? (
               <>
                 <ArrowUp className="w-3 h-3 mr-1" />
                 Boost
               </>
             ) : (
               <>
                 <Plus className="w-3 h-3 mr-1" />
                 Add
               </>
             )}
           </>
         )}
       </Button>
     </motion.div>
   );
 }
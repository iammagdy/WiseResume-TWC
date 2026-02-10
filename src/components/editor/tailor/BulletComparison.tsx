 import { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { ArrowRight, Check, Sparkles, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Switch } from '@/components/ui/switch';
 import { BulletTransformation } from '@/types/resume';
 import { cn } from '@/lib/utils';
 
 interface BulletComparisonProps {
   transformations: BulletTransformation[];
   onToggleTransformation?: (index: number, enabled: boolean) => void;
 }
 
 export function BulletComparison({ transformations, onToggleTransformation }: BulletComparisonProps) {
   const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
   const [enabledTransformations, setEnabledTransformations] = useState<Set<number>>(
     new Set(transformations.map((_, i) => i))
   );
 
   if (!transformations || transformations.length === 0) {
     return null;
   }
 
   const handleToggle = (index: number) => {
     const newEnabled = new Set(enabledTransformations);
     if (newEnabled.has(index)) {
       newEnabled.delete(index);
     } else {
       newEnabled.add(index);
     }
     setEnabledTransformations(newEnabled);
     onToggleTransformation?.(index, newEnabled.has(index));
   };
 
   const metricsAddedCount = transformations.filter(t => t.metricsAdded).length;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-background to-orange-500/5 border border-amber-500/20"
     >
       <div className="flex items-center justify-between mb-4">
         <h4 className="font-semibold flex items-center gap-2">
           <TrendingUp className="w-4 h-4 text-amber-500" />
           Bullet Transformations
         </h4>
         <div className="flex items-center gap-2">
           {metricsAddedCount > 0 && (
             <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">
               {metricsAddedCount} metrics added
             </Badge>
           )}
           <Badge variant="outline" className="text-xs">
             {enabledTransformations.size}/{transformations.length} active
           </Badge>
         </div>
       </div>
 
       <p className="text-sm text-muted-foreground mb-4">
         See how your achievements were transformed with power verbs and metrics:
       </p>
 
       <div className="space-y-3">
         {transformations.map((transformation, index) => (
           <motion.div
             key={index}
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: index * 0.05 }}
             className={cn(
               'p-3 rounded-lg bg-card border border-border transition-all',
               !enabledTransformations.has(index) && 'opacity-50',
               expandedIndex === index && 'ring-1 ring-amber-500/50'
             )}
           >
             <div className="flex items-center justify-between mb-2">
               <button
                 onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                 className="flex items-center gap-2 text-left flex-1"
               >
                 <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-medium shrink-0">
                   {index + 1}
                 </span>
                 <span className="text-xs text-muted-foreground line-clamp-1 flex-1">
                   {transformation.improvement}
                 </span>
                 {expandedIndex === index ? (
                   <ChevronUp className="w-4 h-4 text-muted-foreground" />
                 ) : (
                   <ChevronDown className="w-4 h-4 text-muted-foreground" />
                 )}
               </button>
               <div className="flex items-center gap-2 ml-2">
                 {transformation.metricsAdded && (
                   <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                     📊 Metrics
                   </Badge>
                 )}
                 <Switch
                   checked={enabledTransformations.has(index)}
                   onCheckedChange={() => handleToggle(index)}
                   className="scale-75"
                 />
               </div>
             </div>
 
             <AnimatePresence>
               {expandedIndex === index && (
                 <motion.div
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="mt-3 space-y-3">
                     {/* Before */}
                     <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                       <div className="flex items-center gap-2 mb-2">
                         <span className="text-xs font-semibold text-destructive">BEFORE</span>
                       </div>
                       <p className="text-sm text-muted-foreground line-through decoration-destructive/50">
                         {transformation.originalBullet}
                       </p>
                     </div>
 
                     {/* Arrow */}
                     <div className="flex justify-center">
                       <ArrowRight className="w-5 h-5 text-muted-foreground" />
                     </div>
 
                     {/* After */}
                     <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                       <div className="flex items-center gap-2 mb-2">
                         <Sparkles className="w-3 h-3 text-success" />
                         <span className="text-xs font-semibold text-success">AFTER</span>
                       </div>
                       <p className="text-sm font-medium">
                         {transformation.enhancedBullet}
                       </p>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </motion.div>
         ))}
       </div>
 
       <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
         <span className="text-xs text-muted-foreground">
           {enabledTransformations.size} transformations will be applied
         </span>
         <div className="flex gap-2">
           <Button
             variant="ghost"
             size="sm"
             onClick={() => setEnabledTransformations(new Set())}
           >
             Disable All
           </Button>
           <Button
             variant="ghost"
             size="sm"
             onClick={() => setEnabledTransformations(new Set(transformations.map((_, i) => i)))}
           >
             Enable All
           </Button>
         </div>
       </div>
     </motion.div>
   );
 }
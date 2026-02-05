 import { useState, useCallback } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import useEmblaCarousel from 'embla-carousel-react';
 import { 
   Plus, X, Check, ChevronLeft, ChevronRight, 
   BarChart3, Sparkles, Briefcase, Trophy
 } from 'lucide-react';
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { useResumeStore } from '@/store/resumeStore';
 import { JobCompareCard } from './JobCompareCard';
 import { CompareScoreBars } from './CompareScoreBars';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 import { haptics } from '@/lib/haptics';
 
 interface MultiJobCompareSheetProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onAddJob: () => void;
   onViewJobDetails: (jobId: string) => void;
 }
 
 export function MultiJobCompareSheet({ 
   open, 
   onOpenChange,
   onAddJob,
   onViewJobDetails
 }: MultiJobCompareSheetProps) {
   const { 
     currentComparison, 
     selectBestJob, 
     removeJobFromComparison,
     applySelectedJob,
     clearComparison
   } = useResumeStore();
 
   const [activeTab, setActiveTab] = useState<string>('cards');
   const [selectedIndex, setSelectedIndex] = useState(0);
 
   const [emblaRef, emblaApi] = useEmblaCarousel({ 
     loop: false,
     align: 'center',
     containScroll: 'trimSnaps'
   });
 
   const scrollPrev = useCallback(() => {
     if (emblaApi) {
       emblaApi.scrollPrev();
       haptics.light();
     }
   }, [emblaApi]);
 
   const scrollNext = useCallback(() => {
     if (emblaApi) {
       emblaApi.scrollNext();
       haptics.light();
     }
   }, [emblaApi]);
 
   const onSelect = useCallback(() => {
     if (!emblaApi) return;
     setSelectedIndex(emblaApi.selectedScrollSnap());
   }, [emblaApi]);
 
   // Subscribe to scroll events
   useState(() => {
     if (emblaApi) {
       emblaApi.on('select', onSelect);
       return () => {
         emblaApi.off('select', onSelect);
       };
     }
   });
 
   if (!currentComparison) return null;
 
   const jobs = currentComparison.jobs;
   const selectedJobId = currentComparison.selectedJobId;
   const canAddMore = jobs.length < 4;
 
   // Find best job (highest score)
   const bestJob = [...jobs].sort(
     (a, b) => b.tailorResult.overallScore.after - a.tailorResult.overallScore.after
   )[0];
 
   const selectedJob = jobs.find(j => j.id === selectedJobId);
 
   const handleApply = () => {
     if (!selectedJobId) {
       toast.error('Please select a job version to apply');
       return;
     }
     haptics.success();
     applySelectedJob();
     toast.success('Applied tailored resume!');
     onOpenChange(false);
   };
 
   const handleRemoveJob = (jobId: string) => {
     removeJobFromComparison(jobId);
     if (jobs.length <= 1) {
       onOpenChange(false);
     }
   };
 
   const handleClose = () => {
     clearComparison();
     onOpenChange(false);
   };
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl">
         <SheetHeader className="pb-3">
           <div className="flex items-center justify-between">
             <SheetTitle className="flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-primary" />
               Compare Jobs
               <Badge variant="secondary" className="ml-1">
                 {jobs.length}/4
               </Badge>
             </SheetTitle>
             <div className="flex items-center gap-2">
               {canAddMore && (
                 <Button
                   size="sm"
                   variant="outline"
                   onClick={onAddJob}
                 >
                   <Plus className="w-4 h-4 mr-1" />
                   Add Job
                 </Button>
               )}
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-8 w-8"
                 onClick={handleClose}
               >
                 <X className="w-4 h-4" />
               </Button>
             </div>
           </div>
         </SheetHeader>
 
         <div className="flex flex-col h-[calc(92vh-180px)]">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
             <TabsList className="grid grid-cols-2 w-full mb-4">
               <TabsTrigger value="cards" className="text-sm">
                 <Briefcase className="w-4 h-4 mr-1.5" />
                 Cards
               </TabsTrigger>
               <TabsTrigger value="compare" className="text-sm">
                 <BarChart3 className="w-4 h-4 mr-1.5" />
                 Compare
               </TabsTrigger>
             </TabsList>
 
             {/* Cards View - Swipeable Carousel */}
             <TabsContent value="cards" className="flex-1 overflow-hidden mt-0">
               <div className="relative h-full">
                 {/* Carousel */}
                 <div className="overflow-hidden" ref={emblaRef}>
                   <div className="flex h-full">
                     {jobs.map((job) => (
                       <div 
                         key={job.id} 
                         className="flex-[0_0_90%] min-w-0 px-2"
                       >
                         <JobCompareCard
                           job={job}
                           isSelected={job.id === selectedJobId}
                           onSelect={() => selectBestJob(job.id)}
                           onRemove={() => handleRemoveJob(job.id)}
                           onViewDetails={() => onViewJobDetails(job.id)}
                         />
                       </div>
                     ))}
                   </div>
                 </div>
 
                 {/* Navigation Arrows */}
                 {jobs.length > 1 && (
                   <>
                     <Button
                       variant="outline"
                       size="icon"
                       className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 shadow-lg z-10"
                       onClick={scrollPrev}
                     >
                       <ChevronLeft className="w-5 h-5" />
                     </Button>
                     <Button
                       variant="outline"
                       size="icon"
                       className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 shadow-lg z-10"
                       onClick={scrollNext}
                     >
                       <ChevronRight className="w-5 h-5" />
                     </Button>
                   </>
                 )}
 
                 {/* Dot Indicators */}
                 {jobs.length > 1 && (
                   <div className="flex justify-center gap-2 mt-4">
                     {jobs.map((job, index) => (
                       <button
                         key={job.id}
                         className={cn(
                           "w-2 h-2 rounded-full transition-all",
                           index === selectedIndex 
                             ? "bg-primary w-4" 
                             : "bg-muted-foreground/30"
                         )}
                         onClick={() => emblaApi?.scrollTo(index)}
                       />
                     ))}
                   </div>
                 )}
 
                 <p className="text-center text-xs text-muted-foreground mt-2">
                   Swipe to compare • Tap card to select
                 </p>
               </div>
             </TabsContent>
 
             {/* Compare View - Bar Charts */}
             <TabsContent value="compare" className="flex-1 overflow-y-auto mt-0 space-y-4">
               {/* Overall Score */}
               <div className="space-y-2">
                 <h4 className="font-semibold text-sm flex items-center gap-2">
                   <Trophy className="w-4 h-4 text-amber-500" />
                   Overall Match Score
                 </h4>
                 <CompareScoreBars
                   jobs={jobs}
                   selectedJobId={selectedJobId}
                   onSelectJob={selectBestJob}
                   metric="overall"
                 />
               </div>
 
               {/* Skills Score */}
               <div className="space-y-2">
                 <h4 className="font-semibold text-sm">Skills Match</h4>
                 <CompareScoreBars
                   jobs={jobs}
                   selectedJobId={selectedJobId}
                   onSelectJob={selectBestJob}
                   metric="skills"
                 />
               </div>
 
               {/* Experience Score */}
               <div className="space-y-2">
                 <h4 className="font-semibold text-sm">Experience Relevance</h4>
                 <CompareScoreBars
                   jobs={jobs}
                   selectedJobId={selectedJobId}
                   onSelectJob={selectBestJob}
                   metric="experience"
                 />
               </div>
 
               {/* ATS Score */}
               <div className="space-y-2">
                 <h4 className="font-semibold text-sm">ATS Optimization</h4>
                 <CompareScoreBars
                   jobs={jobs}
                   selectedJobId={selectedJobId}
                   onSelectJob={selectBestJob}
                   metric="ats"
                 />
               </div>
 
               {/* Best Match Recommendation */}
               <motion.div
                 className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
               >
                 <div className="flex items-center gap-2 mb-2">
                   <Sparkles className="w-4 h-4 text-amber-500" />
                   <span className="font-semibold text-sm">Best Match</span>
                 </div>
                 <p className="text-sm text-muted-foreground">
                   <strong className="text-foreground">{bestJob.jobTitle}</strong> at{' '}
                   <strong className="text-foreground">{bestJob.company}</strong> has the 
                   highest overall match at{' '}
                   <strong className="text-success">{bestJob.tailorResult.overallScore.after}%</strong>
                 </p>
               </motion.div>
             </TabsContent>
           </Tabs>
         </div>
 
         {/* Bottom Action Bar */}
         <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
           <div className="flex items-center justify-between mb-3">
             <div className="text-sm">
               {selectedJob ? (
                 <span>
                   Selected: <strong>{selectedJob.jobTitle}</strong> @ {selectedJob.company}
                 </span>
               ) : (
                 <span className="text-muted-foreground">
                   Tap a card to select
                 </span>
               )}
             </div>
             {selectedJob && (
               <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                 {selectedJob.tailorResult.overallScore.after}% match
               </Badge>
             )}
           </div>
           
           <Button
             className="w-full h-12 gradient-primary font-semibold"
             disabled={!selectedJobId}
             onClick={handleApply}
           >
             <Check className="w-5 h-5 mr-2" />
             Apply This Version
           </Button>
         </div>
       </SheetContent>
     </Sheet>
   );
 }
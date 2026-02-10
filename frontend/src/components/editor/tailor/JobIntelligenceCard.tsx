 import { motion } from 'framer-motion';
 import { 
   Briefcase, MapPin, DollarSign, Clock, AlertTriangle, 
   Building2, TrendingUp, Sparkles, CheckCircle, XCircle,
   Zap
 } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { JobIntelligence, ATSAnalysis, StrengthAnalysis } from '@/types/resume';
 import { cn } from '@/lib/utils';
 
 interface JobIntelligenceCardProps {
   jobIntelligence: JobIntelligence;
   atsAnalysis?: ATSAnalysis;
   strengthsAnalysis?: StrengthAnalysis[];
   jobTitle?: string;
   company?: string;
 }
 
 const experienceLevelLabels = {
   entry: { label: 'Entry Level', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
   mid: { label: 'Mid Level', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
   senior: { label: 'Senior Level', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400' },
   executive: { label: 'Executive', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400' },
 };
 
 const workModeLabels = {
   remote: { label: 'Remote', icon: '🏠' },
   hybrid: { label: 'Hybrid', icon: '🔄' },
   onsite: { label: 'On-site', icon: '🏢' },
   unknown: { label: 'Not specified', icon: '❓' },
 };
 
 export function JobIntelligenceCard({ 
   jobIntelligence, 
   atsAnalysis, 
   strengthsAnalysis,
   jobTitle,
   company 
 }: JobIntelligenceCardProps) {
   const expLevel = experienceLevelLabels[jobIntelligence.experienceLevel];
   const workMode = workModeLabels[jobIntelligence.workMode];
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-border"
     >
       {/* Header */}
       <div className="flex items-start justify-between mb-4">
         <div>
           <h4 className="font-semibold flex items-center gap-2">
             <Sparkles className="w-4 h-4 text-primary" />
             Job Intelligence
           </h4>
           {(jobTitle || company) && (
             <p className="text-sm text-muted-foreground mt-1">
               {jobTitle}{company && ` at ${company}`}
             </p>
           )}
         </div>
         <Badge variant="secondary" className="text-xs">
           {jobIntelligence.industryDetected}
         </Badge>
       </div>
 
       {/* Quick Stats Row */}
       <div className="grid grid-cols-3 gap-3 mb-4">
         <div className="p-3 rounded-lg bg-card border border-border">
           <div className="flex items-center gap-2 mb-1">
             <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
             <span className="text-xs text-muted-foreground">Level</span>
           </div>
           <Badge className={cn('text-xs', expLevel.color)}>{expLevel.label}</Badge>
         </div>
         
         <div className="p-3 rounded-lg bg-card border border-border">
           <div className="flex items-center gap-2 mb-1">
             <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
             <span className="text-xs text-muted-foreground">Work Mode</span>
           </div>
           <span className="text-sm font-medium">{workMode.icon} {workMode.label}</span>
         </div>
         
         <div className="p-3 rounded-lg bg-card border border-border">
           <div className="flex items-center gap-2 mb-1">
             <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
             <span className="text-xs text-muted-foreground">Salary</span>
           </div>
           {jobIntelligence.salaryRange?.min ? (
             <span className="text-sm font-medium">
               ${(jobIntelligence.salaryRange.min / 1000).toFixed(0)}k-${(jobIntelligence.salaryRange.max / 1000).toFixed(0)}k
             </span>
           ) : (
             <span className="text-sm text-muted-foreground">Not listed</span>
           )}
         </div>
       </div>
 
       {/* ATS Score */}
       {atsAnalysis && (
         <div className="mb-4 p-3 rounded-lg bg-card border border-border">
           <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
               <Zap className="w-4 h-4 text-amber-500" />
               <span className="text-sm font-medium">ATS Keyword Match</span>
             </div>
             <div className="text-right">
               <span className="text-sm text-muted-foreground">{atsAnalysis.originalKeywordDensity}%</span>
               <span className="text-sm mx-1">→</span>
               <span className="text-sm font-semibold text-success">{atsAnalysis.optimizedKeywordDensity}%</span>
             </div>
           </div>
           <Progress 
             value={atsAnalysis.optimizedKeywordDensity} 
             className="h-2"
           />
           {atsAnalysis.criticalKeywords.length > 0 && (
             <div className="mt-2 flex flex-wrap gap-1">
               {atsAnalysis.criticalKeywords.slice(0, 6).map((keyword, i) => (
                 <Badge key={i} variant="outline" className="text-xs">
                   {keyword}
                 </Badge>
               ))}
               {atsAnalysis.criticalKeywords.length > 6 && (
                 <Badge variant="outline" className="text-xs">
                   +{atsAnalysis.criticalKeywords.length - 6} more
                 </Badge>
               )}
             </div>
           )}
         </div>
       )}
 
       {/* Must-Have vs Nice-to-Have Skills */}
       <div className="grid grid-cols-2 gap-3 mb-4">
         <div>
           <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
             <CheckCircle className="w-3 h-3 text-red-500" />
             MUST-HAVE ({jobIntelligence.mustHaveSkills.length})
           </h5>
           <div className="flex flex-wrap gap-1">
             {jobIntelligence.mustHaveSkills.slice(0, 5).map((skill, i) => (
               <Badge key={i} variant="destructive" className="text-xs">
                 {skill}
               </Badge>
             ))}
             {jobIntelligence.mustHaveSkills.length > 5 && (
               <Badge variant="outline" className="text-xs">
                 +{jobIntelligence.mustHaveSkills.length - 5}
               </Badge>
             )}
           </div>
         </div>
         
         <div>
           <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
             <Sparkles className="w-3 h-3 text-amber-500" />
             NICE-TO-HAVE ({jobIntelligence.niceToHaveSkills.length})
           </h5>
           <div className="flex flex-wrap gap-1">
             {jobIntelligence.niceToHaveSkills.slice(0, 5).map((skill, i) => (
               <Badge key={i} variant="secondary" className="text-xs">
                 {skill}
               </Badge>
             ))}
             {jobIntelligence.niceToHaveSkills.length > 5 && (
               <Badge variant="outline" className="text-xs">
                 +{jobIntelligence.niceToHaveSkills.length - 5}
               </Badge>
             )}
           </div>
         </div>
       </div>
 
       {/* Culture Signals */}
       {jobIntelligence.companyCultureSignals.length > 0 && (
         <div className="mb-4">
           <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
             <Building2 className="w-3 h-3" />
             Culture Signals
           </h5>
           <div className="flex flex-wrap gap-1">
             {jobIntelligence.companyCultureSignals.map((signal, i) => (
               <Badge key={i} variant="outline" className="text-xs bg-primary/5">
                 {signal}
               </Badge>
             ))}
           </div>
         </div>
       )}
 
       {/* Your Competitive Edge */}
       {strengthsAnalysis && strengthsAnalysis.length > 0 && (
         <div className="mb-4">
           <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
             <TrendingUp className="w-3 h-3 text-success" />
             Your Competitive Edge
           </h5>
           <div className="space-y-2">
             {strengthsAnalysis.slice(0, 3).map((item, i) => (
               <div key={i} className="p-2 rounded-lg bg-success/10 border border-success/20">
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium">{item.strength}</span>
                   <Badge className="text-xs bg-success/20 text-success">
                     Top {100 - item.percentile}%
                   </Badge>
                 </div>
                 {item.recommendation && (
                   <p className="text-xs text-muted-foreground mt-1">{item.recommendation}</p>
                 )}
               </div>
             ))}
           </div>
         </div>
       )}
 
       {/* Red Flags */}
       {jobIntelligence.redFlags.length > 0 && (
         <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
           <h5 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
             <AlertTriangle className="w-3 h-3" />
             Things to Consider
           </h5>
           <ul className="space-y-1">
             {jobIntelligence.redFlags.map((flag, i) => (
               <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                 <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                 {flag}
               </li>
             ))}
           </ul>
         </div>
       )}
     </motion.div>
   );
 }
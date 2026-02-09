import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, GitBranch, Target, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResumeListCard } from './ResumeListCard';
import { DatabaseResume } from '@/hooks/useResumes';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ResumeGroupProps {
  masterResume: DatabaseResume;
  tailoredVersions: DatabaseResume[];
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onInterview?: (id: string) => void;
  onCreateTailored: (parentId: string) => void;
  delay?: number;
}

export function ResumeGroup({
  masterResume,
  tailoredVersions,
  onEdit,
  onDuplicate,
  onDelete,
  onInterview,
  onCreateTailored,
  delay = 0,
}: ResumeGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasTailored = tailoredVersions.length > 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="space-y-2"
    >
      {/* Master Resume Card */}
      <div className="relative">
        {hasTailored && (
          <button
            onClick={toggleExpand}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full',
              'w-8 h-8 flex items-center justify-center',
              'text-muted-foreground hover:text-foreground transition-colors',
              'z-10'
            )}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        )}
        
        <div className="relative">
          <ResumeListCard
            resume={masterResume}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onInterview={onInterview}
            delay={0}
            showMasterBadge={hasTailored}
          />
          
          {/* Tailored count badge */}
          {hasTailored && !isExpanded && (
            <div 
              className={cn(
                'absolute -bottom-2 left-1/2 -translate-x-1/2',
                'px-2 py-0.5 rounded-full',
                'bg-secondary text-secondary-foreground',
                'text-xs font-medium',
                'border border-border shadow-sm',
                'cursor-pointer hover:bg-secondary/80 transition-colors'
              )}
              onClick={toggleExpand}
            >
              <GitBranch className="w-3 h-3 inline mr-1" />
              {tailoredVersions.length} tailored version{tailoredVersions.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Tailored Versions */}
      <AnimatePresence>
        {isExpanded && hasTailored && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="pl-6 border-l-2 border-primary/20 ml-4 space-y-2"
          >
            {tailoredVersions.map((resume, index) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ResumeListCard
                  resume={resume}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onInterview={onInterview}
                  delay={0}
                  showTailoredBadge
                />
              </motion.div>
            ))}
            
            {/* Create new tailored version */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: tailoredVersions.length * 0.05 }}
              onClick={() => {
                haptics.light();
                onCreateTailored(masterResume.id);
              }}
              className={cn(
                'w-full py-3 px-4 rounded-xl',
                'border-2 border-dashed border-primary/30',
                'text-primary text-sm font-medium',
                'flex items-center justify-center gap-2',
                'hover:bg-primary/5 hover:border-primary/50',
                'transition-all duration-200'
              )}
            >
              <Plus className="w-4 h-4" />
              Create Tailored Version
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper to organize resumes into hierarchy
export function organizeResumeHierarchy(resumes: DatabaseResume[]) {
  const masterResumes: DatabaseResume[] = [];
  const tailoredByParent: Record<string, DatabaseResume[]> = {};
  const orphanTailored: DatabaseResume[] = [];

  resumes.forEach((resume) => {
    if (!resume.parent_resume_id) {
      masterResumes.push(resume);
    } else {
      if (!tailoredByParent[resume.parent_resume_id]) {
        tailoredByParent[resume.parent_resume_id] = [];
      }
      tailoredByParent[resume.parent_resume_id].push(resume);
    }
  });

  // Check for orphaned tailored resumes (parent was deleted)
  Object.entries(tailoredByParent).forEach(([parentId, tailored]) => {
    const parentExists = masterResumes.some((m) => m.id === parentId);
    if (!parentExists) {
      // Promote orphaned resumes to master level
      orphanTailored.push(...tailored);
    }
  });

  return {
    masterResumes,
    tailoredByParent,
    orphanTailored,
  };
}

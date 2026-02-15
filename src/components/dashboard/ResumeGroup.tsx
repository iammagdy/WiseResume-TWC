import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, GitBranch, GitCompare, Target, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResumeListCard } from './ResumeListCard';
import { VersionCompareSheet } from './VersionCompareSheet';
import { DatabaseResume } from '@/hooks/useResumes';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ResumeGroupProps {
  masterResume: DatabaseResume;
  tailoredVersions: DatabaseResume[];
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onInterview?: (id: string) => void;
  onCreateTailored: (parentId: string) => void;
  healthScores?: Record<string, ResumeHealthScore>;
  scoringId?: string | null;
}

export function ResumeGroup({
  masterResume,
  tailoredVersions,
  onEdit,
  onDuplicate,
  onDelete,
  onRename,
  onInterview,
  onCreateTailored,
  healthScores = {},
  scoringId = null,
}: ResumeGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const hasTailored = tailoredVersions.length > 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="space-y-2">
      {/* Master Resume Card */}
      <div>
        <ResumeListCard
          resume={masterResume}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onRename={onRename}
          onInterview={onInterview}
          showMasterBadge={hasTailored}
          healthScore={healthScores[masterResume.id]}
          isScoring={scoringId === masterResume.id}
        />
        
        {/* Tailored count badge - static below card */}
        {hasTailored && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <button
              className={cn(
                'px-3 py-1.5 rounded-full min-h-[36px]',
                'bg-secondary text-secondary-foreground',
                'text-xs font-medium',
                'border border-border shadow-sm',
                'cursor-pointer hover:bg-secondary/80 transition-colors',
                'flex items-center gap-1.5 touch-manipulation'
              )}
              onClick={toggleExpand}
            >
              <GitBranch className="w-3 h-3" />
              {tailoredVersions.length} tailored version{tailoredVersions.length > 1 ? 's' : ''}
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
            {tailoredVersions.length >= 2 && (
              <button
                className={cn(
                  'px-3 py-1.5 rounded-full min-h-[36px]',
                  'bg-primary/10 text-primary',
                  'text-xs font-medium',
                  'border border-primary/20 shadow-sm',
                  'cursor-pointer hover:bg-primary/20 transition-colors',
                  'flex items-center gap-1.5 touch-manipulation'
                )}
                onClick={(e) => { e.stopPropagation(); haptics.light(); setShowCompare(true); }}
              >
                <GitCompare className="w-3 h-3" />
                Compare
              </button>
            )}
          </div>
        )}
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
                  onRename={onRename}
                  onInterview={onInterview}
                  showTailoredBadge
                  healthScore={healthScores[resume.id]}
                  isScoring={scoringId === resume.id}
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

      <VersionCompareSheet
        open={showCompare}
        onOpenChange={setShowCompare}
        masterResume={masterResume}
        tailoredVersions={tailoredVersions}
      />
    </div>
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

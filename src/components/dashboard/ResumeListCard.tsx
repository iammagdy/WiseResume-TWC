import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Star,
  FileText,
  Target,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DatabaseResume } from '@/hooks/useResumes';

interface ResumeListCardProps {
  resume: DatabaseResume;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  delay?: number;
}

export function ResumeListCard({
  resume,
  onEdit,
  onDuplicate,
  onDelete,
  delay = 0,
}: ResumeListCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hasTargetJob = resume.target_job_title || resume.target_company;
  const matchScore = resume.job_match_score;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success/10 text-success border-success/20';
    if (score >= 60) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass rounded-xl border border-border p-4 touch-manipulation"
      onClick={() => onEdit(resume.id)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon and Content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Resume Icon */}
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-2 mb-1">
              {resume.is_primary && (
                <Star className="w-4 h-4 text-warning fill-warning flex-shrink-0" />
              )}
              <h3 className="font-semibold text-foreground truncate">
                {resume.title}
              </h3>
            </div>

            {/* Target Job */}
            {hasTargetJob ? (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <Target className="w-3.5 h-3.5" />
                <span className="truncate">
                  {resume.target_job_title}
                  {resume.target_company && ` • ${resume.target_company}`}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">
                No target job set
              </p>
            )}

            {/* Bottom Row: Score and Time */}
            <div className="flex items-center gap-3">
              {matchScore !== null && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getScoreBg(matchScore)}`}
                >
                  {matchScore}% match
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Menu */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(resume.id);
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(resume.id);
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(resume.id);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

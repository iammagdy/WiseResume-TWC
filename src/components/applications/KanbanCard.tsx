import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import {
  GripVertical,
  Bell,
  Calendar,
  FileText,
  Mail,
  PenLine,
  Trash2,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { JobApplication } from '@/hooks/useJobApplications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays, differenceInHours } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { haptics } from '@/lib/haptics';

const AVATAR_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300' },
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getDeadlineBadge(deadline: string | null) {
  if (!deadline) return null;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysLeft = differenceInDays(deadlineDate, now);
  const hoursLeft = differenceInHours(deadlineDate, now);

  if (hoursLeft < 0) return { text: 'Expired', cls: 'bg-muted text-muted-foreground' };
  if (daysLeft < 1) return { text: `${hoursLeft}h left`, cls: 'bg-destructive/10 text-destructive' };
  if (daysLeft <= 3) return { text: `${daysLeft}d left`, cls: 'bg-destructive/10 text-destructive' };
  if (daysLeft <= 7) return { text: `${daysLeft}d left`, cls: 'bg-warning/10 text-warning' };
  return null;
}

interface KanbanCardProps {
  application: JobApplication;
  onDelete: (id: string) => void;
}

export const KanbanCard = memo(function KanbanCard({ application, onDelete }: KanbanCardProps) {
  const navigate = useNavigate();
  const avatarColor = getAvatarColor(application.company);
  const deadlineBadge = getDeadlineBadge(application.deadline);
  const hasReminder = !!application.remind_at;
  const timeAgo = formatDistanceToNow(new Date(application.applied_at), { addSuffix: true });
  const initial = application.company.charAt(0).toUpperCase();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { application },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => { haptics.light(); navigate(`/application/${application.id}`); }}
      className={cn(
        'bg-card border border-border rounded-xl p-3 space-y-2.5',
        'cursor-pointer transition-shadow hover:shadow-md select-none active:scale-[0.99]',
        isDragging && 'opacity-40 shadow-xl ring-2 ring-primary/40',
      )}
    >
      {/* Top row: avatar + info + handle + menu */}
      <div className="flex items-start gap-2">
        {/* Company avatar — click propagates to parent card */}
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold uppercase',
            avatarColor.bg,
            avatarColor.text,
          )}
        >
          {initial}
        </div>

        {/* Job info — click propagates to parent card */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate">{application.job_title}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{application.company}</p>
        </div>

        {/* Drag handle — stops propagation so card navigation doesn't fire */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-1 cursor-grab active:cursor-grabbing rounded-md hover:bg-muted text-muted-foreground touch-manipulation shrink-0 mt-0.5"
          aria-label="Drag to move card"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* 3-dot menu — stops propagation so card navigation doesn't fire */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0 mt-0.5"
              aria-label="More options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => { haptics.light(); navigate(`/application/${application.id}`); }}
            >
              <FileText className="w-3.5 h-3.5 mr-2" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { haptics.light(); navigate(`/application/${application.id}?editNotes=1`); }}
            >
              <PenLine className="w-3.5 h-3.5 mr-2" />
              Edit notes
            </DropdownMenuItem>
            {application.url && (
              <DropdownMenuItem
                onClick={() => window.open(application.url!, '_blank', 'noopener')}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                Job posting
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { haptics.medium(); onDelete(application.id); }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges row */}
      {(deadlineBadge || hasReminder || application.resume_id || application.cover_letter_id) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {deadlineBadge && (
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1',
                deadlineBadge.cls,
              )}
            >
              <Calendar className="w-2.5 h-2.5" />
              {deadlineBadge.text}
            </span>
          )}
          {hasReminder && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warning/10 text-warning flex items-center gap-1">
              <Bell className="w-2.5 h-2.5" />
              Reminder
            </span>
          )}
          {application.resume_id && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" />
              Resume
            </span>
          )}
          {application.cover_letter_id && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Mail className="w-2.5 h-2.5" />
              Letter
            </span>
          )}
        </div>
      )}

      {/* Time ago */}
      <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
    </div>
  );
});

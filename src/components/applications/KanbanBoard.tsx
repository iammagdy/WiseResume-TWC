import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useJobApplications,
  useJobApplicationMutations,
  JobApplication,
  ApplicationStatus,
} from '@/hooks/useJobApplications';

import { KanbanColumn, KanbanColumnDef } from './KanbanColumn';
import { getAvatarColor } from './KanbanCard';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

const COLUMNS: KanbanColumnDef[] = [
  {
    status: 'saved',
    label: 'Saved',
    headerColorClass: 'text-muted-foreground',
    dotColorClass: 'bg-muted-foreground/60',
    badgeColorClass: 'bg-muted text-muted-foreground',
  },
  {
    status: 'applied',
    label: 'Applied',
    headerColorClass: 'text-primary',
    dotColorClass: 'bg-primary',
    badgeColorClass: 'bg-primary/10 text-primary',
  },
  {
    status: 'screening',
    label: 'Screening',
    headerColorClass: 'text-blue-600 dark:text-blue-400',
    dotColorClass: 'bg-blue-500',
    badgeColorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    status: 'interviewing',
    label: 'Interviewing',
    headerColorClass: 'text-warning',
    dotColorClass: 'bg-warning',
    badgeColorClass: 'bg-warning/10 text-warning',
  },
  {
    status: 'offer',
    label: 'Offer',
    headerColorClass: 'text-success',
    dotColorClass: 'bg-success',
    badgeColorClass: 'bg-success/10 text-success',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    headerColorClass: 'text-destructive',
    dotColorClass: 'bg-destructive',
    badgeColorClass: 'bg-destructive/10 text-destructive',
  },
];

function ColumnSkeleton() {
  return (
    <div className="w-[270px] shrink-0 flex flex-col">
      <div className="h-5 w-24 rounded-full bg-muted animate-pulse mb-3 ml-1" />
      <div className="flex flex-col gap-2 bg-muted/30 rounded-xl p-2 min-h-[180px]">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="h-2 bg-muted rounded animate-pulse w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface KanbanBoardProps {
  applications?: JobApplication[];
  onApplicationsChange?: (apps: JobApplication[]) => void;
}

export function KanbanBoard({ applications: applicationsProp, onApplicationsChange }: KanbanBoardProps = {}) {
  const { data: internalApps = [], isLoading } = useJobApplications();
  const serverApplications = applicationsProp ?? internalApps;
  const { updateApplication, deleteApplication } = useJobApplicationMutations();
  const [localCards, setLocalCards] = useState<JobApplication[]>([]);
  const [activeCard, setActiveCard] = useState<JobApplication | null>(null);

  useEffect(() => {
    setLocalCards(serverApplications);
  }, [serverApplications]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onApplicationsChange?.(localCards);
  }, [localCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = localCards.find((c) => c.id === event.active.id);
      if (card) setActiveCard(card);
      haptics.selection();
    },
    [localCards],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over) return;

      const cardId = active.id as string;
      const newStatus = over.id as ApplicationStatus;
      const card = localCards.find((c) => c.id === cardId);
      if (!card || card.status === newStatus) return;

      const snapshot = [...localCards];

      setLocalCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c)),
      );
      haptics.medium();

      updateApplication.mutate(
        { id: cardId, status: newStatus },
        {
          onError: () => {
            setLocalCards(snapshot);
            toast.error('Failed to move card — changes reverted');
          },
        },
      );
    },
    [localCards, updateApplication],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const snapshot = [...localCards];
      setLocalCards((prev) => prev.filter((c) => c.id !== id));
      deleteApplication.mutate(id, {
        onError: () => setLocalCards(snapshot),
      });
    },
    [deleteApplication, localCards],
  );

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 -mx-4 px-4 scrollbar-none">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.status} />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-3 px-1 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {localCards.length} application{localCards.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {COLUMNS.filter((c) => c.status !== 'rejected' && c.status !== 'saved').map((col) => {
            const count = localCards.filter((c) => c.status === col.status).length;
            if (!count) return null;
            return (
              <span
                key={col.status}
                className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', col.badgeColorClass)}
              >
                {col.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Board — horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            column={col}
            cards={localCards.filter((c) => c.status === col.status)}
            onDelete={handleDelete}
          />
        ))}
        {/* Right padding sentinel */}
        <div className="w-2 shrink-0" />
      </div>

      {/* Drag overlay card */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeCard ? (
          <div className="rotate-1 w-[270px] shadow-2xl opacity-95">
            <div className="bg-card border border-border rounded-xl p-3 space-y-2.5 ring-2 ring-primary/40">
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold uppercase',
                    getAvatarColor(activeCard.company).bg,
                    getAvatarColor(activeCard.company).text,
                  )}
                >
                  {activeCard.company.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-tight truncate">{activeCard.job_title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{activeCard.company}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

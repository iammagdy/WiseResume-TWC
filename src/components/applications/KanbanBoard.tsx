import { useState, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CheckCircle2 } from 'lucide-react';

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

interface MobileCardItemProps {
  card: JobApplication;
  onDelete: (id: string) => void;
  onMoveRequest: (card: JobApplication) => void;
}

function MobileCardItem({ card, onDelete, onMoveRequest }: MobileCardItemProps) {
  const avatarColor = getAvatarColor(card.company);
  const initial = card.company.charAt(0).toUpperCase();

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold uppercase',
          avatarColor.bg,
          avatarColor.text,
        )}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight truncate">{card.job_title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{card.company}</p>
      </div>
      <button
        onClick={() => { haptics.light(); onMoveRequest(card); }}
        className="shrink-0 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground transition-colors min-h-[36px] touch-manipulation"
      >
        Move
      </button>
    </div>
  );
}

// Mobile-only virtualized card list. Falls back to plain map for short
// lists where virtualization overhead exceeds the savings.
const MOBILE_VIRTUALIZE_THRESHOLD = 25;

function MobileVirtualList({
  cards,
  onDelete,
  onMoveRequest,
}: {
  cards: JobApplication[];
  onDelete: (id: string) => void;
  onMoveRequest: (card: JobApplication) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const enabled = cards.length > MOBILE_VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: enabled ? cards.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 6,
    getItemKey: (i) => cards[i]?.id ?? i,
  });

  if (!enabled) {
    return (
      <>
        {cards.map((card) => (
          <MobileCardItem key={card.id} card={card} onDelete={onDelete} onMoveRequest={onMoveRequest} />
        ))}
      </>
    );
  }

  return (
    <div ref={parentRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 220px)' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const card = cards[vi.index];
          if (!card) return null;
          return (
            <div
              key={card.id}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                transform: `translateY(${vi.start}px)`, paddingBottom: 8,
              }}
            >
              <MobileCardItem card={card} onDelete={onDelete} onMoveRequest={onMoveRequest} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MoveStatusSheetProps {
  card: JobApplication | null;
  onClose: () => void;
  onMove: (card: JobApplication, status: ApplicationStatus) => void;
}

function MoveStatusSheet({ card, onClose, onMove }: MoveStatusSheetProps) {
  const isOpen = !!card;

  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[60dvh]">
        <SheetHeader>
          <SheetTitle className="text-left text-base">Move to…</SheetTitle>
        </SheetHeader>
        {card && (
          <div className="py-3 space-y-1">
            <p className="text-xs text-muted-foreground px-1 mb-3 truncate">
              {card.job_title} · {card.company}
            </p>
            {COLUMNS.map((col) => {
              const isCurrent = card.status === col.status;
              return (
                <button
                  key={col.status}
                  onClick={() => {
                    if (!isCurrent) {
                      onMove(card, col.status);
                    }
                    onClose();
                  }}
                  disabled={isCurrent}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors min-h-[48px] touch-manipulation',
                    isCurrent
                      ? 'bg-muted/60 opacity-60 cursor-not-allowed'
                      : 'hover:bg-muted active:scale-[0.98]'
                  )}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', col.dotColorClass)} />
                  <span className={cn('flex-1 text-sm font-medium text-left', col.headerColorClass)}>
                    {col.label}
                  </span>
                  {isCurrent && <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function KanbanBoard() {
  // Cards are now driven directly off the React Query cache. Optimistic
  // updates live inside useJobApplicationMutations (onMutate snapshots the
  // cache, applies the change, and rolls back on error), so we no longer
  // need a localCards mirror state or a serverApplications→local sync
  // effect that would re-render the entire board on every refetch.
  const { data: cards = [], isLoading } = useJobApplications();
  const { updateApplication, deleteApplication } = useJobApplicationMutations();
  const [activeCard, setActiveCard] = useState<JobApplication | null>(null);
  const [mobileActiveStatus, setMobileActiveStatus] = useState<ApplicationStatus>('applied');
  const [moveTarget, setMoveTarget] = useState<JobApplication | null>(null);
  const mobileTabRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor,  {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  // Bucket cards by status once per cards-array change so each column
  // doesn't run its own .filter on every render.
  const cardsByStatus = useMemo(() => {
    const map: Record<ApplicationStatus, JobApplication[]> = {
      saved: [], applied: [], screening: [], interviewing: [], offer: [], rejected: [],
    };
    for (const c of cards) {
      const s = (map[c.status] ?? map.saved);
      s.push(c);
    }
    return map;
  }, [cards]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = cards.find((c) => c.id === event.active.id);
      if (card) setActiveCard(card);
      haptics.selection();
    },
    [cards],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);
      if (!over) return;

      const cardId = active.id as string;
      const newStatus = over.id as ApplicationStatus;
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.status === newStatus) return;

      haptics.medium();
      // The mutation handles optimistic update + rollback + error toast.
      updateApplication.mutate(
        { id: cardId, status: newStatus },
        { onError: () => toast.error('Failed to move card — changes reverted') },
      );
    },
    [cards, updateApplication],
  );

  const handleDelete = useCallback(
    (id: string) => { deleteApplication.mutate(id); },
    [deleteApplication],
  );

  const handleMobileMove = useCallback(
    (card: JobApplication, newStatus: ApplicationStatus) => {
      if (card.status === newStatus) return;
      haptics.medium();
      updateApplication.mutate(
        { id: card.id, status: newStatus },
        { onError: () => toast.error('Failed to move card — changes reverted') },
      );
    },
    [updateApplication],
  );

  const handleMobileTabChange = useCallback((status: ApplicationStatus) => {
    haptics.selection();
    setMobileActiveStatus(status);
    const tabEl = mobileTabRef.current?.querySelector(`[data-status="${status}"]`) as HTMLElement | null;
    tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 -mx-4 px-4 scrollbar-none">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.status} />
        ))}
      </div>
    );
  }

  const activeColumnDef = COLUMNS.find((c) => c.status === mobileActiveStatus) ?? COLUMNS[0];
  const mobileCards = cardsByStatus[mobileActiveStatus] ?? [];

  return (
    <>
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-3 px-1 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {cards.length} application{cards.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {COLUMNS.filter((c) => c.status !== 'rejected' && c.status !== 'saved').map((col) => {
            const count = (cardsByStatus[col.status] ?? []).length;
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

      {/* Mobile view — column tabs (hidden on lg+) */}
      <div className="lg:hidden">
        {/* Column tab strip */}
        <div
          ref={mobileTabRef}
          className="flex gap-1 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 snap-x snap-mandatory mb-3"
        >
          {COLUMNS.map((col) => {
            const count = (cardsByStatus[col.status] ?? []).length;
            const isActive = mobileActiveStatus === col.status;
            return (
              <button
                key={col.status}
                data-status={col.status}
                onClick={() => handleMobileTabChange(col.status)}
                className={cn(
                  'shrink-0 snap-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[36px] touch-manipulation',
                  isActive
                    ? 'bg-card border border-border shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', col.dotColorClass)} />
                {col.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-medium px-1 py-0 rounded-full min-w-[16px] text-center',
                    isActive ? col.badgeColorClass : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active column card list — virtualized when long */}
        <div className="flex flex-col gap-2">
          {mobileCards.length > 0 ? (
            <MobileVirtualList
              cards={mobileCards}
              onDelete={handleDelete}
              onMoveRequest={setMoveTarget}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mb-3', activeColumnDef.badgeColorClass)}>
                <span className={cn('w-3 h-3 rounded-full', activeColumnDef.dotColorClass)} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No {activeColumnDef.label} applications</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Use "Move" on a card to change its status</p>
            </div>
          )}
        </div>

        <MoveStatusSheet
          card={moveTarget}
          onClose={() => setMoveTarget(null)}
          onMove={handleMobileMove}
        />
      </div>

      {/* Desktop view — full Kanban board (hidden below lg) */}
      <div className="hidden lg:block">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Board — horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto pb-6 pt-1 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                column={col}
                cards={cardsByStatus[col.status] ?? []}
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
      </div>
    </>
  );
}

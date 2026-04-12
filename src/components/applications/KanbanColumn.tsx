import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobApplication, ApplicationStatus } from '@/hooks/useJobApplications';
import { KanbanCard } from './KanbanCard';
import { QuickAddInline } from './QuickAddInline';

export interface KanbanColumnDef {
  status: ApplicationStatus;
  label: string;
  headerColorClass: string;
  dotColorClass: string;
  badgeColorClass: string;
}

interface KanbanColumnProps {
  column: KanbanColumnDef;
  cards: JobApplication[];
  onDelete: (id: string) => void;
}

export function KanbanColumn({ column, cards, onDelete }: KanbanColumnProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(column.status === 'rejected');

  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  const isRejected = column.status === 'rejected';

  return (
    <div className="flex flex-col w-[270px] shrink-0 snap-start">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 mb-3 min-h-[28px]">
        {isRejected ? (
          /* Rejected: collapsible header + Add button always visible */
          <>
            <button
              onClick={() => setIsCollapsed((v) => !v)}
              className="flex items-center gap-2 flex-1 text-left min-h-[32px] touch-manipulation"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={cn('text-[11px] font-bold uppercase tracking-widest', column.headerColorClass)}>
                {column.label}
              </span>
              {cards.length > 0 && (
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', column.badgeColorClass)}>
                  {cards.length}
                </span>
              )}
            </button>
            {/* + Add button also available on rejected column */}
            <button
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setShowQuickAdd((v) => !v);
              }}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors touch-manipulation shrink-0"
              aria-label="Add to Rejected"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          /* Normal column header */
          <>
            <span className={cn('w-2 h-2 rounded-full shrink-0', column.dotColorClass)} />
            <span className={cn('text-[11px] font-bold uppercase tracking-widest flex-1', column.headerColorClass)}>
              {column.label}
            </span>
            {cards.length > 0 && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', column.badgeColorClass)}>
                {cards.length}
              </span>
            )}
            <button
              onClick={() => setShowQuickAdd((v) => !v)}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors touch-manipulation"
              aria-label={`Add to ${column.label}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Droppable cards area — slim when rejected is collapsed */}
      {isCollapsed && isRejected ? (
        <>
          <div
            ref={setNodeRef}
            className={cn(
              'h-12 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors',
              isOver
                ? 'border-destructive/50 bg-destructive/5'
                : 'border-muted-foreground/20',
            )}
          >
            {isOver && (
              <span className="text-xs text-destructive font-medium">Drop to reject</span>
            )}
          </div>
          {showQuickAdd && (
            <QuickAddInline
              defaultStatus={column.status}
              onClose={() => setShowQuickAdd(false)}
            />
          )}
        </>
      ) : (
        <>
          <div
            ref={setNodeRef}
            className={cn(
              'flex flex-col gap-2 flex-1 rounded-xl p-2 transition-colors min-h-[120px]',
              isOver ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset' : 'bg-muted/30',
            )}
          >
            {cards.length > 0 ? (
              cards.map((card) => (
                <KanbanCard
                  key={card.id}
                  application={card}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-center px-2">
                <p className="text-[11px] text-muted-foreground/70">Nothing here yet</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  {isRejected ? 'Drag cards here' : 'Drag a card or tap +'}
                </p>
              </div>
            )}
          </div>

          {/* Quick-add inline form */}
          {showQuickAdd && (
            <QuickAddInline
              defaultStatus={column.status}
              onClose={() => setShowQuickAdd(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

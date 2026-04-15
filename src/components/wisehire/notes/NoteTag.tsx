import { cn } from '@/lib/utils';
import type { NoteTag } from '@/hooks/wisehire/useCandidateNotes';

const TAG_CONFIG: Record<NoteTag, { label: string; className: string }> = {
  general: {
    label: 'General',
    className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  },
  highlight: {
    label: 'Highlight',
    className: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  },
  concern: {
    label: 'Concern',
    className: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  },
};

interface Props {
  tag: NoteTag;
  onClick?: () => void;
  active?: boolean;
}

export function NoteTagBadge({ tag, onClick, active }: Props) {
  const cfg = TAG_CONFIG[tag];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-all',
        cfg.className,
        active && 'ring-2 ring-offset-1 ring-current',
        onClick && 'hover:opacity-80 cursor-pointer',
        !onClick && 'cursor-default',
      )}
    >
      {cfg.label}
    </button>
  );
}

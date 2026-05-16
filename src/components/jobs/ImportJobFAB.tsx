import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportJobFABProps {
  offsetClass: string;
  onOpen: () => void;
}

export function ImportJobFAB({ offsetClass, onOpen }: ImportJobFABProps) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        'fixed left-4 z-50 lg:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-full shadow-soft-lg',
        'bg-secondary text-secondary-foreground border border-border',
        'active:scale-95 transition-all touch-manipulation',
        offsetClass
      )}
      aria-label="Import a job"
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-medium">Import Job</span>
    </button>
  );
}

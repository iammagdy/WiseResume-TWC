import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Keyboard } from 'lucide-react';

interface ShortcutGroup {
  title: string;
  scope: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    scope: 'Available anywhere in the app',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette / search' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Dashboard',
    scope: 'Available on the dashboard',
    shortcuts: [
      { keys: ['N'], description: 'Create new resume' },
      { keys: ['I'], description: 'Import / upload resume' },
    ],
  },
  {
    title: 'Resume Editor',
    scope: 'Available while editing a resume',
    shortcuts: [
      { keys: ['⌘', 'Z'], description: 'Undo last change' },
      { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
      { keys: ['⌘', 'S'], description: 'Save now' },
    ],
  },
  {
    title: 'Global',
    scope: 'Available anywhere in the app',
    shortcuts: [
      { keys: ['Esc'], description: 'Close open sheet or dialog' },
    ],
  },
];

function KeyChip({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md border border-border bg-muted text-[11px] font-mono font-semibold text-foreground shadow-sm">
      {label}
    </kbd>
  );
}

interface ShortcutHelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutHelpSheet({ open, onOpenChange }: ShortcutHelpSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Keyboard className="w-4 h-4 text-primary" />
            Keyboard Shortcuts
          </SheetTitle>
        </SheetHeader>
        <div className="pt-4 space-y-5">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.title}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {group.title}
              </p>
              <p className="text-xs text-muted-foreground mb-2">{group.scope}</p>
              <div className="space-y-2">
                {group.shortcuts.map(s => (
                  <div key={s.description} className="flex items-center justify-between gap-4 py-1">
                    <span className="text-sm text-foreground">{s.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, i) => (
                        <KeyChip key={i} label={k} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

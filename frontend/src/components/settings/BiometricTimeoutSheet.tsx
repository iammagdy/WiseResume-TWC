import { Clock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { haptics } from '@/lib/haptics';
import { BiometricLockTimeout } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

interface BiometricTimeoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTimeout: BiometricLockTimeout;
  onSelect: (timeout: BiometricLockTimeout) => void;
}

const TIMEOUT_OPTIONS: { value: BiometricLockTimeout; label: string; description: string }[] = [
  { value: 0, label: 'Immediately', description: 'Lock when app goes to background' },
  { value: 30000, label: '30 seconds', description: 'Lock after 30 seconds in background' },
  { value: 60000, label: '1 minute', description: 'Lock after 1 minute in background' },
  { value: 300000, label: '5 minutes', description: 'Lock after 5 minutes in background' },
];

export function BiometricTimeoutSheet({
  open,
  onOpenChange,
  selectedTimeout,
  onSelect,
}: BiometricTimeoutSheetProps) {
  const handleSelect = (timeout: BiometricLockTimeout) => {
    haptics.light();
    onSelect(timeout);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Require Authentication After
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {TIMEOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'w-full p-4 rounded-xl text-left transition-all active:scale-[0.98] touch-manipulation',
                selectedTimeout === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              <div className="font-medium">{option.label}</div>
              <div
                className={cn(
                  'text-sm mt-0.5',
                  selectedTimeout === option.value
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground'
                )}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

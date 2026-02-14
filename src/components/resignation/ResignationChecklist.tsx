import { motion } from 'framer-motion';
import { Check, FileCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

const CHECKLIST_ITEMS = [
  { id: 'review_contract', label: 'Review employment contract', description: 'Check notice period and non-compete clauses' },
  { id: 'check_notice', label: 'Check notice period requirement', description: 'Confirm your contractual obligations' },
  { id: 'schedule_meeting', label: 'Schedule meeting with manager', description: 'Deliver your resignation in person first' },
  { id: 'document_work', label: 'Document your work & handover', description: 'Create guides for ongoing projects' },
  { id: 'return_property', label: 'Return company property', description: 'Laptop, badges, keys, and other items' },
  { id: 'request_reference', label: 'Request reference letter', description: 'Ask your manager or colleagues' },
  { id: 'final_paycheck', label: 'Get final paycheck details', description: 'Verify unused PTO payout and benefits' },
  { id: 'transfer_knowledge', label: 'Transfer knowledge to team', description: 'Share passwords, contacts, and processes' },
  { id: 'update_linkedin', label: 'Update LinkedIn profile', description: 'Update your work history and connections' },
  { id: 'collect_contacts', label: 'Collect contact information', description: 'Save personal contacts of colleagues' },
];

interface ResignationChecklistProps {
  completedItems: string[];
  onToggle: (itemId: string) => void;
}

export function ResignationChecklist({ completedItems, onToggle }: ResignationChecklistProps) {
  const progress = Math.round((completedItems.length / CHECKLIST_ITEMS.length) * 100);

  const handleToggle = (itemId: string) => {
    haptics.light();
    onToggle(itemId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Resignation Checklist</h3>
        </div>
        <span className="text-sm font-semibold text-primary">{progress}%</span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => {
          const isCompleted = completedItems.includes(item.id);
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              style={{ touchAction: 'pan-y' }}
              onClick={() => handleToggle(item.id)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-xl border transition-all touch-manipulation text-left active:scale-95',
                isCompleted
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-card/60 border-border/40 hover:border-primary/30'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                isCompleted
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground/30'
              )}>
                {isCompleted && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </div>
              <div className="min-w-0">
                <p className={cn(
                  'text-sm font-medium transition-all',
                  isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                )}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

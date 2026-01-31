import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface AIAction {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface AIActionBarProps {
  primaryActions: AIAction[];
  moreActions?: AIAction[];
  onAction: (actionId: string) => void;
  isLoading: boolean;
  loadingAction?: string | null;
  disabled?: boolean;
}

export function AIActionBar({
  primaryActions,
  moreActions,
  onAction,
  isLoading,
  loadingAction,
  disabled = false,
}: AIActionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20"
    >
      <div className="flex items-center gap-1.5 text-primary">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-medium">AI Assist</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-hide">
        {primaryActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onAction(action.id)}
            disabled={disabled || isLoading}
            className="shrink-0 h-8 px-3 text-xs gap-1.5 border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {isLoading && loadingAction === action.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : action.icon ? (
              action.icon
            ) : null}
            {action.label}
          </Button>
        ))}

        {moreActions && moreActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || isLoading}
                className="shrink-0 h-8 px-3 text-xs gap-1 border-primary/30"
              >
                More
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {moreActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => onAction(action.id)}
                  disabled={isLoading}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}

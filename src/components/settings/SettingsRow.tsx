import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface SettingsRowBaseProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

interface SettingsRowNavigationProps extends SettingsRowBaseProps {
  type: 'navigation';
  value?: string;
  onClick: () => void;
}

interface SettingsRowToggleProps extends SettingsRowBaseProps {
  type: 'toggle';
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

interface SettingsRowButtonProps extends SettingsRowBaseProps {
  type: 'button';
  onClick: () => void;
  destructive?: boolean;
}

type SettingsRowProps = 
  | SettingsRowNavigationProps 
  | SettingsRowToggleProps 
  | SettingsRowButtonProps;

export function SettingsRow(props: SettingsRowProps) {
  const { label, description, icon, className } = props;

  if (props.type === 'toggle') {
    return (
      <div className={cn(
        'flex items-center justify-between py-3 px-4 min-h-[52px]',
        className
      )}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="text-muted-foreground flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{label}</p>
            {description && (
              <p className="text-xs text-muted-foreground truncate">
                {description}
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={props.checked}
          onCheckedChange={(checked) => {
            haptics.light();
            props.onCheckedChange(checked);
          }}
        />
      </div>
    );
  }

  if (props.type === 'navigation') {
    return (
      <button
        onClick={() => {
          haptics.light();
          props.onClick();
        }}
        className={cn(
          'flex items-center justify-between py-3 px-4 w-full min-h-[52px]',
          'text-left active:bg-muted/50 transition-colors touch-manipulation',
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="text-muted-foreground flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{label}</p>
            {description && (
              <p className="text-xs text-muted-foreground truncate">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {props.value && (
            <span className="text-sm text-muted-foreground">
              {props.value}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  // Button type
  return (
    <button
      onClick={() => {
        haptics.medium();
        props.onClick();
      }}
      className={cn(
        'flex items-center gap-3 py-3 px-4 w-full min-h-[52px]',
        'text-left active:bg-muted/50 transition-colors touch-manipulation',
        props.destructive && 'text-destructive',
        className
      )}
    >
      {icon && (
        <div className={cn('flex-shrink-0', !props.destructive && 'text-muted-foreground')}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{label}</p>
        {description && (
          <p className={cn(
            'text-xs truncate',
            props.destructive ? 'text-destructive/70' : 'text-muted-foreground'
          )}>
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

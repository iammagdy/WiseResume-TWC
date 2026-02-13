import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  requiresAccount?: boolean;
}

interface SettingsRowToggleProps extends SettingsRowBaseProps {
  type: 'toggle';
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  showStateLabel?: boolean;
  stateLabel?: { on: string; off: string };
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
        'flex items-center justify-between py-3.5 px-4 min-h-[56px]',
        'transition-colors',
         props.disabled && 'opacity-50',
        className
      )}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary flex-shrink-0">
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
          {(props.showStateLabel !== false) && (
            <span className="text-xs text-muted-foreground min-w-[20px] text-right">
              {props.checked
                ? (props.stateLabel?.on ?? 'On')
                : (props.stateLabel?.off ?? 'Off')}
            </span>
          )}
          <Switch
            checked={props.checked}
            disabled={props.disabled}
            onCheckedChange={(checked) => {
              haptics.light();
              props.onCheckedChange(checked);
            }}
          />
        </div>
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
          'flex items-center justify-between py-3.5 px-4 w-full min-h-[56px]',
          'text-left hover:bg-muted/30 active:bg-muted/50 transition-colors touch-manipulation',
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary flex-shrink-0">
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
          {props.requiresAccount && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              Requires account
            </Badge>
          )}
          {props.value && (
            <span className="text-sm text-muted-foreground">
              {props.value}
            </span>
          )}
          {!props.requiresAccount && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
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
        'flex items-center gap-3 py-3.5 px-4 w-full min-h-[56px]',
        'text-left hover:bg-muted/30 active:bg-muted/50 transition-colors touch-manipulation',
        props.destructive && 'text-destructive',
        className
      )}
    >
      {icon && (
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          props.destructive ? 'bg-destructive/10 text-destructive' : 'icon-glow text-primary'
        )}>
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

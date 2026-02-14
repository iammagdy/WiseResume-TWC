import { ReactNode, useState, useEffect, useRef, memo } from 'react';
import { ChevronRight, Loader2, Check } from 'lucide-react';
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
  loading?: boolean;
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

export const SettingsRow = memo(function SettingsRow(props: SettingsRowProps) {
  const { label, description, icon, className } = props;

  if (props.type === 'toggle') {
    return <ToggleRow {...props} />;
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
});

function ToggleRow(props: SettingsRowToggleProps) {
  const { label, description, icon, className } = props;
  const [bouncing, setBouncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevLoading = useRef(props.loading);

  // Detect loading -> not loading transition for success flash
  useEffect(() => {
    if (prevLoading.current === true && props.loading === false) {
      setShowSuccess(true);
      haptics.success();
      const timer = setTimeout(() => setShowSuccess(false), 800);
      return () => clearTimeout(timer);
    }
    prevLoading.current = props.loading;
  }, [props.loading]);

  const handleChange = (checked: boolean) => {
    haptics.light();
    setBouncing(true);
    setTimeout(() => setBouncing(false), 200);
    props.onCheckedChange(checked);
  };

  const isDisabled = props.disabled || props.loading;

  return (
    <div
      className={cn(
        'flex items-center justify-between py-3.5 px-4 min-h-[56px]',
        'transition-transform duration-200',
        isDisabled && 'opacity-50',
        className
      )}
      style={bouncing ? { animation: 'toggle-bounce 200ms ease-out' } : undefined}
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
        {(props.showStateLabel !== false) && (
          <span className="text-xs text-muted-foreground min-w-[20px] text-right">
            {props.checked
              ? (props.stateLabel?.on ?? 'On')
              : (props.stateLabel?.off ?? 'Off')}
          </span>
        )}
        {props.loading ? (
          <div className="w-12 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : showSuccess ? (
          <div className="w-12 flex items-center justify-center animate-scale-in">
            <Check className="w-5 h-5 text-[hsl(var(--success))]" />
          </div>
        ) : (
          <Switch
            checked={props.checked}
            disabled={isDisabled}
            onCheckedChange={handleChange}
          />
        )}
      </div>
    </div>
  );
}

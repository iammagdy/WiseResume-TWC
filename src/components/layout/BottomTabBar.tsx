import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Settings, Home, Briefcase } from 'lucide-react';
import wiseAiIcon from '@/assets/wise-ai-icon.png';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TabItem {
  path: string;
  icon?: React.ElementType;
  customIcon?: string;
  label: string;
  matchPaths?: string[];
  guarded?: boolean;
}

const tabs: TabItem[] = [
  { 
    path: '/dashboard', 
    icon: Home, 
    label: 'Home',
    matchPaths: ['/dashboard']
  },
  { 
    path: '/editor', 
    icon: FileText, 
    label: 'Editor',
    matchPaths: ['/editor', '/preview'],
    guarded: true,
  },
  {
    path: '/ai-studio',
    customIcon: wiseAiIcon,
    label: 'Wise AI',
    matchPaths: ['/ai-studio'],
  },
  { 
    path: '/applications', 
    icon: Briefcase, 
    label: 'Jobs',
    matchPaths: ['/applications']
  },
  { 
    path: '/settings', 
    icon: Settings, 
    label: 'Settings',
    matchPaths: ['/settings']
  },
];

interface BottomTabBarProps {
  className?: string;
}

export function BottomTabBar({ className }: BottomTabBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const { user } = useAuth();

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some(p => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  const isEditorDisabled = !currentResumeId;

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    if (tab.guarded && isEditorDisabled) {
      toast.info('Create a resume first to access the editor');
      return;
    }
    // Allow navigation to /applications even for guests (teaser screen handles gate)
    navigate(tab.path);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bottom-tab-bar',
        'glass-surface border-t border-border/30 pb-safe',
        'shadow-[0_-4px_32px_-4px_hsl(var(--background)/0.8)]',
        className
      )}
      aria-label="Main navigation"
    >
      <div
        className="flex items-center justify-around h-16 relative"
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const disabled = (tab.guarded && isEditorDisabled);
          
          return (
            <button
              key={tab.path}
              role="tab"
              aria-selected={active}
              aria-disabled={disabled || undefined}
              aria-label={tab.label}
              tabIndex={0}
              onClick={() => handleTabPress(tab)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[48px]',
                'touch-manipulation active:scale-95 transition-all duration-200 touch-ripple',
                'min-w-[52px] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                tab.guarded && isEditorDisabled && 'opacity-50'
              )}
            >
              {/* Pill indicator */}
              <div
                className={cn(
                  'absolute inset-x-3 top-1 bottom-1 rounded-2xl border transition-all duration-300',
                  active
                    ? 'border-primary/10 bg-primary/5 opacity-100 scale-100'
                    : 'border-transparent bg-transparent opacity-0 scale-95'
                )}
              />

              <div className="relative z-10">
                <div
                  className={cn(
                    'transition-transform duration-200',
                    active && 'scale-110'
                  )}
                >
                  {tab.customIcon ? (
                    <img
                      src={tab.customIcon}
                      alt={tab.label}
                      className={cn(
                        'w-8 h-8 transition-opacity duration-200 object-contain',
                        active ? 'opacity-100' : 'opacity-60'
                      )}
                    />
                  ) : (
                    <Icon
                      className={cn(
                        'w-6 h-6 sm:w-5 sm:h-5 transition-colors duration-200',
                        active ? 'text-primary' : 'text-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
              {!tab.customIcon && (
                <span
                  className={cn(
                    'text-[11px] whitespace-nowrap relative z-10 transition-colors duration-200',
                    active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                  )}
                >
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

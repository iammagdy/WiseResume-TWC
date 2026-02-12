import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Settings, Home, Briefcase } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { toast } from 'sonner';

interface TabItem {
  path: string;
  icon: React.ElementType;
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

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some(p => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    if (tab.guarded && !currentResumeId) {
      toast.info('Open or create a resume first');
      return;
    }
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
          
          return (
            <button
              key={tab.path}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              tabIndex={0}
              onClick={() => handleTabPress(tab)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'touch-manipulation active:scale-95 transition-all duration-200',
                'min-w-[52px] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
              )}
            >
              {/* Pill indicator – pure CSS */}
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
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <span
                className={cn(
                  'text-[11px] relative z-10 transition-colors duration-200',
                  active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Settings, Home } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface TabItem {
  path: string;
  icon: React.ElementType;
  label: string;
  matchPaths?: string[];
}

const tabs: TabItem[] = [
  { 
    path: '/dashboard', 
    icon: Home, 
    label: 'Home',
    matchPaths: ['/dashboard', '/upload']
  },
  { 
    path: '/editor', 
    icon: FileText, 
    label: 'Editor',
    matchPaths: ['/editor', '/preview', '/interview']
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

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some(p => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    navigate(tab.path);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'glass-surface border-t border-border/30 pb-safe',
        'shadow-[0_-4px_32px_-4px_hsl(var(--background)/0.8)]',
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              onClick={() => handleTabPress(tab)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full',
                'touch-manipulation active:scale-95 transition-all',
                'min-w-[64px]'
              )}
            >
              <div className="relative">
                <div className={cn(
                  'p-2 rounded-xl transition-all duration-200',
                  active && 'bg-primary/15 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]'
                )}>
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </div>
                {/* CSS-only indicator - no layoutId for performance */}
                <div
                  className={cn(
                    'absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]',
                    'transition-all duration-200',
                    active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
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

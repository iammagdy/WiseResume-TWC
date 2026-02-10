import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Settings, Home, Upload, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    matchPaths: ['/dashboard']
  },
  { 
    path: '/editor', 
    icon: FileText, 
    label: 'Editor',
    matchPaths: ['/editor', '/preview']
  },
  { 
    path: '/upload', 
    icon: Upload, 
    label: 'Upload',
    matchPaths: ['/upload']
  },
  { 
    path: '/interview', 
    icon: Mic, 
    label: 'Interview',
    matchPaths: ['/interview']
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
      <div className="flex items-center justify-around h-16 relative">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              onClick={() => handleTabPress(tab)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'touch-manipulation active:scale-95 transition-all',
                'min-w-[52px] relative'
              )}
            >
              {/* Floating pill indicator */}
              {active && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-x-2 top-1 bottom-1 rounded-2xl gradient-primary opacity-[0.12]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              <div className="relative z-10">
                <motion.div
                  animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </motion.div>
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={active ? 'active' : 'inactive'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'text-[10px] relative z-10',
                    active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                  )}
                >
                  {tab.label}
                </motion.span>
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

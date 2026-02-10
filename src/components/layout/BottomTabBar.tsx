import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Settings, Home, Upload, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { TouchRipple } from '@/components/ui/touch-ripple';

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
  hidden?: boolean;
}

export function BottomTabBar({ className, hidden = false }: BottomTabBarProps) {
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
    <AnimatePresence>
      {!hidden && (
        <motion.nav
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'glass-surface border-t border-border/30 pb-safe',
            'shadow-[0_-4px_32px_-4px_hsl(var(--background)/0.8)]',
            className
          )}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          aria-label="Main navigation"
        >
          <div
            className="flex items-center justify-around h-16 relative"
            role="tablist"
          >
            {tabs.map((tab, index) => {
              const active = isActive(tab);
              const Icon = tab.icon;
              
              return (
                <TouchRipple
                  key={tab.path}
                  as="button"
                  color="primary"
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                    'min-w-[52px] relative',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
                  )}
                  onClick={() => handleTabPress(tab)}
                >
                  {/* Floating pill indicator */}
                  {active && (
                    <motion.div
                      layoutId="tab-pill"
                      initial={false}
                      className="absolute inset-x-2 top-1.5 bottom-1.5 rounded-2xl border border-primary/15 bg-primary/8"
                      style={{
                        boxShadow: '0 0 20px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.1)',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  
                  <div className="relative z-10">
                    <motion.div
                      animate={active ? { 
                        scale: [1, 1.2, 1],
                        y: [0, -2, 0],
                      } : { scale: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5 transition-colors duration-200',
                          active ? 'text-primary' : 'text-muted-foreground'
                        )}
                        aria-hidden="true"
                        strokeWidth={active ? 2.5 : 2}
                      />
                    </motion.div>
                    
                    {/* Active dot indicator */}
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <motion.span
                    className={cn(
                      'text-[10px] relative z-10 transition-all duration-200',
                      active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                    )}
                    animate={active ? { y: 0, opacity: 1 } : { y: 0, opacity: 0.8 }}
                  >
                    {tab.label}
                  </motion.span>
                </TouchRipple>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

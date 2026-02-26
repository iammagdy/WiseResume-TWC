import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Globe, Home, BarChart3, Sparkles } from 'lucide-react';
import { motion, useReducedMotion, LayoutGroup } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { shouldShowDiscovery } from '@/lib/discoveryManager';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';
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
  matchPaths: [
    '/dashboard',
    '/settings',
    '/profile',
    '/notifications',
    '/templates',
    '/examples',
    '/guides',
    '/resume',
    '/onboarding',
    '/help',
    '/analytics',
    '/achievements',
    '/subscription',
    '/referral',
  ]
},
{
  path: '/editor',
  icon: FileText,
  label: 'Editor',
  matchPaths: ['/editor', '/preview'],
  guarded: true
},
{
  path: '/ai-studio',
  icon: Sparkles,
  label: 'AI Tools',
  matchPaths: [
    '/ai-studio',
    '/career',
    '/cover-letter',
    '/cover-letters',
    '/resignation-letter',
    '/resignation-letters',
    '/interview',
  ]
},
{
  path: '/applications',
  icon: BarChart3,
  label: 'Activity',
  matchPaths: ['/applications', '/application', '/job']
},
{
  path: '/portfolio',
  icon: Globe,
  label: 'Portfolio',
  matchPaths: ['/portfolio']
}];


interface BottomTabBarProps {
  className?: string;
}

export function BottomTabBar({ className }: BottomTabBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const setCurrentResumeId = useResumeStore((s) => s.setCurrentResumeId);
  const setCurrentResume = useResumeStore((s) => s.setCurrentResume);
  const { user } = useAuth();
  const { data: resumes } = useResumes({ select: (data) => data.slice(0, 1) });
  const { hasNew, markSeen } = useChangelogBadge();
  const pendingCount = useOfflineSyncStore(s => s.pendingChanges.length);
  const prefersReducedMotion = useReducedMotion();

  // First-visit discovery dots — gated by progressive disclosure
  const showDots = shouldShowDiscovery('discovery-dots');
  const [discoveryDots, setDiscoveryDots] = useState(() => ({
    aiTools: showDots && !localStorage.getItem('wr-discovered-ai-tools'),
    portfolio: showDots && !localStorage.getItem('wr-discovered-portfolio'),
  }));

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    if (tab.path === '/dashboard') {
      markSeen();
    }
    // Dismiss discovery dots
    if (tab.path === '/ai-studio' && discoveryDots.aiTools) {
      localStorage.setItem('wr-discovered-ai-tools', 'true');
      setDiscoveryDots(prev => ({ ...prev, aiTools: false }));
    }
    if (tab.path === '/portfolio' && discoveryDots.portfolio) {
      localStorage.setItem('wr-discovered-portfolio', 'true');
      setDiscoveryDots(prev => ({ ...prev, portfolio: false }));
    }
    if (tab.guarded && !currentResumeId) {
      if (resumes && resumes.length > 0) {
        const latest = resumes[0];
        setCurrentResumeId(latest.id);
        setCurrentResume(dbToResumeData(latest));
        toast.info('Loading your latest resume…');
        navigate('/editor');
      } else {
        toast.info('No resumes yet — let\'s create one!');
        navigate('/dashboard?action=create');
      }
      return;
    }
    navigate(tab.path);
  };

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 500, damping: 35 };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bottom-tab-bar glass-surface border-t pb-safe shadow-[0_-4px_32px_-4px_hsl(var(--background)/0.8)] border border-border/20 rounded-t-2xl",
        className
      )}
      aria-label="Main navigation"
    >
      <LayoutGroup>
        <div
          className="flex items-center justify-around h-16 relative max-w-3xl mx-auto w-full"
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
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[48px]',
                  'touch-manipulation active:scale-95 transition-colors duration-200 touch-ripple',
                  'min-w-[52px] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
                )}
              >
                {/* Sliding pill indicator */}
                {active && (
                  <motion.div
                    layoutId="active-tab-pill"
                    className="absolute inset-x-3 top-1 bottom-1 rounded-2xl border border-primary/10 bg-primary/5"
                    transition={springTransition}
                  />
                )}

                <div className="relative z-10">
                  <motion.div
                    animate={
                      prefersReducedMotion
                        ? {}
                        : active
                          ? { scale: [1, 1.2, 1] }
                          : { scale: 1 }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : active
                          ? { duration: 0.3, ease: 'easeOut' }
                          : { duration: 0.15 }
                    }
                  >
                    {tab.customIcon ? (
                      <img
                        src={tab.customIcon}
                        alt={tab.label}
                        className={cn(
                          'w-7 h-7 transition-all duration-200 object-contain',
                          active ? 'dark:invert' : 'opacity-50 dark:invert dark:opacity-40'
                        )}
                      />
                    ) : (
                      <div className="relative">
                        <Icon
                          className={cn(
                            'w-6 h-6 sm:w-5 sm:h-5 transition-colors duration-200',
                            active ? 'text-primary' : 'text-muted-foreground'
                          )}
                          aria-hidden="true"
                        />
                        {tab.path === '/dashboard' && hasNew && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse"
                            aria-label="New updates available"
                          />
                        )}
                        {tab.path === '/dashboard' && pendingCount > 0 && (
                          <span
                            className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-warning text-warning-foreground text-[9px] font-bold flex items-center justify-center border border-background"
                            aria-label={`${pendingCount} changes waiting to sync`}
                            title={`${pendingCount} change${pendingCount > 1 ? 's' : ''} waiting to sync`}
                          >
                            {pendingCount}
                          </span>
                        )}
                        {/* Discovery dots for first-time users */}
                        {tab.path === '/ai-studio' && discoveryDots.aiTools && !active && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse"
                            aria-label="Discover AI tools"
                          />
                        )}
                        {tab.path === '/portfolio' && discoveryDots.portfolio && !active && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse"
                            aria-label="Discover portfolio"
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
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
      </LayoutGroup>
    </nav>
  );
}
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Globe, Home, BarChart3, Sparkles, Lock, MoreHorizontal, QrCode, Bell, TrendingUp, Trophy, Users, HelpCircle, CreditCard, X } from 'lucide-react';
import { motion, useReducedMotion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { shouldShowDiscovery } from '@/lib/discoveryManager';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';
import { useCareerAssessment } from '@/hooks/useCareerAssessment';
import { usePlan } from '@/hooks/usePlan';
import { toast } from 'sonner';

const moreItems = [
  { icon: Globe, label: 'Portfolio', path: '/portfolio', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { icon: QrCode, label: 'QR Code', path: '/qr-code', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
  { icon: Bell, label: 'Notifications', path: '/notifications', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
  { icon: TrendingUp, label: 'Analytics', path: '/analytics', iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  { icon: Trophy, label: 'Achievements', path: '/achievements', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
  { icon: Users, label: 'Referral', path: '/referral', iconBg: 'bg-pink-500/10', iconColor: 'text-pink-600 dark:text-pink-400' },
  { icon: HelpCircle, label: 'Help', path: '/help', iconBg: 'bg-muted', iconColor: 'text-muted-foreground' },
  { icon: CreditCard, label: 'Subscription', path: '/subscription', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
];

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
    '/settings',
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

const AI_TOOL_PATHS = ['/career', '/cover-letters', '/interview'];
const LAST_AI_TOOL_KEY = 'wr-last-ai-tool';

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
  const { data: careerAssessment } = useCareerAssessment();
  const pendingCount = useOfflineSyncStore(s => s.pendingChanges.length);
  const { isPro } = usePlan();
  const prefersReducedMotion = useReducedMotion();
  const [showMore, setShowMore] = useState(false);

  const hasCareerReminder = !!careerAssessment?.result?.skillGaps?.length &&
    careerAssessment.completed_milestones.filter((m: string) => m.startsWith('skill:')).length < careerAssessment.result.skillGaps.length;

  const showDots = shouldShowDiscovery('discovery-dots');
  const [discoveryDots, setDiscoveryDots] = useState(() => ({
    aiTools: showDots && !localStorage.getItem('wr-discovered-ai-tools'),
    portfolio: showDots && !localStorage.getItem('wr-discovered-portfolio'),
  }));

  // Track last-visited AI tool for smart tab navigation
  useEffect(() => {
    const matched = AI_TOOL_PATHS.find(
      (p) => location.pathname === p || location.pathname.startsWith(p + '/')
    );
    if (matched) {
      localStorage.setItem(LAST_AI_TOOL_KEY, location.pathname);
    }
  }, [location.pathname]);

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
    }
    return location.pathname === tab.path;
  };

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    if (tab.path === '/dashboard') {
      markSeen();
    }
    if ((tab.path === '/ai-studio' || tab.path === '/applications') && !isPro) {
      haptics.warning();
      toast.info('Upgrade to Pro to unlock this feature', {
        action: { label: 'Upgrade', onClick: () => navigate('/subscription') }
      });
      navigate('/subscription');
      return;
    }
    if (tab.path === '/ai-studio') {
      if (discoveryDots.aiTools) {
        localStorage.setItem('wr-discovered-ai-tools', 'true');
        setDiscoveryDots(prev => ({ ...prev, aiTools: false }));
      }
      // Return to last visited AI tool instead of always going to the hub
      const lastTool = localStorage.getItem(LAST_AI_TOOL_KEY);
      if (lastTool && !isActive(tab)) {
        navigate(lastTool);
        return;
      }
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
        "fixed bottom-0 left-0 right-0 z-50 bottom-tab-bar bg-background/95 backdrop-blur-sm border-t border-border pb-safe rounded-t-2xl shadow-[0_-1px_3px_rgb(0_0_0/0.05)]",
        className
      )}
      aria-label="Main navigation"
    >
      <LayoutGroup>
        <div
          className="flex items-center justify-around h-16 relative max-w-3xl mx-auto w-full"
          role="tablist"
        >
          {tabs.slice(0, 4).map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                role="tab"
                aria-selected={active}
                aria-label={tab.label}
                tabIndex={0}
                onClick={() => { setShowMore(false); handleTabPress(tab); }}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[48px]',
                  'touch-manipulation active:scale-95 transition-colors duration-200 touch-ripple',
                  'min-w-[44px] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="active-tab-pill"
                    className="absolute inset-x-3 top-1.5 bottom-1.5 rounded-xl bg-primary/8"
                    transition={springTransition}
                  />
                )}

                <div className="relative z-10">
                  <motion.div
                    animate={
                      prefersReducedMotion
                        ? {}
                        : active
                          ? { scale: [1, 1.15, 1] }
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
                            'w-[22px] h-[22px] sm:w-5 sm:h-5 transition-colors duration-200',
                            active ? 'text-primary' : 'text-muted-foreground'
                          )}
                          aria-hidden="true"
                        />
                        {tab.path === '/dashboard' && hasNew && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background"
                            aria-label="New updates available"
                          />
                        )}
                        {tab.path === '/dashboard' && pendingCount > 0 && (
                          <span
                            className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center border border-background"
                            aria-label={`${pendingCount} changes waiting to sync`}
                            title={`${pendingCount} change${pendingCount > 1 ? 's' : ''} waiting to sync`}
                          >
                            {pendingCount}
                          </span>
                        )}
                        {tab.path === '/ai-studio' && !isPro && !active && (
                          <span
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center"
                            aria-label="Pro feature"
                          >
                            <Lock className="w-2 h-2 text-white" />
                          </span>
                        )}
                        {tab.path === '/ai-studio' && isPro && discoveryDots.aiTools && !active && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse"
                            aria-label="Discover AI tools"
                          />
                        )}
                        {tab.path === '/ai-studio' && isPro && !discoveryDots.aiTools && hasCareerReminder && !active && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 border-2 border-background"
                            aria-label="Career plan needs attention"
                          />
                        )}
                        {tab.path === '/applications' && !isPro && !active && (
                          <span
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center"
                            aria-label="Pro feature"
                          >
                            <Lock className="w-2 h-2 text-white" />
                          </span>
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
                      active ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'
                    )}
                  >
                    {tab.label}
                  </span>
                )}
              </button>
            );
          })}

          {/* More button */}
          <button
            role="tab"
            aria-selected={showMore}
            aria-label="More"
            tabIndex={0}
            onClick={() => { haptics.selection(); setShowMore(v => !v); }}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[48px]',
              'touch-manipulation active:scale-95 transition-colors duration-200',
              'min-w-[44px] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
            )}
          >
            {showMore && (
              <motion.div
                layoutId="active-tab-pill"
                className="absolute inset-x-3 top-1.5 bottom-1.5 rounded-xl bg-primary/8"
                transition={springTransition}
              />
            )}
            <div className="relative z-10">
              <MoreHorizontal
                className={cn(
                  'w-[22px] h-[22px] sm:w-5 sm:h-5 transition-colors duration-200',
                  showMore ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-hidden="true"
              />
            </div>
            <span className={cn(
              'text-[11px] whitespace-nowrap relative z-10 transition-colors duration-200',
              showMore ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'
            )}>More</span>
          </button>
        </div>
      </LayoutGroup>

      {/* More sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-xl pb-2"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">More</span>
                <button
                  onClick={() => setShowMore(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1 p-3">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { haptics.light(); setShowMore(false); navigate(item.path); }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted active:scale-95 transition-all touch-manipulation"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                        <Icon className={`w-5 h-5 ${item.iconColor}`} aria-hidden="true" />
                      </div>
                      <span className="text-[10px] font-medium text-foreground leading-tight text-center">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

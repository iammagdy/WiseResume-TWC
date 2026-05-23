import { useLocation, useNavigate } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import {
  FileText,
  Globe,
  LayoutDashboard,
  BarChart3,
  Sparkles,
  MessageCircle,
  Sun,
  Moon,
  Settings,
  LogOut,
  CreditCard,
  Lock,
  Zap,
  Tag,
  FileDown,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { toast } from 'sonner';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlanAvatar } from '@/components/ui/PlanAvatar';
import { usePlanUpgradeCelebration } from '@/hooks/usePlanUpgradeCelebration';
import { ShellBrand } from './ShellBrand';
import { ShellCommandSearch } from './ShellCommandSearch';
import { NavMembershipBadge } from './NavMembershipBadge';
import { ImportJobSheet } from '@/components/jobs/ImportJobSheet';
import { useWiseWorkspaceStore } from '@/store/wiseWorkspaceStore';

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
    icon: LayoutDashboard,
    label: 'Dashboard',
    matchPaths: ['/dashboard', '/notifications', '/templates', '/examples', '/guides', '/resume', '/onboarding'],
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
    icon: Sparkles,
    label: 'AI Tools',
    matchPaths: ['/ai-studio', '/career', '/cover-letter', '/cover-letters', '/resignation-letter', '/resignation-letters', '/interview'],
  },
  {
    path: '/applications',
    icon: BarChart3,
    label: 'Activity',
    matchPaths: ['/applications', '/application', '/job'],
  },
  {
    path: '/portfolio',
    icon: Globe,
    label: 'Portfolio',
    matchPaths: ['/portfolio'],
  },
];

export function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const setCurrentResumeId = useResumeStore((s) => s.setCurrentResumeId);
  const setCurrentResume = useResumeStore((s) => s.setCurrentResume);
  const { data: resumes } = useResumes({ select: (data) => data.slice(0, 1) });
  const { hasNew, markSeen } = useChangelogBadge();
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  const { plan, isPro, trialPlan, trialExpiresAt, refetch: refetchPlan } = usePlan();
  const toggleWiseChat = useWiseWorkspaceStore((s) => s.toggleChat);
  const wiseChatOpen = useWiseWorkspaceStore((s) => s.open && s.mode === 'chat');
  const [profileOpen, setProfileOpen] = useState(false);
  const [importJobOpen, setImportJobOpen] = useState(false);
  usePlanUpgradeCelebration();

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    if (tab.path === '/dashboard') markSeen();
    if ((tab.path === '/ai-studio' || tab.path === '/applications') && !isPro) {
      toast.info('Upgrade to Pro to unlock this feature', {
        action: { label: 'Upgrade', onClick: () => navigate('/subscription') },
      });
      navigate('/subscription');
      return;
    }
    if (tab.guarded && !currentResumeId) {
      if (resumes && resumes.length > 0) {
        const latest = resumes[0];
        setCurrentResumeId(latest.$id);
        setCurrentResume(dbToResumeData(latest));
        toast.info('Loading your latest resume…');
        navigate('/editor');
      } else {
        toast.info("No resumes yet — let's create one!");
        navigate('/dashboard?action=create');
      }
      return;
    }
    navigate(tab.path);
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : '?';

  return (
    <nav
      className="hidden lg:flex relative min-h-[72px] h-[72px] app-shell-nav shrink-0 z-40"
      aria-label="Main navigation"
    >
      <GlassSurface className="absolute inset-0 app-shell-nav-glass" blur={18} saturate={165} />
      <div className="relative z-[1] flex items-center gap-6 px-7 w-full max-w-[1680px] mx-auto">
        <ShellBrand className="mr-0.5 pr-4 border-r border-border/40" />

        <div className="flex items-center gap-1.5 shrink-0">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => handleTabPress(tab)}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active
                    ? 'bg-primary/12 text-primary border border-primary/25 shadow-[0_1px_0_0_hsl(var(--primary)/0.12)]'
                    : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-muted/50',
                )}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" aria-hidden />
                  {tab.path === '/dashboard' && hasNew && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary border border-background" />
                  )}
                  {tab.path === '/ai-studio' && !isPro && !active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center"
                      aria-hidden
                    >
                      <Lock className="w-1.5 h-1.5 text-white" />
                    </motion.span>
                  )}
                  {tab.path === '/applications' && !isPro && !active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center"
                      aria-hidden
                    >
                      <Lock className="w-1.5 h-1.5 text-white" />
                    </motion.span>
                  )}
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>

        <ShellCommandSearch className="flex-1 max-w-md min-w-[12rem] mx-3" />

        <div className="ml-auto flex items-center shrink-0 pl-2">
          <div className="flex items-center gap-2 pr-2">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setImportJobOpen(true);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px]',
                'bg-gradient-to-br from-primary to-[hsl(340,68%,52%)] text-primary-foreground shadow-soft-md',
                'hover:opacity-95 active:scale-[0.98] transition-all touch-manipulation',
              )}
              aria-label="Import a job"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Import Job
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.selection();
                toggleWiseChat();
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl min-h-[44px] text-sm font-medium border border-border/80 bg-card/60 text-foreground hover:border-primary/25 hover:bg-primary/5 transition-colors active:scale-[0.98]',
                wiseChatOpen && 'border-primary/40 bg-primary/10',
              )}
              aria-label={wiseChatOpen ? 'Close Wise AI' : 'Ask Wise AI'}
              aria-pressed={wiseChatOpen}
            >
              <MessageCircle className="w-4 h-4 text-primary shrink-0" />
              <span className="hidden xl:inline">Wise AI</span>
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 pl-2.5 border-l border-border/50"
            aria-label="Account utilities"
          >
            <NavMembershipBadge
              plan={plan}
              trialPlan={trialPlan}
              trialExpiresAt={trialExpiresAt}
              className="hidden lg:inline-flex"
            />

            <button
              type="button"
              onClick={() => {
                haptics.selection();
                toggleTheme();
              }}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Popover open={profileOpen} onOpenChange={setProfileOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Account menu"
              >
                <PlanAvatar
                  plan={plan}
                  size="w-9 h-9"
                  avatarUrl={profile?.avatarUrl}
                  initials={initials}
                  imageAlt={profile?.fullName || 'Profile'}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" className="w-52 p-1.5">
              <div className="space-y-0.5">
                {profile?.fullName && (
                  <p className="text-xs text-muted-foreground px-2 py-1 truncate">{profile.fullName}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <FileDown className="w-4 h-4 text-muted-foreground" />
                  Import Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setProfileOpen(false);
                    navigate('/subscription');
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  Subscription
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setProfileOpen(false);
                    navigate('/pricing');
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Pricing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setProfileOpen(false);
                    navigate('/whats-new');
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  What&apos;s New
                </button>
                <button
                  type="button"
                  onClick={() => {
                    refetchPlan?.();
                    toast.info('Refreshing account…');
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  Refresh account
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  onClick={async () => {
                    haptics.warning();
                    setProfileOpen(false);
                    await signOut();
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </PopoverContent>
          </Popover>
          </div>
        </div>
      </div>

      <ImportJobSheet open={importJobOpen} onOpenChange={setImportJobOpen} />
    </nav>
  );
}

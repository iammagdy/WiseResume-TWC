import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Globe, Home, BarChart3, Sparkles, MessageCircle, Settings, Sun, Moon, Search } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';
import { useTheme } from '@/hooks/use-theme';
import { toast } from 'sonner';
import { lazy, Suspense, useState, useRef, useEffect, useCallback } from 'react';

const AgenticChatSheet = lazy(() => import('@/components/editor/AgenticChatSheet').then((m) => ({ default: m.AgenticChatSheet })));

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
  matchPaths: ['/dashboard', '/notifications', '/templates', '/examples', '/guides', '/resume', '/onboarding']
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
  matchPaths: ['/ai-studio', '/career', '/cover-letter', '/cover-letters', '/resignation-letter', '/resignation-letters', '/interview']
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


export function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const setCurrentResumeId = useResumeStore((s) => s.setCurrentResumeId);
  const setCurrentResume = useResumeStore((s) => s.setCurrentResume);
  const { data: resumes } = useResumes({ select: (data) => data.slice(0, 1) });
  const { hasNew, markSeen } = useChangelogBadge();
  const { isDark, toggleTheme } = useTheme();
  const [wiseAIOpen, setWiseAIOpen] = useState(false);
  const previousPathRef = useRef('/dashboard');
  const isOnSettings = location.pathname.startsWith('/settings');

  useEffect(() => {
    if (!isOnSettings) {
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname, isOnSettings]);

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  const handleTabPress = (tab: TabItem) => {
    haptics.selection();
    if (tab.path === '/dashboard') markSeen();
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

  return (
    <nav
      className="hidden lg:flex items-center gap-1 px-6 h-14 border-b border-border bg-background/95 backdrop-blur-sm shrink-0"
      aria-label="Main navigation">
      
      <span className="text-base font-bold text-primary mr-4 select-none tracking-tight">WiseResume</span>

      <div className="flex items-center gap-0.5">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => handleTabPress(tab)}
              aria-label={tab.label}
              className={cn("relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",

              active ?
              'bg-primary/10 text-primary' :
              'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}>
              
              <div className="relative">
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.path === '/dashboard' && hasNew &&
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary border border-background" />
                }
              </div>
              {tab.label}
            </button>);

        })}
      </div>

      {isOnSettings &&
      <button
        onClick={() => {haptics.selection();}}
        aria-label="Settings"
        className={cn(
          'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          'touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'bg-primary/10 text-primary'
        )}>
        
          <Settings className="w-4 h-4" aria-hidden="true" />
          Settings
        </button>
      }

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => {
            haptics.selection();
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm transition-colors active:scale-95"
          aria-label="Search actions"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Search...</span>
          <kbd className="hidden xl:inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        <button
          onClick={() => { haptics.selection(); toggleTheme(); }}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {haptics.selection();setWiseAIOpen(true);}}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors active:scale-95"
          aria-label="Ask Wise AI">
          
          <MessageCircle className="w-4 h-4" />
          Ask
        </button>
      </div>

      {wiseAIOpen &&
      <Suspense fallback={null}>
          <AgenticChatSheet open={wiseAIOpen} onOpenChange={setWiseAIOpen} />
        </Suspense>
      }
    </nav>);

}

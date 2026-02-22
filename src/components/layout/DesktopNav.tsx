import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Globe, Home, BarChart3, Sparkles } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';
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
    matchPaths: ['/dashboard', '/settings', '/profile', '/notifications', '/templates', '/examples', '/guides', '/resume', '/onboarding'],
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
      className="hidden lg:flex items-center gap-1 px-4 h-12 border-b border-border/50 glass-header shrink-0"
      aria-label="Main navigation"
    >
      {/* Brand mark */}
      <span className="text-sm font-bold text-primary mr-3 select-none">WiseResume</span>

      <div className="flex items-center gap-0.5">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => handleTabPress(tab)}
              aria-label={tab.label}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                'touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.path === '/dashboard' && hasNew && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary border border-background" />
                )}
              </div>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

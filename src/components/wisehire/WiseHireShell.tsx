import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Sparkles,
  FileText,
  BarChart2,
  FileSearch,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Users,
  TrendingUp,
  Globe,
  ShieldCheck,
  Building2,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { TrialCountdownBadge } from '@/components/wisehire/TrialCountdownBadge';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  matchPaths?: string[];
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/wisehire/dashboard', icon: Home },
  { label: 'JD Writer', path: '/wisehire/jd-writer', icon: FileText },
  { label: 'Brief Generator', path: '/wisehire/briefs', icon: Sparkles },
  { label: 'Pipeline', path: '/wisehire/pipeline', icon: BarChart2 },
  { label: 'Bulk Screen', path: '/wisehire/bulk-screen', icon: FileSearch },
  { label: 'SC Templates', path: '/wisehire/scorecard-templates', icon: ClipboardList },
  { label: 'CV Masking', path: '/wisehire/mask-cvs', icon: ShieldCheck },
  { label: 'Talent Pool', path: '/wisehire/talent-pool', icon: Users },
  { label: 'Clients', path: '/wisehire/clients', icon: Building2 },
  { label: 'Analytics', path: '/wisehire/analytics', icon: TrendingUp },
  { label: 'Settings', path: '/wisehire/settings', icon: Settings },
  { label: 'Subscription', path: '/wisehire/subscription', icon: CreditCard },
];

interface WiseHireShellProps {
  children: React.ReactNode;
}

export function WiseHireShell({ children }: WiseHireShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: NavItem) => {
    const paths = item.matchPaths ?? [item.path];
    return paths.some((p) => location.pathname.startsWith(p));
  };

  function handleNavClick(item: NavItem) {
    if (item.comingSoon) {
      toast.info(`${item.label} is coming in the next release.`);
      setMobileOpen(false);
      return;
    }
    navigate(item.path);
    setMobileOpen(false);
  }

  async function handleSignOut() {
    await signOut();
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : '?';

  const Sidebar = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-60 shrink-0">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <Link to="/wisehire/dashboard" className="block" onClick={() => setMobileOpen(false)}>
          <span className="text-lg font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
            WiseHire
          </span>
          <p className="text-[10px] text-slate-400 leading-tight">by thewise.cloud</p>
        </Link>
        <div className="mt-3">
          <TrialCountdownBadge />
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="WiseHire navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 text-left group',
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300',
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.comingSoon && (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
              {active && <ChevronRight className="h-3 w-3 text-blue-500 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom: user + controls */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>

        {/* User row */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {user?.name ?? user?.email ?? 'HR User'}
            </p>
            {user?.name && user.email && (
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f0f5ff] dark:bg-[#00061a]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex flex-col">
            {Sidebar}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex lg:hidden items-center gap-3 px-4 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-extrabold text-blue-700 dark:text-blue-400 tracking-tight">
            WiseHire
          </span>
          <div className="ml-auto">
            <TrialCountdownBadge />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

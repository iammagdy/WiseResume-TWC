import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppSidebarStore, syncSidebarForRoute } from '@/store/appSidebarStore';
import { AppWorkspaceSidebar } from '@/components/layout/AppWorkspaceSidebar';
import { AppWorkspaceTopBar } from '@/components/layout/AppWorkspaceTopBar';
import { AppMobileSidebarSheet } from '@/components/layout/AppMobileSidebarSheet';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { withAvatarCacheBust } from '@/lib/avatarStorage';

interface AppWorkspaceLayoutProps {
  children: ReactNode;
  onImportJob: () => void;
  onHelp?: () => void;
}

export function AppWorkspaceLayout({ children, onImportJob, onHelp }: AppWorkspaceLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const { profile } = useProfile(user?.id);
  const { plan } = usePlan();
  const collapsed = useAppSidebarStore((s) => s.collapsed);
  const hideWorkspaceTopBar =
    location.pathname.startsWith('/editor') || location.pathname.startsWith('/preview');
  useEffect(() => {
    syncSidebarForRoute(location.pathname);
  }, [location.pathname]);

  const effectiveProfile = profile
    ? { ...profile, fullName: profile.fullName ?? user?.name ?? null }
    : null;
  const profileCompletionPct = effectiveProfile
    ? calculateProfileCompletion(effectiveProfile)
    : undefined;

  const sidebarProps = {
    userName: profile?.fullName ?? user?.name ?? null,
    userEmail: user?.email,
    avatarUrl: withAvatarCacheBust(profile?.avatarUrl, profile?.updatedAt),
    plan,
    profileCompletion: profileCompletionPct,
    onManageAccount: () => navigate('/profile'),
    onSettings: () => navigate('/settings'),
    onAdminPanel: isAdmin ? () => navigate('/devkit') : undefined,
    onBilling: () => navigate('/subscription'),
    onUpgrade: () => navigate('/subscription'),
    onHelp,
    onSignOut: async () => {
      await signOut();
      navigate('/');
    },
  };

  return (
    <div
      className={cn(
        'app-workspace-layout flex flex-1 flex-col min-h-0 min-w-0 w-full',
        'lg:grid lg:items-stretch lg:overflow-hidden',
        hideWorkspaceTopBar
          ? 'lg:grid-rows-[minmax(0,1fr)]'
          : 'lg:grid-rows-[auto_minmax(0,1fr)]',
        collapsed
          ? 'lg:grid-cols-[var(--app-sidebar-collapsed-width)_minmax(0,1fr)]'
          : 'lg:grid-cols-[var(--app-sidebar-width)_minmax(0,1fr)]',
      )}
    >
      <AppWorkspaceSidebar
        {...sidebarProps}
        className={hideWorkspaceTopBar ? 'lg:row-span-1' : 'lg:row-span-2'}
      />
      <AppMobileSidebarSheet {...sidebarProps} />
      {!hideWorkspaceTopBar && (
        <AppWorkspaceTopBar
          onImportJob={onImportJob}
          className="lg:col-start-2 lg:row-start-1"
        />
      )}
      <div
        className={cn(
          'app-workspace-main flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden lg:col-start-2',
          hideWorkspaceTopBar ? 'lg:row-start-1' : 'lg:row-start-2',
        )}
      >
        {children}
      </div>
    </div>
  );
}

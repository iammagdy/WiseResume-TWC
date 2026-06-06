import {
  LayoutDashboard,
  FileText,
  Wand2,
  Target,
  Globe,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface AppSidebarNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  match: readonly string[];
}

export const APP_SIDEBAR_LINKS: AppSidebarNavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    match: ['/dashboard', '/notifications', '/templates', '/examples', '/guides', '/onboarding', '/analytics', '/achievements'],
  },
  {
    path: '/editor',
    label: 'Editor',
    icon: FileText,
    match: ['/editor', '/preview', '/resume'],
  },
  {
    path: '/ai-studio',
    label: 'AI Tools',
    icon: Wand2,
    match: [
      '/ai-studio',
      '/tailor',
      '/career',
      '/cover-letter',
      '/cover-letters',
      '/resignation-letter',
      '/interview',
    ],
  },
  {
    path: '/tailoring-hub',
    label: 'Tailoring Hub',
    icon: Target,
    match: ['/tailoring-hub'],
  },
  {
    path: '/applications',
    label: 'Activity',
    icon: BarChart3,
    match: ['/applications', '/application', '/job'],
  },
  {
    path: '/portfolio',
    label: 'Portfolio',
    icon: Globe,
    match: ['/portfolio'],
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    match: ['/settings', '/profile', '/upload', '/subscription', '/referral', '/help'],
  },
];

export function isAppSidebarPathActive(pathname: string, match: readonly string[]): boolean {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

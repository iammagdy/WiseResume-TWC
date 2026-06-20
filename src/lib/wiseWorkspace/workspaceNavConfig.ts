import {
  LayoutDashboard,
  FileText,
  Sparkles,
  BarChart3,
  Globe,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface WorkspaceNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  matchPaths: string[];
  guarded?: boolean;
  proGated?: boolean;
}

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    matchPaths: ['/dashboard', '/notifications', '/templates', '/resume', '/onboarding'],
  },
  {
    path: '/editor',
    label: 'Editor',
    icon: FileText,
    matchPaths: ['/editor', '/preview'],
    guarded: true,
  },
  {
    path: '/ai-studio',
    label: 'AI Tools',
    icon: Sparkles,
    matchPaths: ['/ai-studio', '/tailoring-hub', '/tailor', '/career', '/cover-letter', '/cover-letters', '/interview'],
    proGated: true,
  },
  {
    path: '/applications',
    label: 'Applications',
    icon: BarChart3,
    matchPaths: ['/applications', '/application', '/job'],
    proGated: true,
  },
  {
    path: '/portfolio',
    label: 'Portfolio',
    icon: Globe,
    matchPaths: ['/portfolio'],
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    matchPaths: ['/settings', '/subscription', '/profile'],
  },
];

export function isWorkspaceNavActive(pathname: string, item: WorkspaceNavItem): boolean {
  return item.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

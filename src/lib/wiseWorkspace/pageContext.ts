import type { WiseActionDescriptor } from '@/components/wise-workspace/WiseAssistantActions';

export interface WisePageContext {
  pageId: string;
  pageTitle: string;
  pageSummary: string;
  contextFilter: string;
  suggestedActions: WiseActionDescriptor[];
}

const PAGE_REGISTRY: Array<{
  pageId: string;
  routes: string[];
  pageTitle: string;
  pageSummary: string;
  contextFilter: string;
  suggestedActions: WiseActionDescriptor[];
}> = [
  {
    pageId: 'dashboard',
    routes: ['/dashboard', '/templates', '/resume'],
    pageTitle: 'Dashboard',
    pageSummary: 'Manage resumes, ATS scores, and next-step recommendations.',
    contextFilter: 'resumes',
    suggestedActions: [
      { type: 'navigate', label: 'Create a resume', href: '/dashboard?action=create' },
      { type: 'navigate', label: 'Open Editor', href: '/editor' },
    ],
  },
  {
    pageId: 'editor',
    routes: ['/editor', '/preview'],
    pageTitle: 'Resume Editor',
    pageSummary: 'Edit sections, templates, ATS preview, and export.',
    contextFilter: 'resumes',
    suggestedActions: [
      { type: 'focus_editor_section', label: 'Experience section', href: '/editor?section=experience' },
      { type: 'send_prompt', label: 'Add metrics to bullets', prompt: 'Add metrics to my experience bullets' },
    ],
  },
  {
    pageId: 'applications',
    routes: ['/applications', '/application', '/job'],
    pageTitle: 'Job Tracker',
    pageSummary: 'Track applications, import jobs, and match scores.',
    contextFilter: 'applications',
    suggestedActions: [
      { type: 'navigate', label: 'Applications', href: '/applications' },
      { type: 'open_sheet', label: 'Import job posting', event: 'open-import-job' },
    ],
  },
  {
    pageId: 'portfolio',
    routes: ['/portfolio'],
    pageTitle: 'Portfolio',
    pageSummary: 'Publish and share your online portfolio.',
    contextFilter: 'portfolio',
    suggestedActions: [
      { type: 'navigate', label: 'Open Portfolio', href: '/portfolio' },
    ],
  },
  {
    pageId: 'ai_studio',
    routes: ['/ai-studio', '/tailor', '/interview', '/career'],
    pageTitle: 'AI Tools',
    pageSummary: 'Tailor, interview prep, cover letters, and more.',
    contextFilter: 'activity',
    suggestedActions: [
      { type: 'navigate', label: 'AI Studio', href: '/ai-studio' },
    ],
  },
  {
    pageId: 'settings',
    routes: ['/settings', '/subscription', '/profile'],
    pageTitle: 'Settings',
    pageSummary: 'Account, billing, and AI provider keys.',
    contextFilter: 'resumes',
    suggestedActions: [
      { type: 'navigate', label: 'Subscription', href: '/subscription' },
    ],
  },
];

export function resolvePageContext(pathname: string): WisePageContext {
  for (const entry of PAGE_REGISTRY) {
    if (entry.routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
      return {
        pageId: entry.pageId,
        pageTitle: entry.pageTitle,
        pageSummary: entry.pageSummary,
        contextFilter: entry.contextFilter,
        suggestedActions: entry.suggestedActions,
      };
    }
  }
  return {
    pageId: 'general',
    pageTitle: 'WiseResume',
    pageSummary: 'Your career workspace.',
    contextFilter: 'resumes',
    suggestedActions: [
      { type: 'navigate', label: 'Dashboard', href: '/dashboard' },
    ],
  };
}

/** Client-side hints appended to assistant replies for common “where is / how do I” questions */
export function matchLocalGuidance(
  userMessage: string,
  page: WisePageContext,
): { steps?: string[]; actions?: WiseActionDescriptor[]; linkCard?: { title: string; description: string; href: string; cta: string } } | null {
  const q = userMessage.toLowerCase();

  if (q.includes('portfolio')) {
    return {
      linkCard: {
        title: 'Your Portfolio',
        description: 'Customize themes and share a public link to your work.',
        href: '/portfolio',
        cta: 'Open Portfolio',
      },
      steps: ['Tap Portfolio in the workspace nav.', 'Enable publishing and copy your share link.'],
      actions: [{ type: 'navigate', label: 'Go to Portfolio', href: '/portfolio' }],
    };
  }

  if (page.pageId === 'editor' && (q.includes('metric') || q.includes('bullet') || q.includes('experience'))) {
    return {
      steps: [
        'Open the Experience section in the editor.',
        'Select a role and tap a bullet.',
        'Use AI Enhance or ask Wise AI to add numbers and impact.',
      ],
      actions: [
        { type: 'focus_editor_section', label: 'Open Experience', href: '/editor?section=experience' },
        { type: 'send_prompt', label: 'Improve my bullets', prompt: 'Add metrics to my top experience bullets' },
      ],
    };
  }

  if (q.includes('application') || q.includes('job tracker') || q.includes('import job')) {
    return {
      steps: ['Open Applications from the workspace.', 'Use Import Job to paste a posting URL.'],
      actions: [
        { type: 'navigate', label: 'Applications', href: '/applications' },
        { type: 'open_sheet', label: 'Import job', event: 'open-import-job' },
      ],
    };
  }

  if (q.includes('dashboard') || q.includes('resume list')) {
    return {
      actions: [{ type: 'navigate', label: 'Dashboard', href: '/dashboard' }],
    };
  }

  return null;
}

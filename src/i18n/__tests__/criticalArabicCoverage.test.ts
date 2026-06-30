import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../..');

function read(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rawCopyPatterns(snippet: string) {
  const escaped = escapeRegex(snippet);
  return [
    new RegExp(`['"\`]${escaped}['"\`]`),
    new RegExp(`>${escaped}<`),
  ];
}

describe('critical Arabic coverage surfaces', () => {
  it('does not import useLocale from the removed LocaleContext path', () => {
    const sourceFiles = [
      'src/pages/SettingsPage.tsx',
      'src/pages/ProfilePage.tsx',
      'src/pages/NotificationsPage.tsx',
      'src/pages/UploadPage.tsx',
      'src/pages/ApplicationsPage.tsx',
      'src/pages/ApplicationTrackerPage.tsx',
      'src/pages/wisehire/WiseHireDashboardPage.tsx',
      'src/components/wisehire/WiseHireShell.tsx',
      'src/components/layout/AppWorkspaceTopBar.tsx',
      'src/components/dashboard/DashboardSavedJobsDialog.tsx',
      'src/components/portfolio/editor/PortfolioEditorHeader.tsx',
      'src/components/portfolio/editor/SaveBar.tsx',
      'src/components/portfolio/editor/StatusBar.tsx',
    ];

    for (const file of sourceFiles) {
      const source = read(file);
      expect(source, `${file} should use LocaleProvider directly`).not.toContain(
        '@/contexts/LocaleContext',
      );
    }
  });

  it('wires the major untranslated app pages into the locale system', () => {
    const cases = [
      'src/pages/SettingsPage.tsx',
      'src/pages/ProfilePage.tsx',
      'src/pages/NotificationsPage.tsx',
      'src/pages/UploadPage.tsx',
      'src/pages/ApplicationsPage.tsx',
      'src/pages/ApplicationTrackerPage.tsx',
      'src/pages/wisehire/WiseHireDashboardPage.tsx',
      'src/components/layout/AppWorkspaceTopBar.tsx',
      'src/components/dashboard/DashboardSavedJobsDialog.tsx',
      'src/components/portfolio/editor/PortfolioEditorHeader.tsx',
      'src/components/portfolio/editor/SaveBar.tsx',
      'src/components/portfolio/editor/StatusBar.tsx',
    ];

    for (const file of cases) {
      const source = read(file);
      expect(source, `${file} should import useLocale`).toMatch(/useLocale/);
      expect(source, `${file} should translate user-facing copy`).toMatch(/\bt\('/);
    }
  });

  it('does not keep known English-only copy in the highest-impact pages', () => {
    const forbiddenByFile: Record<string, string[]> = {
      'src/pages/SettingsPage.tsx': [
        'Tap to copy your User ID',
        'Sign out?',
        'Welcome, Guest',
        'Get Started Free',
      ],
      'src/pages/ProfilePage.tsx': [
        'Profile Completion',
        'Portfolio is inactive',
        'Go Live & Share',
      ],
      'src/pages/NotificationsPage.tsx': [
        'Notifications',
        'No notifications yet',
        'Clear all notifications?',
      ],
      'src/pages/UploadPage.tsx': [
        'Upload Resume',
        'Import from a URL',
        'Tips for best results',
      ],
      'src/pages/ApplicationsPage.tsx': [
        'Application Tracker',
        'My Applications',
        'Recent Activity',
        'Quick Add',
        'Add your first application',
        'Full Form',
      ],
      'src/components/layout/AppWorkspaceTopBar.tsx': [
        'Wise AI',
        'Import Job',
      ],
      'src/components/dashboard/DashboardSavedJobsDialog.tsx': [
        'Saved jobs',
        'Import job posting',
        'Import another job',
      ],
      'src/components/portfolio/editor/PortfolioEditorHeader.tsx': [
        'Public profile',
        'Portfolio studio',
        'View live',
      ],
      'src/components/portfolio/editor/SaveBar.tsx': [
        'Publish changes',
        'Save & Publish',
        'Save draft',
      ],
      'src/components/portfolio/editor/StatusBar.tsx': [
        'Unpublished changes',
        'Portfolio strength',
        'Set a username to get your public URL',
      ],
      'src/components/layout/ConsentBanner.tsx': [
        'We use analytics cookies',
        'Privacy policy',
        'Accept',
        'Decline',
      ],
      'src/components/landing/FeatureTicker.tsx': [
        'AI Resume Writing',
        'ATS Score Analysis',
        'Smart Tailoring',
        'Interview Coaching',
        'Cover Letters',
        'Application Tracker',
      ],
      'src/components/landing/wiseResumeFeatureData.ts': [
        'Senior Developer',
        'AI-Powered Resume Writing',
        'Precision Resume Tailoring',
        'Public Portfolio Website',
        'AI Interview Practice',
        'Kanban Job Tracker',
      ],
      'src/components/tailoring-hub/TailoringHubLanding.tsx': [
        'Your job tailoring command center',
        'Start new tailoring',
        'Import job posting',
        'Saved jobs',
        'Tailoring sessions',
        'Recent tailoring',
      ],
      'src/pages/wisehire/WiseHireDashboardPage.tsx': [
        'Dashboard',
        "Welcome back ? here's your hiring overview.",
        'Complete your company setup',
      ],
    };

    for (const [file, forbidden] of Object.entries(forbiddenByFile)) {
      const source = read(file);
      for (const snippet of forbidden) {
        for (const pattern of rawCopyPatterns(snippet)) {
          expect(source, `${file} should not keep raw English snippet: ${snippet}`).not.toMatch(pattern);
        }
      }
    }
  });
});

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();

const files = [
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

const forbiddenPatterns = [
  'Tap to copy your User ID',
  'Sign out?',
  'Welcome, Guest',
  'Get Started Free',
  'Profile Completion',
  'Portfolio is inactive',
  'Go Live & Share',
  'Notifications',
  'No notifications yet',
  'Clear all notifications?',
  'Upload Resume',
  'Import from a URL',
  'Tips for best results',
  'Application Tracker',
  'My Applications',
  'Recent Activity',
  'Quick Add',
  'Add your first application',
  'Full Form',
  'Wise AI',
  'Import Job',
  'Saved jobs',
  'Import another job',
  'Public profile',
  'Portfolio studio',
  'View live',
  'Publish changes',
  'Save & Publish',
  'Save draft',
  'Unpublished changes',
  'Portfolio strength',
  'Set a username to get your public URL',
  'We use analytics cookies',
  'Privacy policy',
  'Accept',
  'Decline',
  'AI Resume Writing',
  'ATS Score Analysis',
  'Smart Tailoring',
  'Interview Coaching',
  'Cover Letters',
  'Senior Developer',
  'Your job tailoring command center',
  'Start new tailoring',
  'Import job posting',
  'Saved jobs',
  'Tailoring sessions',
  'Recent tailoring',
  "Welcome back ? here's your hiring overview.",
  'Complete your company setup',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rawCopyPatterns(snippet) {
  const escaped = escapeRegex(snippet);
  return [
    new RegExp(`['"\`]${escaped}['"\`]`),
    new RegExp(`>${escaped}<`),
  ];
}

const failures = [];

for (const file of files) {
  const source = await readFile(resolve(root, file), 'utf8');
  if (!source.includes('useLocale')) {
    failures.push(`${file} is missing useLocale`);
  }
  if (!source.match(/\bt\('/)) {
    failures.push(`${file} is missing translated copy via t(...)`);
  }
  if (source.includes('@/contexts/LocaleContext')) {
    failures.push(`${file} still imports from removed LocaleContext path`);
  }
  for (const pattern of forbiddenPatterns) {
    for (const rawPattern of rawCopyPatterns(pattern)) {
      if (rawPattern.test(source)) {
        failures.push(`${file} still contains raw English snippet: ${JSON.stringify(pattern)}`);
        break;
      }
    }
  }
}

if (failures.length) {
  console.error(`[arabic-coverage] ${failures.length} failure(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[arabic-coverage] OK: ${files.length} critical surfaces are localized.`);

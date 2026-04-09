import { type SectionId, type TestStatus, type TestResult, type TestDef } from './types';

export const DEV_KIT_VERSION = 'v2.0.0';

export const SECTIONS: { id: SectionId; title: string; emoji: string }[] = [
  { id: 'auth', title: 'Auth & Token Bridge', emoji: '🔑' },
  { id: 'routing', title: 'Routing & Protected Pages', emoji: '🛤️' },
  { id: 'settings', title: 'Settings & Preferences', emoji: '⚙️' },
  { id: 'credits', title: 'Credits & Usage', emoji: '💳' },
  { id: 'ai', title: 'AI Tools Smoke Test', emoji: '🤖' },
  { id: 'email', title: 'Email & Communications', emoji: '📧' }, // NEW
  { id: 'db', title: 'Resume & Data Checks', emoji: '🗄️' },
  { id: 'errors', title: 'Error Handling & Logging', emoji: '🔥' },
  { id: 'usage', title: 'Usage Events', emoji: '📊' },
];

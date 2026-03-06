/**
 * Full account backup & restore for auth migration.
 * Exports all user data to a single JSON file and imports it under a new userId.
 */

import { supabase } from '@/integrations/supabase/client';
import { downloadFile } from '@/lib/downloadUtils';
import { useSettingsStore } from '@/store/settingsStore';

export interface AccountBackup {
  backupVersion: '2.0';
  type: 'full-account';
  exportDate: string;
  source: {
    email?: string | null;
    fullName?: string | null;
    authProvider?: string;
  };
  profile: Record<string, unknown> | null;
  resumes: Record<string, unknown>[];
  coverLetters: Record<string, unknown>[];
  jobApplications: Record<string, unknown>[];
  jobs: Record<string, unknown>[];
  interviewSessions: Record<string, unknown>[];
  careerAssessments: Record<string, unknown>[];
  resignationLetters: Record<string, unknown>[];
  tailorHistory: Record<string, unknown>[];
  preferences: Record<string, unknown> | null;
  shortLinks: Record<string, unknown>[];
  apiKeysMeta: { provider: string; keyTier: string }[];
  settings: Record<string, unknown>;
}

export type ImportProgress = {
  table: string;
  status: 'pending' | 'importing' | 'done' | 'error';
  error?: string;
};

const TABLES_ORDER = [
  'profile',
  'resumes',
  'coverLetters',
  'jobApplications',
  'jobs',
  'interviewSessions',
  'careerAssessments',
  'resignationLetters',
  'tailorHistory',
  'preferences',
  'shortLinks',
] as const;

async function fetchAll(table: string, userId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from(table as any)
    .select('*')
    .eq('user_id', userId) as any;
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function exportFullAccount(
  userId: string,
  email?: string | null,
  fullName?: string | null,
  onProgress?: (pct: number) => void
): Promise<void> {
  const total = 12;
  let done = 0;
  const tick = () => { done++; onProgress?.(Math.round((done / total) * 100)); };

  // Profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  tick();

  // All user tables
  const resumes = await fetchAll('resumes', userId); tick();
  const coverLetters = await fetchAll('cover_letters', userId); tick();
  const jobApplications = await fetchAll('job_applications', userId); tick();
  const jobs = await fetchAll('jobs', userId); tick();
  const interviewSessions = await fetchAll('interview_sessions', userId); tick();
  const careerAssessments = await fetchAll('career_assessments', userId); tick();
  const resignationLetters = await fetchAll('resignation_letters', userId); tick();
  const tailorHistory = await fetchAll('tailor_history', userId); tick();
  const shortLinks = await fetchAll('short_links', userId); tick();

  // Preferences
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  tick();

  // API keys metadata only (no encrypted keys)
  const { data: apiKeys } = await supabase
    .from('user_api_keys_safe' as any)
    .select('provider, key_tier')
    .eq('user_id', userId) as any;
  tick();

  const backup: AccountBackup = {
    backupVersion: '2.0',
    type: 'full-account',
    exportDate: new Date().toISOString(),
    source: { email, fullName, authProvider: 'supabase' },
    profile: profileData,
    resumes,
    coverLetters,
    jobApplications,
    jobs,
    interviewSessions,
    careerAssessments,
    resignationLetters,
    tailorHistory,
    preferences: prefs,
    shortLinks,
    apiKeysMeta: (apiKeys || []).map((k: any) => ({ provider: k.provider, keyTier: k.key_tier })),
    settings: useSettingsStore.getState() as unknown as Record<string, unknown>,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  await downloadFile({ blob, fileName: `wiseresume-account-${date}.json` });
}

function validateBackup(data: unknown): data is AccountBackup {
  if (!data || typeof data !== 'object') return false;
  const d = data as any;
  return d.backupVersion === '2.0' && d.type === 'full-account' && Array.isArray(d.resumes);
}

export async function importFullAccount(
  file: File,
  userId: string,
  onProgress?: (steps: ImportProgress[]) => void
): Promise<{ success: number; failed: number }> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!validateBackup(data)) {
    throw new Error('Invalid backup file. Please use a WiseResume full account backup (v2.0).');
  }

  const steps: ImportProgress[] = TABLES_ORDER.map(t => ({ table: t, status: 'pending' as const }));
  const report = () => onProgress?.([...steps]);
  let success = 0;
  let failed = 0;

  const setStep = (idx: number, status: ImportProgress['status'], error?: string) => {
    steps[idx] = { ...steps[idx], status, error };
    report();
  };

  // Helper to upsert rows with new user_id
  async function upsertRows(
    stepIdx: number,
    table: string,
    rows: Record<string, unknown>[],
    opts?: { ownerCol?: string }
  ) {
    const col = opts?.ownerCol || 'user_id';
    if (!rows.length) { setStep(stepIdx, 'done'); success++; return; }
    setStep(stepIdx, 'importing');
    try {
      const mapped = rows.map(r => {
        const { id, ...rest } = r as any;
        return { ...rest, [col]: userId };
      });
      const { error } = await supabase.from(table as any).insert(mapped as any);
      if (error) throw error;
      setStep(stepIdx, 'done');
      success++;
    } catch (e: any) {
      setStep(stepIdx, 'error', e.message);
      failed++;
    }
  }

  report();

  // 0: Profile — merge into existing
  setStep(0, 'importing');
  try {
    if (data.profile) {
      const { id, user_id, created_at, ...profileFields } = data.profile as any;
      await supabase.from('profiles').update(profileFields).eq('user_id', userId);
    }
    setStep(0, 'done'); success++;
  } catch (e: any) { setStep(0, 'error', e.message); failed++; }

  // 1-8: Data tables
  await upsertRows(1, 'resumes', data.resumes);
  await upsertRows(2, 'cover_letters', data.coverLetters);
  await upsertRows(3, 'job_applications', data.jobApplications);
  await upsertRows(4, 'jobs', data.jobs);
  await upsertRows(5, 'interview_sessions', data.interviewSessions);
  await upsertRows(6, 'career_assessments', data.careerAssessments);
  await upsertRows(7, 'resignation_letters', data.resignationLetters);
  await upsertRows(8, 'tailor_history', data.tailorHistory);

  // 9: Preferences
  setStep(9, 'importing');
  try {
    if (data.preferences) {
      const { id, user_id, ...prefFields } = data.preferences as any;
      await supabase.from('user_preferences').upsert({ ...prefFields, user_id: userId }, { onConflict: 'user_id' } as any);
    }
    setStep(9, 'done'); success++;
  } catch (e: any) { setStep(9, 'error', e.message); failed++; }

  // 10: Short links
  await upsertRows(10, 'short_links', data.shortLinks, { ownerCol: 'owner_user_id' });

  return { success, failed };
}

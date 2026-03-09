import { DatabaseResume, dbToResumeData } from '@/hooks/useResumes';
import { supabase } from '@/integrations/supabase/safeClient';
import { useSettingsStore } from '@/store/settingsStore';
import { TailorHistory } from '@/types/resume';
import { downloadFile } from '@/lib/downloadUtils';

interface ExportData {
  exportVersion: string;
  exportDate: string;
  profile: {
    fullName: string | null;
    email: string | null;
  };
  resumes: Array<{
    id: string;
    title: string;
    contactInfo: unknown;
    summary: string;
    experience: unknown[];
    education: unknown[];
    skills: string[];
    certifications: unknown[];
    templateId: string;
    createdAt: string;
    updatedAt: string;
    targetJobTitle: string | null;
    targetCompany: string | null;
    jobMatchScore: number | null;
  }>;
  settings: {
    defaultTemplate: string;
    pdfDefaults: {
      showPageNumbers: boolean;
      pageNumberFormat: string;
      showBranding: boolean;
    };
  };
}

async function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  await downloadFile({ blob, fileName: filename });
}

export async function exportAllResumes(
  resumes: DatabaseResume[],
  userEmail: string | null,
  userName: string | null
): Promise<void> {
  const settings = useSettingsStore.getState();
  
  const exportData: ExportData = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    profile: {
      fullName: userName,
      email: userEmail,
    },
    resumes: resumes.map((r) => {
      const resumeData = dbToResumeData(r);
      return {
        id: r.id,
        title: r.title,
        contactInfo: resumeData.contactInfo,
        summary: resumeData.summary,
        experience: resumeData.experience,
        education: resumeData.education,
        skills: resumeData.skills,
        certifications: resumeData.certifications,
        templateId: resumeData.templateId,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        targetJobTitle: r.target_job_title,
        targetCompany: r.target_company,
        jobMatchScore: r.job_match_score,
      };
    }),
    settings: {
      defaultTemplate: settings.defaultTemplate,
      pdfDefaults: {
        showPageNumbers: settings.pdfDefaults.showPageNumbers ?? true,
        pageNumberFormat: settings.pdfDefaults.pageNumberFormat ?? 'full',
        showBranding: settings.pdfDefaults.showBranding ?? true,
      },
    },
  };

  const date = new Date().toISOString().split('T')[0];
  await downloadJson(exportData, `wiseresume-backup-${date}.json`);
}

export async function exportSingleResume(resume: DatabaseResume): Promise<void> {
  const resumeData = dbToResumeData(resume);
  
  const exportData = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    resume: {
      id: resume.id,
      title: resume.title,
      contactInfo: resumeData.contactInfo,
      summary: resumeData.summary,
      experience: resumeData.experience,
      education: resumeData.education,
      skills: resumeData.skills,
      certifications: resumeData.certifications,
      templateId: resumeData.templateId,
      createdAt: resume.created_at,
      updatedAt: resume.updated_at,
      targetJobTitle: resume.target_job_title,
      targetCompany: resume.target_company,
      jobMatchScore: resume.job_match_score,
    },
  };

  const safeName = resumeData.contactInfo.fullName?.replace(/[^a-z0-9]/gi, '-') || 'resume';
  await downloadJson(exportData, `${safeName}-${resume.id.slice(0, 8)}.json`);
}

export async function exportTailorHistory(history: TailorHistory[]): Promise<void> {
  const exportData = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    tailorHistory: history.map((entry) => ({
      jobTitle: entry.jobTitle,
      company: entry.company,
      scoreBefore: entry.scoreBeforeAfter.before,
      scoreAfter: entry.scoreBeforeAfter.after,
      appliedSections: entry.appliedSections,
      date: entry.createdAt,
      tailoredResume: {
        summary: entry.tailorResult.summary,
        skills: entry.tailorResult.skills,
        experience: entry.tailorResult.experience,
        education: entry.tailorResult.education,
      },
    })),
  };

  const date = new Date().toISOString().split('T')[0];
  await downloadJson(exportData, `tailor-history-${date}.json`);
}

/**
 * Validates and imports resumes from a backup JSON file.
 * Returns the number of resumes imported.
 */
export async function importResumes(file: File, userId: string): Promise<number> {
  const text = await file.text();
  let data: Record<string, unknown>;
  
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON file. Please select a valid WiseResume backup.');
  }

  // Validate export schema
  if (!data.exportVersion || typeof data.exportVersion !== 'string') {
    throw new Error('Not a valid WiseResume backup file (missing exportVersion).');
  }

  const resumes = data.resumes || (data.resume ? [data.resume] : []);
  
  if (!Array.isArray(resumes) || resumes.length === 0) {
    throw new Error('No resumes found in the backup file.');
  }

  // Validate each resume has required fields
  for (const resume of resumes) {
    if (!resume.contactInfo || !resume.title) {
      throw new Error('Backup contains invalid resume data (missing contactInfo or title).');
    }
  }

  // Upsert resumes into the database
  let imported = 0;
  for (const resume of resumes) {
    const { error } = await supabase.from('resumes').upsert({
      id: resume.id || undefined,
      user_id: userId,
      title: resume.title,
      contact_info: resume.contactInfo,
      summary: resume.summary || '',
      experience: resume.experience || [],
      education: resume.education || [],
      skills: resume.skills || [],
      certifications: resume.certifications || [],
      template_id: resume.templateId || 'modern',
      target_job_title: resume.targetJobTitle || null,
      target_company: resume.targetCompany || null,
      job_match_score: resume.jobMatchScore || null,
    }, { onConflict: 'id' });

    if (!error) imported++;
  }

  return imported;
}

export async function deleteAllUserData(userId: string): Promise<void> {
  // Delete share_comments via share_ids (no user_id column on share_comments)
  const { data: shares } = await supabase
    .from('resume_shares')
    .select('id')
    .eq('user_id', userId);

  if (shares && shares.length > 0) {
    const shareIds = shares.map(s => s.id);
    const { error: commentsErr } = await supabase
      .from('share_comments')
      .delete()
      .in('share_id', shareIds);
    if (commentsErr) console.error('Failed to delete share_comments:', commentsErr);
  }

  // Delete dependent tables that have user_id
  const dependentTables = [
    'resume_shares',
    'resume_versions',
  ] as const;

  for (const table of dependentTables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) console.error(`Failed to delete from ${table}:`, error);
  }

  // Delete user-level tables
  const userTables = [
    'tailor_history',
    'cover_letters',
    'interview_sessions',
    'career_assessments',
    'job_applications',
    'jobs',
    'ai_usage_logs',
    'ai_credits',
    'notifications',
    'push_subscriptions',
    'user_api_keys',
    'bug_reports',
    'resignation_letters',
    'user_preferences',
    'audit_logs',
    'contact_inquiries',
    'feature_requests',
  ] as const;

  for (const table of userTables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) console.error(`Failed to delete from ${table}:`, error);
  }

  // Delete short_links (uses owner_user_id instead of user_id)
  const { error: shortLinksError } = await supabase
    .from('short_links')
    .delete()
    .eq('owner_user_id', userId);
  if (shortLinksError) console.error('Failed to delete from short_links:', shortLinksError);

  // Delete resumes
  const { error: resumesError } = await supabase
    .from('resumes')
    .delete()
    .eq('user_id', userId);
  if (resumesError) console.error('Failed to delete resumes:', resumesError);

  // Delete profile last
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId);
  if (profileError) console.error('Failed to delete profile:', profileError);

  // Clear all local storage
  localStorage.clear();
}

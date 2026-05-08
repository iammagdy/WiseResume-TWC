import { DatabaseResume, dbToResumeData } from '@/hooks/useResumes';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
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
  userName: string | null,
): Promise<void> {
  const settings = useSettingsStore.getState();

  const exportData: ExportData = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    profile: {
      fullName: userName,
      email: userEmail,
    },
    resumes: resumes.map(r => {
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
    tailorHistory: history.map(entry => ({
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
 *
 * Appwrite upsert pattern: try getDocument (existing → update), catch 404 → create.
 */
export async function importResumes(file: File, userId: string): Promise<number> {
  const text = await file.text();
  let data: Record<string, unknown>;

  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON file. Please select a valid WiseResume backup.');
  }

  if (!data.exportVersion || typeof data.exportVersion !== 'string') {
    throw new Error('Not a valid WiseResume backup file (missing exportVersion).');
  }

  const resumes = data.resumes ?? (data.resume ? [data.resume] : []);

  if (!Array.isArray(resumes) || resumes.length === 0) {
    throw new Error('No resumes found in the backup file.');
  }

  for (const resume of resumes) {
    if (!resume.contactInfo || !resume.title) {
      throw new Error('Backup contains invalid resume data (missing contactInfo or title).');
    }
  }

  let imported = 0;
  for (const resume of resumes as Record<string, unknown>[]) {
    const payload = {
      user_id: userId,
      title: typeof resume.title === 'string' ? resume.title : 'Untitled Resume',
      contact_info: JSON.stringify(resume.contactInfo),
      summary: typeof resume.summary === 'string' ? resume.summary : '',
      experience: JSON.stringify(Array.isArray(resume.experience) ? resume.experience : []),
      education: JSON.stringify(Array.isArray(resume.education) ? resume.education : []),
      skills: JSON.stringify(Array.isArray(resume.skills) ? resume.skills : []),
      certifications: JSON.stringify(Array.isArray(resume.certifications) ? resume.certifications : []),
      template_id: typeof resume.templateId === 'string' ? resume.templateId : 'modern',
      target_job_title: typeof resume.targetJobTitle === 'string' ? resume.targetJobTitle : null,
      target_company: typeof resume.targetCompany === 'string' ? resume.targetCompany : null,
      job_match_score: typeof resume.jobMatchScore === 'number' ? resume.jobMatchScore : null,
    };

    const existingId = typeof resume.id === 'string' ? resume.id : null;
    try {
      if (existingId) {
        try {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, existingId, payload);
        } catch {
          // 404 — resume doesn't exist yet, create with the original id
          await databases.createDocument(DATABASE_ID, COLLECTIONS.resumes, existingId, payload);
        }
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.resumes, ID.unique(), payload);
      }
      imported++;
    } catch (err) {
      console.error('Failed to import resume:', err);
    }
  }

  return imported;
}

/** Helper: list all document IDs in a collection matching a filter, paginating if needed */
async function listAllIds(
  collectionId: string,
  filter: Parameters<typeof Query.equal>,
  ownerField = 'user_id',
  ownerId = '',
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  while (true) {
    const queries = [
      Query.equal(ownerField, ownerId),
      Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    const res = await databases.listDocuments(DATABASE_ID, collectionId, queries);
    for (const doc of res.documents) ids.push(doc.$id);
    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return ids;
  void filter; // type-only usage
}

/** Delete all documents with a given ID list from a collection */
async function deleteByIds(collectionId: string, ids: string[]): Promise<void> {
  await Promise.allSettled(ids.map(id => databases.deleteDocument(DATABASE_ID, collectionId, id)));
}

export async function deleteAllUserData(userId: string): Promise<void> {
  // Delete share_comments via share_ids (no user_id column on share_comments)
  const shareIds = await listAllIds(COLLECTIONS.resume_shares, [], 'user_id', userId);
  if (shareIds.length > 0) {
    for (const shareId of shareIds) {
      const commentIds = await listAllIds(COLLECTIONS.share_comments, [], 'share_id', shareId);
      await deleteByIds(COLLECTIONS.share_comments, commentIds);
    }
    await deleteByIds(COLLECTIONS.resume_shares, shareIds);
  }

  // Tables with user_id field
  const userTables: string[] = [
    COLLECTIONS.tailor_history,
    COLLECTIONS.cover_letters,
    COLLECTIONS.interview_sessions,
    COLLECTIONS.career_assessments,
    COLLECTIONS.job_applications,
    COLLECTIONS.jobs,
    COLLECTIONS.ai_usage_logs,
    COLLECTIONS.ai_credits,
    COLLECTIONS.notifications,
    COLLECTIONS.bug_reports,
    COLLECTIONS.resignation_letters,
    COLLECTIONS.audit_logs,
    COLLECTIONS.contact_inquiries,
    COLLECTIONS.feature_requests,
  ];

  for (const collectionId of userTables) {
    try {
      const ids = await listAllIds(collectionId, [], 'user_id', userId);
      await deleteByIds(collectionId, ids);
    } catch (e) {
      console.error(`Failed to delete from collection ${collectionId}:`, e);
    }
  }

  // short_links uses owner_user_id
  try {
    const shortLinkIds = await listAllIds(COLLECTIONS.short_links, [], 'owner_user_id', userId);
    await deleteByIds(COLLECTIONS.short_links, shortLinkIds);
  } catch (e) {
    console.error('Failed to delete short_links:', e);
  }

  // Resumes
  try {
    const resumeIds = await listAllIds(COLLECTIONS.resumes, [], 'user_id', userId);
    await deleteByIds(COLLECTIONS.resumes, resumeIds);
  } catch (e) {
    console.error('Failed to delete resumes:', e);
  }

  // Profile last
  try {
    const profileIds = await listAllIds(COLLECTIONS.profiles, [], 'user_id', userId);
    await deleteByIds(COLLECTIONS.profiles, profileIds);
  } catch (e) {
    console.error('Failed to delete profile:', e);
  }

  localStorage.clear();
}

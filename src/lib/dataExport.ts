import { DatabaseResume, dbToResumeData } from '@/hooks/useResumes';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsStore } from '@/store/settingsStore';

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

function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  downloadJson(exportData, `wiseresume-backup-${date}.json`);
}

export function exportSingleResume(resume: DatabaseResume): void {
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
  downloadJson(exportData, `${safeName}-${resume.id.slice(0, 8)}.json`);
}

export async function deleteAllUserData(userId: string): Promise<void> {
  // Delete all resumes
  const { error: resumesError } = await supabase
    .from('resumes')
    .delete()
    .eq('user_id', userId);

  if (resumesError) throw resumesError;

  // Delete profile
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId);

  if (profileError) throw profileError;

  // Clear local storage
  localStorage.removeItem('wiseresume-settings');
  localStorage.removeItem('resume-store');
}

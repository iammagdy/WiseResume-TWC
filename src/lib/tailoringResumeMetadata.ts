import type {
  TailorHistory,
  TailoringResumeMetadata,
  TemplateCustomization,
} from '@/types/resume';

type PersistedResume = {
  $id: string;
  $createdAt?: string;
  customization?: string | TemplateCustomization;
};

export function buildTailoringCustomization(
  existing: Partial<TemplateCustomization> | undefined,
  tailoring: TailoringResumeMetadata,
): TemplateCustomization {
  return { ...(existing ?? {}), tailoring } as TemplateCustomization;
}

export function tailoringMetadataFromResume(
  resume: Pick<PersistedResume, 'customization'> | null | undefined,
): TailoringResumeMetadata | null {
  if (!resume?.customization) return null;
  try {
    const customization = typeof resume.customization === 'string'
      ? JSON.parse(resume.customization) as TemplateCustomization
      : resume.customization;
    const metadata = customization?.tailoring;
    if (!metadata?.jobTitle || !metadata.scoreBeforeAfter) return null;
    return metadata;
  } catch {
    return null;
  }
}

export function historyFromTailoredResume(resume: PersistedResume): TailorHistory | null {
  const metadata = tailoringMetadataFromResume(resume);
  if (!metadata) return null;
  return {
    id: `resume:${resume.$id}`,
    jobTitle: metadata.jobTitle,
    company: metadata.company || '',
    jobDescription: '',
    jobUrl: metadata.jobUrl ?? null,
    tailoredResumeId: resume.$id,
    tailorResult: metadata.tailorResult as TailorHistory['tailorResult'],
    scoreBeforeAfter: metadata.scoreBeforeAfter,
    appliedSections: metadata.appliedSections,
    createdAt: metadata.createdAt || resume.$createdAt || new Date(0).toISOString(),
  };
}

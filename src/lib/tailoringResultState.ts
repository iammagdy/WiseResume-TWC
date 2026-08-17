import type { ChangeSummary } from '@/lib/tailorMerge';
import type { TailoringResumeMetadata } from '@/types/resume';

export interface TailoringResultState {
  jobTitle?: string;
  company?: string;
  jobUrl?: string | null;
  scoreBeforeAfter?: { before: number; after: number };
  appliedSections?: string[];
  intensity?: string;
  coverLetterId?: string;
  changeSummary?: ChangeSummary;
}

export function resolveTailoringResultState(params: {
  locationState?: TailoringResultState | null;
  tailorHistory: Array<{
    tailoredResumeId?: string | null;
    jobTitle: string;
    company: string;
    jobUrl?: string | null;
    scoreBeforeAfter?: { before: number; after: number };
    appliedSections?: string[];
  }>;
  resumeId?: string;
  resumeMetadata?: TailoringResumeMetadata | null;
}): TailoringResultState {
  const { locationState, tailorHistory, resumeId, resumeMetadata } = params;
  if (
    locationState &&
    (
      !!locationState.jobTitle ||
      !!locationState.company ||
      !!locationState.jobUrl ||
      !!locationState.scoreBeforeAfter ||
      (locationState.appliedSections?.length ?? 0) > 0
    )
  ) {
    return locationState;
  }

  const entry = tailorHistory.find((item) => item.tailoredResumeId === resumeId);
  if (entry) {
    return {
      jobTitle: entry.jobTitle,
      company: entry.company,
      jobUrl: entry.jobUrl,
      scoreBeforeAfter: entry.scoreBeforeAfter,
      appliedSections: entry.appliedSections,
    };
  }

  if (resumeMetadata) {
    return {
      jobTitle: resumeMetadata.jobTitle,
      company: resumeMetadata.company,
      jobUrl: resumeMetadata.jobUrl,
      scoreBeforeAfter: resumeMetadata.scoreBeforeAfter,
      appliedSections: resumeMetadata.appliedSections,
      intensity: resumeMetadata.intensity,
    };
  }

  return {};
}

import { TemplateId, SectionId } from '@/types/resume';

export type TemplateLayout = 'linear' | 'linear-grid' | 'fixed-sidebar';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  layout: TemplateLayout;
  supportsPageBreaks: boolean;
  supportsManualBreaks: boolean;
  maxRecommendedPages: number;
  singlePageOptimized: boolean;
  breakableSections: SectionId[];
  supportsPhoto: boolean;
  warningMessage?: string;
  suggestedAlternatives?: TemplateId[];
}

/**
 * Template configurations defining pagination capabilities for each template.
 * 
 * Layout Types:
 * - linear: Single column, content flows top to bottom. Full page break support.
 * - linear-grid: Linear flow with a bottom grid section. Partial page break support.
 * - fixed-sidebar: Sidebar runs full height alongside main content. No page breaks.
 */
export const TEMPLATE_CONFIGS: Record<TemplateId, TemplateConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 3,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 3,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 3,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  developer: {
    id: 'developer',
    name: 'Developer',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    layout: 'linear-grid',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience'],
    supportsPhoto: false,
    warningMessage: "The bottom grid (Education/Skills) cannot be split across pages.",
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    layout: 'fixed-sidebar',
    supportsPageBreaks: false,
    supportsManualBreaks: false,
    maxRecommendedPages: 1,
    singlePageOptimized: true,
    breakableSections: [],
    supportsPhoto: false,
    warningMessage: "This template uses a sidebar layout optimized for single-page resumes. For longer resumes, try Modern or Classic.",
    suggestedAlternatives: ['modern', 'classic'],
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    layout: 'fixed-sidebar',
    supportsPageBreaks: false,
    supportsManualBreaks: false,
    maxRecommendedPages: 1,
    singlePageOptimized: true,
    breakableSections: [],
    supportsPhoto: true,
    warningMessage: "This creative layout is designed for impactful single-page resumes. Switch to Developer or Modern for multi-page support.",
    suggestedAlternatives: ['developer', 'modern'],
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: true,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  academic: {
    id: 'academic',
    name: 'Academic',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 4,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  sales: {
    id: 'sales',
    name: 'Sales',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    layout: 'linear',
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 2,
    singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
    supportsPhoto: false,
  },
  corporate: {
    id: 'corporate', name: 'Corporate', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  banking: {
    id: 'banking', name: 'Banking', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  consulting: {
    id: 'consulting', name: 'Consulting', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  federal: {
    id: 'federal', name: 'Federal', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 3, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  legal: {
    id: 'legal', name: 'Legal', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  marketing: {
    id: 'marketing', name: 'Marketing', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  designer: {
    id: 'designer', name: 'Designer', layout: 'fixed-sidebar', supportsPageBreaks: false, supportsManualBreaks: false,
    maxRecommendedPages: 1, singlePageOptimized: true,
    breakableSections: [], supportsPhoto: true,
    warningMessage: "This design layout is optimized for single-page resumes. Try Clean or Modern for multi-page.",
    suggestedAlternatives: ['clean', 'modern'],
  },
  portfolio: {
    id: 'portfolio', name: 'Portfolio', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  startup: {
    id: 'startup', name: 'Startup', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  infographic: {
    id: 'infographic', name: 'Infographic', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 1, singlePageOptimized: true,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  'data-science': {
    id: 'data-science', name: 'Data Science', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  devops: {
    id: 'devops', name: 'DevOps', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  cyber: {
    id: 'cyber', name: 'Cybersecurity', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  product: {
    id: 'product', name: 'Product', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  clean: {
    id: 'clean', name: 'Clean', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  swiss: {
    id: 'swiss', name: 'Swiss', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  mono: {
    id: 'mono', name: 'Mono', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
  zen: {
    id: 'zen', name: 'Zen', layout: 'linear', supportsPageBreaks: true, supportsManualBreaks: true,
    maxRecommendedPages: 2, singlePageOptimized: false,
    breakableSections: ['summary', 'experience', 'education', 'skills', 'certifications'], supportsPhoto: false,
  },
};

/**
 * Gets the configuration for a template.
 */
export function getTemplateConfig(templateId: TemplateId): TemplateConfig {
  return TEMPLATE_CONFIGS[templateId];
}

/**
 * Checks if a template supports any form of page breaks.
 */
export function templateSupportsPageBreaks(templateId: TemplateId): boolean {
  return TEMPLATE_CONFIGS[templateId].supportsPageBreaks;
}

/**
 * Checks if a template is optimized for single-page layouts.
 */
export function isTemplateOptimizedForSinglePage(templateId: TemplateId): boolean {
  return TEMPLATE_CONFIGS[templateId].singlePageOptimized;
}

/**
 * Gets the breakable sections for a template.
 * Returns empty array if template doesn't support manual breaks.
 */
export function getBreakableSections(templateId: TemplateId): SectionId[] {
  const config = TEMPLATE_CONFIGS[templateId];
  if (!config.supportsManualBreaks) return [];
  return config.breakableSections;
}

/**
 * Filters available sections to only those that can have breaks after them.
 */
export function filterBreakableSections(
  templateId: TemplateId, 
  availableSections: SectionId[]
): SectionId[] {
  const breakable = getBreakableSections(templateId);
  if (breakable.length === 0) return [];
  return availableSections.filter(section => breakable.includes(section));
}

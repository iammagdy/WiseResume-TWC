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

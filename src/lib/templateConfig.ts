import { TemplateId } from '@/types/resume';

export type TemplateLayout = 'linear' | 'linear-grid' | 'fixed-sidebar';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  layout: TemplateLayout;
  maxRecommendedPages: number;
  supportsPhoto: boolean;
}

export const TEMPLATE_CONFIGS: Record<TemplateId, TemplateConfig> = {
  minimal: { id: 'minimal', name: 'Minimal', layout: 'linear', maxRecommendedPages: 3, supportsPhoto: false },
  classic: { id: 'classic', name: 'Classic', layout: 'linear', maxRecommendedPages: 3, supportsPhoto: false },
  modern: { id: 'modern', name: 'Modern', layout: 'linear', maxRecommendedPages: 3, supportsPhoto: false },
  developer: { id: 'developer', name: 'Developer', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  executive: { id: 'executive', name: 'Executive', layout: 'linear-grid', maxRecommendedPages: 2, supportsPhoto: false },
  professional: { id: 'professional', name: 'Professional', layout: 'linear', maxRecommendedPages: 3, supportsPhoto: false },
  creative: { id: 'creative', name: 'Creative', layout: 'linear', maxRecommendedPages: 3, supportsPhoto: true },
  compact: { id: 'compact', name: 'Compact', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  academic: { id: 'academic', name: 'Academic', layout: 'linear', maxRecommendedPages: 4, supportsPhoto: false },
  healthcare: { id: 'healthcare', name: 'Healthcare', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  sales: { id: 'sales', name: 'Sales', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  elegant: { id: 'elegant', name: 'Elegant', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  corporate: { id: 'corporate', name: 'Corporate', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  banking: { id: 'banking', name: 'Banking', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  consulting: { id: 'consulting', name: 'Consulting', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  federal: { id: 'federal', name: 'Federal', layout: 'linear', maxRecommendedPages: 3, supportsPhoto: false },
  legal: { id: 'legal', name: 'Legal', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  marketing: { id: 'marketing', name: 'Marketing', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  designer: { id: 'designer', name: 'Designer', layout: 'linear', maxRecommendedPages: 3, supportsPhoto: true },
  portfolio: { id: 'portfolio', name: 'Portfolio', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  startup: { id: 'startup', name: 'Startup', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  infographic: { id: 'infographic', name: 'Infographic', layout: 'linear', maxRecommendedPages: 1, supportsPhoto: false },
  'data-science': { id: 'data-science', name: 'Data Science', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  devops: { id: 'devops', name: 'DevOps', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  cyber: { id: 'cyber', name: 'Cybersecurity', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  product: { id: 'product', name: 'Product', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  clean: { id: 'clean', name: 'Clean', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  swiss: { id: 'swiss', name: 'Swiss', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  mono: { id: 'mono', name: 'Mono', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
  zen: { id: 'zen', name: 'Zen', layout: 'linear', maxRecommendedPages: 2, supportsPhoto: false },
};

/**
 * Gets the configuration for a template.
 */
export function getTemplateConfig(templateId: TemplateId): TemplateConfig {
  return TEMPLATE_CONFIGS[templateId];
}

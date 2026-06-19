import { lazyWithRetry } from '@/lib/lazyWithRetry';

import { TemplateId } from '@/types/resume';

const templateComponents = {
  'wiseresume-classic': lazyWithRetry(() => import('@/components/templates/WiseResumeClassicTemplate').then(m => ({ default: m.WiseResumeClassicTemplate }))),
  modern: lazyWithRetry(() => import('@/components/templates/ModernTemplate').then(m => ({ default: m.ModernTemplate }))),
  classic: lazyWithRetry(() => import('@/components/templates/ClassicTemplate').then(m => ({ default: m.ClassicTemplate }))),
  minimal: lazyWithRetry(() => import('@/components/templates/MinimalTemplate').then(m => ({ default: m.MinimalTemplate }))),
  professional: lazyWithRetry(() => import('@/components/templates/ProfessionalTemplate').then(m => ({ default: m.ProfessionalTemplate }))),
  developer: lazyWithRetry(() => import('@/components/templates/DeveloperTemplate').then(m => ({ default: m.DeveloperTemplate }))),
  creative: lazyWithRetry(() => import('@/components/templates/CreativeTemplate').then(m => ({ default: m.CreativeTemplate }))),
  executive: lazyWithRetry(() => import('@/components/templates/ExecutiveTemplate').then(m => ({ default: m.ExecutiveTemplate }))),
  compact: lazyWithRetry(() => import('@/components/templates/CompactTemplate').then(m => ({ default: m.CompactTemplate }))),
  academic: lazyWithRetry(() => import('@/components/templates/AcademicTemplate').then(m => ({ default: m.AcademicTemplate }))),
  healthcare: lazyWithRetry(() => import('@/components/templates/HealthcareTemplate').then(m => ({ default: m.HealthcareTemplate }))),
  sales: lazyWithRetry(() => import('@/components/templates/SalesTemplate').then(m => ({ default: m.SalesTemplate }))),
  elegant: lazyWithRetry(() => import('@/components/templates/ElegantTemplate').then(m => ({ default: m.ElegantTemplate }))),
  banking: lazyWithRetry(() => import('@/components/templates/BankingTemplate').then(m => ({ default: m.BankingTemplate }))),
  consulting: lazyWithRetry(() => import('@/components/templates/ConsultingTemplate').then(m => ({ default: m.ConsultingTemplate }))),
  federal: lazyWithRetry(() => import('@/components/templates/FederalTemplate').then(m => ({ default: m.FederalTemplate }))),
  legal: lazyWithRetry(() => import('@/components/templates/LegalTemplate').then(m => ({ default: m.LegalTemplate }))),
  marketing: lazyWithRetry(() => import('@/components/templates/MarketingTemplate').then(m => ({ default: m.MarketingTemplate }))),
  designer: lazyWithRetry(() => import('@/components/templates/DesignerTemplate').then(m => ({ default: m.DesignerTemplate }))),
  portfolio: lazyWithRetry(() => import('@/components/templates/PortfolioTemplate').then(m => ({ default: m.PortfolioTemplate }))),
  'data-science': lazyWithRetry(() => import('@/components/templates/DataScienceTemplate').then(m => ({ default: m.DataScienceTemplate }))),
  devops: lazyWithRetry(() => import('@/components/templates/DevOpsTemplate').then(m => ({ default: m.DevOpsTemplate }))),
  product: lazyWithRetry(() => import('@/components/templates/ProductTemplate').then(m => ({ default: m.ProductTemplate }))),
  clean: lazyWithRetry(() => import('@/components/templates/CleanTemplate').then(m => ({ default: m.CleanTemplate }))),
  swiss: lazyWithRetry(() => import('@/components/templates/SwissTemplate').then(m => ({ default: m.SwissTemplate }))),
  bento: lazyWithRetry(() => import('@/components/templates/BentoTemplate').then(m => ({ default: m.BentoTemplate }))),
  brutalist: lazyWithRetry(() => import('@/components/templates/BrutalistTemplate').then(m => ({ default: m.BrutalistTemplate }))),
  'bold-type': lazyWithRetry(() => import('@/components/templates/BoldTypeTemplate').then(m => ({ default: m.BoldTypeTemplate }))),
} satisfies Record<TemplateId, ReturnType<typeof lazyWithRetry>>;

export default templateComponents;

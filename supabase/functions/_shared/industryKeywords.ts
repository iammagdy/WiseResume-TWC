export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  software: ['JavaScript', 'TypeScript', 'React', 'Python', 'SQL', 'Git', 'REST API', 'Docker', 'AWS', 'CI/CD', 'Agile', 'Scrum'],
  data: ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'Tableau', 'Power BI', 'TensorFlow', 'Pandas', 'ETL', 'BigQuery', 'Statistics'],
  marketing: ['SEO', 'SEM', 'Google Analytics', 'Social Media Marketing', 'Content Strategy', 'CRM', 'A/B Testing', 'Email Marketing', 'HubSpot'],
  sales: ['Salesforce', 'CRM', 'Lead Generation', 'B2B Sales', 'Pipeline Management', 'Account Management', 'Quota Attainment', 'Cold Outreach'],
  finance: ['Financial Modeling', 'Excel', 'GAAP', 'Budgeting', 'Forecasting', 'Risk Management', 'Bloomberg', 'Variance Analysis', 'P&L'],
  hr: ['Recruiting', 'HRIS', 'ATS', 'Onboarding', 'Performance Management', 'Employee Relations', 'Workday', 'Benefits Administration'],
  design: ['Figma', 'Adobe Creative Suite', 'UI/UX Design', 'Prototyping', 'User Research', 'Wireframing', 'Design Systems', 'Accessibility'],
  operations: ['Process Improvement', 'Lean', 'Six Sigma', 'Supply Chain', 'Project Management', 'PMP', 'KPIs', 'Logistics', 'ERP'],
  healthcare: ['EHR', 'HIPAA', 'Patient Care', 'Clinical Documentation', 'EPIC', 'Healthcare Compliance', 'ICD-10', 'Medical Coding'],
  legal: ['Contract Review', 'Legal Research', 'Compliance', 'Due Diligence', 'Regulatory Affairs', 'Litigation Support', 'eDiscovery'],
  education: ['Curriculum Development', 'Lesson Planning', 'Student Assessment', 'LMS', 'Differentiated Instruction', 'IEP'],
  product_manager: ['Product Roadmap', 'User Stories', 'Agile', 'Scrum', 'JIRA', 'Stakeholder Management', 'A/B Testing', 'OKRs', 'KPIs', 'PRD', 'Go-to-Market', 'Product Analytics'],
  general: ['Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management', 'Microsoft Office', 'Time Management'],
};

export function detectIndustryCategory(resume: any): string {
  const titles = (resume.experience || []).map((e: any) => (e.position || '').toLowerCase()).join(' ');
  const skills = (Array.isArray(resume.skills) ? resume.skills.map((s: any) => typeof s === 'string' ? s.toLowerCase() : '') : []).join(' ');
  const summary = (resume.summary || '').toLowerCase();
  const combined = titles + ' ' + skills + ' ' + summary;

  if (/product manager|product owner|product lead|head of product|vp of product|director of product|pm\b/.test(combined)) return 'product_manager';
  if (/engineer|developer|software|frontend|backend|full.?stack|devops|programmer|typescript|javascript|node\.?js|react\b|angular|vue/.test(combined)) return 'software';
  if (/data scientist|data analyst|machine learning|ai\b|ml\b|analytics|tableau|power bi|bigquery/.test(combined)) return 'data';
  if (/market|seo|sem|digital marketing|content|brand|social media|demand gen|growth/.test(combined)) return 'marketing';
  if (/sales|account executive|business development|sales manager|quota|revenue/.test(combined)) return 'sales';
  if (/financ|accountant|controller|cfo|invest|audit|tax\b|budget|forecast/.test(combined)) return 'finance';
  if (/human resources|hr \b|recruiting|talent acquisition|people ops|hris/.test(combined)) return 'hr';
  if (/design|ux\b|ui \b|figma|adobe|creative|visual/.test(combined)) return 'design';
  if (/operat|supply chain|logistics|manufactur|lean|six sigma|warehouse/.test(combined)) return 'operations';
  if (/nurse|doctor|physician|clinical|healthcare|medical|patient|ehr/.test(combined)) return 'healthcare';
  if (/legal|attorney|lawyer|compliance|paralegal|litigation/.test(combined)) return 'legal';
  if (/teacher|educator|instructor|curriculum|professor|faculty/.test(combined)) return 'education';
  return 'general';
}

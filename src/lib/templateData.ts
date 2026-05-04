import { TemplateInfo } from '@/types/resume';

export const templates: TemplateInfo[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean design with accent colors',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional professional layout',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant design',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate-friendly template',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Code-inspired tech resume',
    atsScore: 'high',
    category: 'tech',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold sidebar with accents',
    atsScore: 'medium',
    category: 'creative',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Elegant serif typography',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Dense layout for entry-level',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Research-focused CV layout',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Clean medical professional',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Metrics-driven achievements',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Refined aesthetic design',
    atsScore: 'medium',
    category: 'creative',
  },
  // --- Industry templates ---
  {
    id: 'banking',
    name: 'Banking',
    description: 'Conservative finance industry standard',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'consulting',
    name: 'Consulting',
    description: 'Strategy-focused consulting layout',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'federal',
    name: 'Government',
    description: 'Government & public sector format',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'legal',
    name: 'Legal',
    description: 'Law firm & judicial standard',
    atsScore: 'high',
    category: 'professional',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Brand-forward creative marketing',
    atsScore: 'medium',
    category: 'creative',
  },
  {
    id: 'designer',
    name: 'Designer',
    description: 'Visual portfolio sidebar layout',
    atsScore: 'medium',
    category: 'creative',
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Project-centric showcase layout',
    atsScore: 'medium',
    category: 'creative',
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Analytics & ML focused layout',
    atsScore: 'high',
    category: 'tech',
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'Infrastructure & CI/CD focused',
    atsScore: 'high',
    category: 'tech',
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Product management & strategy',
    atsScore: 'high',
    category: 'tech',
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Ultra-minimal whitespace design',
    atsScore: 'high',
    category: 'minimalist',
  },
  {
    id: 'swiss',
    name: 'Swiss',
    description: 'International typographic style',
    atsScore: 'high',
    category: 'minimalist',
  },
  // --- 2026 Creative Templates ---
  {
    id: 'bento',
    name: 'Bento',
    description: 'Modular card-grid layout, 2026 style',
    atsScore: 'high',
    category: 'creative',
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Bold black borders, offset shadow header',
    atsScore: 'high',
    category: 'creative',
  },
  {
    id: 'bold-type',
    name: 'Bold Type',
    description: 'Oversized black header, strong typography',
    atsScore: 'high',
    category: 'creative',
  },
];

export const atsScoreDescriptions: Record<string, string> = {
  high: 'This template\'s layout is optimized for ATS parsing — clean structure, no graphics or tables that block scanners. This measures layout readability only, not your resume\'s keyword match or content quality.',
  medium: 'Some design elements in this template may affect parsing in certain ATS systems. Layout readability is good but not fully optimized. This does not measure keyword match or content quality.',
  low: 'This visually creative template may have reduced ATS parsability due to its design. Best for roles where you submit directly to a recruiter. This does not measure keyword match or content quality.',
};

export const atsScoreColors: Record<string, string> = {
  high: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
};

export const atsScoreLabels: Record<string, string> = {
  high: 'ATS Layout: Optimized',
  medium: 'ATS Layout: Good',
  low: 'ATS Layout: Creative',
};

export const sampleResumeData = {
  contactInfo: {
    fullName: 'Wise Portfolio',
    email: 'contact@thewise.cloud',
    phone: '(555) 123-4567',
    location: 'The Wise Cloud HQ',
  },
  summary: 'Interstellar AI Navigator specializing in quantum propulsion and autonomous spacecraft operations across multiple galaxies.',
  experience: [
    {
      id: '1',
      company: 'The Wise Cloud',
      position: 'Senior AI Navigator',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description: 'Leading interstellar AI navigation and mission control',
      achievements: ['Reduced warp travel time by 73%', 'Commanded fleet of 12 spacecraft'],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Cosmic Academy',
      degree: 'Master of Science',
      field: 'Astro-AI Engineering',
      startDate: '2014',
      endDate: '2018',
    },
  ],
  skills: ['Quantum Navigation', 'Neural Starship UI', 'Warp Systems', 'AI Fleet Command', 'Zero-G Ops', 'Cosmic Analytics'],
  certifications: [],
  templateId: 'modern',
};

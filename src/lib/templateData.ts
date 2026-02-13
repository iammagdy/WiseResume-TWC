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
];

export const atsScoreDescriptions: Record<string, string> = {
  high: 'Optimized for automated screening – parses correctly in 95%+ of ATS systems',
  medium: 'Some design elements may affect parsing in certain ATS systems',
  low: 'Best for direct submissions – may have issues with automated screening',
};

export const atsScoreColors: Record<string, string> = {
  high: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-destructive/20 text-destructive border-destructive/30',
};

export const atsScoreLabels: Record<string, string> = {
  high: 'ATS-Friendly',
  medium: 'Moderate ATS',
  low: 'Low ATS',
};

export const sampleResumeData = {
  contactInfo: {
    fullName: 'Wise Megz',
    email: 'megz@wiseuniverse.ai',
    phone: '(555) 123-4567',
    location: 'Wise Universe HQ',
  },
  summary: 'Interstellar AI Navigator specializing in quantum propulsion and autonomous spacecraft operations across multiple galaxies.',
  experience: [
    {
      id: '1',
      company: 'Wise Universe',
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

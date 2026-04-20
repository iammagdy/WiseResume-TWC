import type { ResumeData } from '@/types/resume';

export function buildSampleResume(displayName?: string | null): { resume: ResumeData; title: string } {
  const fullName = (displayName && displayName.trim()) || 'Sample Candidate';
  const title = `Demo Resume — ${fullName.split(/\s+/)[0]}`;

  const resume: ResumeData = {
    contactInfo: {
      fullName,
      email: 'demo.candidate@example.com',
      phone: '+1 (415) 555-0142',
      location: 'San Francisco, CA',
      linkedin: 'linkedin.com/in/demo-candidate',
      github: 'github.com/demo-candidate',
      portfolio: 'demo-candidate.dev',
    },
    summary:
      'Senior product engineer with 8+ years building user-facing web applications at scale. Led cross-functional teams to ship AI-powered features that improved activation by 35% and reduced churn by 18%. Strong opinions on design systems, observability, and shipping small, often.',
    experience: [
      {
        id: 'exp-1',
        company: 'Northwind Labs',
        position: 'Senior Software Engineer',
        startDate: 'Mar 2022',
        endDate: 'Present',
        current: true,
        description:
          'Lead engineer on the activation pod. Own the onboarding funnel, in-app guidance, and the experimentation platform.',
        achievements: [
          'Shipped a redesigned onboarding flow that lifted day-7 activation from 41% to 56% (+15pp).',
          'Built an A/B testing service used by 22 product engineers across 4 squads.',
          'Mentored 3 mid-level engineers; two were promoted to senior within 12 months.',
        ],
        responsibilities: [
          'Drive technical roadmap for the activation pod (4 engineers, 1 PM, 1 designer).',
          'Author RFCs for shared infrastructure and review designs across the front-end org.',
        ],
      },
      {
        id: 'exp-2',
        company: 'Brightline Health',
        position: 'Software Engineer',
        startDate: 'Jul 2019',
        endDate: 'Feb 2022',
        current: false,
        description:
          'Built patient-facing scheduling and messaging products on a React + Node stack serving 500k+ active families.',
        achievements: [
          'Cut average appointment booking time from 6 minutes to 90 seconds.',
          'Migrated legacy REST endpoints to GraphQL, reducing payload size by ~40%.',
          'Introduced visual regression testing, eliminating an entire class of UI bugs.',
        ],
        responsibilities: [],
      },
      {
        id: 'exp-3',
        company: 'Pixelforge Studio',
        position: 'Front-End Developer',
        startDate: 'Aug 2017',
        endDate: 'Jun 2019',
        current: false,
        description:
          'Agency role delivering marketing sites and e-commerce builds for 20+ clients in retail and fintech.',
        achievements: [
          'Owned the in-house React component library used across all client projects.',
          'Improved Lighthouse performance scores by an average of 28 points across 12 launches.',
        ],
        responsibilities: [],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'University of California, Davis',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2013',
        endDate: '2017',
        gpa: '3.7',
      },
    ],
    skills: [
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'GraphQL',
      'PostgreSQL',
      'AWS',
      'Tailwind CSS',
      'Jest / Playwright',
      'A/B testing',
      'Mentorship',
      'Technical writing',
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Developer – Associate',
        issuer: 'Amazon Web Services',
        date: '2021',
      },
    ],
    awards: [],
    projects: [
      {
        id: 'proj-1',
        name: 'OpenLanes',
        role: 'Creator & Maintainer',
        startDate: '2023',
        endDate: 'Present',
        technologies: ['TypeScript', 'React', 'Vite'],
        description:
          'Open-source kanban board with offline-first sync. 1.2k GitHub stars and 30+ contributors.',
        url: 'https://openlanes.dev',
        githubUrl: 'https://github.com/demo-candidate/openlanes',
      },
    ],
    publications: [],
    volunteering: [
      {
        id: 'vol-1',
        organization: 'Code2College',
        role: 'Volunteer Mentor',
        startDate: '2020',
        endDate: 'Present',
        description: 'Mentor high-school students through their first software engineering project each semester.',
      },
    ],
    hobbies: [],
    references: [],
    templateId: 'modern',
  };

  return { resume, title };
}

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WiseResumeClassicTemplate } from '../WiseResumeClassicTemplate';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WiseResumeClassicTemplate } from '../WiseResumeClassicTemplate';
import templateComponents from '../registry';
import { templates } from '@/lib/templateData';
import { migrateTemplateId } from '@/lib/templateMigration';
import { useSettingsStore } from '@/store/settingsStore';
import type { ResumeData } from '@/types/resume';

const sampleResume: ResumeData = {
  contactInfo: {
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    email2: 'contact@alexmorgan.example',
    phone: '+1 (555) 019-2834',
    location: 'San Francisco, CA',
    linkedin: 'https://www.linkedin.com/in/alex-morgan/',
    github: 'https://github.com/alexmorgan',
    portfolio: 'https://alexmorgan.example',
  },
  summary: 'Versatile operations, customer experience, and technical leader.',
  experience: [
    {
      id: '1',
      position: 'AI Products Developer',
      company: 'The Wise Cloud',
      account: 'Self-employed',
      startDate: '2025-09',
      endDate: 'Present',
      current: true,
      description: '',
      achievements: ['Build and ship end-to-end SaaS products from concept to launch.'],
    },
  ],
  education: [
    {
      id: '1',
      field: 'Software Engineering',
      degree: '',
      institution: 'State University',
      startDate: '2024',
      endDate: '2026',
    },
  ],
  skills: ['Team Leadership', 'Operations Management', 'React', 'AWS'],
  certifications: [],
  projects: [
    {
      id: '1',
      name: 'WiseResume',
      role: 'Founder & Developer',
      url: 'https://wiseresume.app',
      description: 'AI resume editor with ATS-friendly templates.',
      technologies: ['React', 'AWS'],
      startDate: '',
      endDate: '',
    },
  ],
  templateId: 'wiseresume-classic',
};

describe('WiseResume Classic template', () => {
  it('is the first registered template and the default for new resumes', () => {
    expect(templates[0]).toMatchObject({
      id: 'wiseresume-classic',
      name: 'WiseResume Classic',
      atsScore: 'high',
    });
    expect(useSettingsStore.getState().defaultTemplate).toBe('wiseresume-classic');
    expect(migrateTemplateId('wiseresume-classic')).toBe('wiseresume-classic');
    expect(templateComponents['wiseresume-classic']).toBeDefined();
  });

  it('renders required contact links, plain phone, and page footer branding', () => {
    const { container } = render(<WiseResumeClassicTemplate resume={sampleResume} />);

    const firstEmail = screen.getByRole('link', { name: 'alex.morgan@example.com' });
    expect(firstEmail).toHaveAttribute('href', 'mailto:alex.morgan@example.com');

    const secondEmail = screen.getByRole('link', { name: 'contact@alexmorgan.example' });
    expect(secondEmail).toHaveAttribute('href', 'mailto:contact@alexmorgan.example');

    expect(screen.getByText('+1 (555) 019-2834').closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: 'alex-morgan' })).toHaveAttribute('href', 'https://www.linkedin.com/in/alex-morgan/');
    expect(screen.getByRole('link', { name: 'alexmorgan' })).toHaveAttribute('href', 'https://github.com/alexmorgan');
    expect(screen.getByRole('link', { name: 'alexmorgan.example' })).toHaveAttribute('href', 'https://alexmorgan.example');

    expect(screen.getByRole('link', { name: 'WiseResume' })).toHaveAttribute('href', 'https://wiseresume.app');
    expect(container.querySelector('[data-resume-template]')).toBeTruthy();
    expect(container.textContent).not.toContain('—');
  });

  it('renders editable experience description text alongside imported highlights', () => {
    const resume = {
      ...sampleResume,
      experience: [{
        ...sampleResume.experience[0],
        description: 'Led the product roadmap and customer discovery.',
        achievements: ['Improved conversion by 20%.'],
        responsibilities: ['Managed release planning.'],
      }],
    };

    render(<WiseResumeClassicTemplate resume={resume} />);

    expect(screen.getByText('Led the product roadmap and customer discovery.')).toBeInTheDocument();
    expect(screen.getByText('Improved conversion by 20%.')).toBeInTheDocument();
    expect(screen.getByText('Managed release planning.')).toBeInTheDocument();
  });
});

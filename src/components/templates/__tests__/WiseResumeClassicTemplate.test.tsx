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
    fullName: 'Magdy Saber',
    email: 'magdy.saber@outlook.com',
    email2: 'contact@magdysaber.com',
    phone: '+201111113041',
    location: 'Cairo, Egypt',
    linkedin: 'https://www.linkedin.com/in/magdy-saber/',
    github: 'https://github.com/iammagdy',
    portfolio: 'https://magdysaber.com',
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
      institution: 'Cairo University',
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
      url: 'https://resume.thewise.cloud',
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

    const firstEmail = screen.getByRole('link', { name: 'magdy.saber@outlook.com' });
    expect(firstEmail).toHaveAttribute('href', 'mailto:magdy.saber@outlook.com');

    const secondEmail = screen.getByRole('link', { name: 'contact@magdysaber.com' });
    expect(secondEmail).toHaveAttribute('href', 'mailto:contact@magdysaber.com');

    expect(screen.getByText('+201111113041').closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: 'magdy-saber' })).toHaveAttribute('href', 'https://www.linkedin.com/in/magdy-saber/');
    expect(screen.getByRole('link', { name: 'iammagdy' })).toHaveAttribute('href', 'https://github.com/iammagdy');
    expect(screen.getByRole('link', { name: 'magdysaber.com' })).toHaveAttribute('href', 'https://magdysaber.com');

    expect(screen.getByRole('link', { name: 'WiseResume' })).toHaveAttribute('href', 'https://resume.thewise.cloud');
    expect(container.querySelector('[data-resume-template]')).toBeTruthy();
    expect(container.textContent).not.toContain('—');
  });
});

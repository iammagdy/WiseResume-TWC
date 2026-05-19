import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { mockResumeStore } from '@/test/mocks/zustandStores';
import { ExportPageBreakSetup } from '../ExportPageBreakSetup';
import type { ResumeData } from '@/types/resume';

function layout(el: HTMLElement, scrollHeight: number) {
  Object.defineProperty(el, 'scrollHeight', { get: () => scrollHeight, configurable: true });
  Object.defineProperty(el, 'offsetHeight', { get: () => scrollHeight, configurable: true });
  Object.defineProperty(el, 'offsetWidth', { get: () => 612, configurable: true });
}

describe('ExportPageBreakSetup', () => {
  let templateElement: HTMLDivElement;
  let resumeData: ResumeData;

  beforeEach(() => {
    vi.clearAllMocks();
    templateElement = document.createElement('div');
    layout(templateElement, 600);
    document.body.appendChild(templateElement);

    resumeData = {
      ...(mockResumeStore.currentResume as ResumeData),
      customization: {
        ...(mockResumeStore.currentResume as ResumeData).customization,
        customBreakPositions: [],
        pageFormat: 'letter',
      },
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not persist breaks when opened with no saved cuts', async () => {
    renderWithProviders(
      <ExportPageBreakSetup active templateElement={templateElement} resumeData={resumeData} />,
    );

    expect(
      await screen.findByText(/no custom cuts saved yet/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(templateElement.scrollHeight).toBe(600);
    });

    await new Promise((r) => setTimeout(r, 150));

    expect(mockResumeStore.updateResume).not.toHaveBeenCalled();
  });
});

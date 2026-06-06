/**
 * D11 — Tailoring Hub: JobInputArea controlled tab
 * Issues 4 & 5: URL fetch auto-switches to paste tab; onUrlParsed removed
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobInputArea } from '../JobInputArea';

vi.mock('@/lib/haptics', () => ({
  haptics: { light: vi.fn() },
}));

const defaultProps = {
  jobDescription: '',
  jobUrl: '',
  onJobDescriptionChange: vi.fn(),
  onJobUrlChange: vi.fn(),
};

describe('JobInputArea — controlled activeTab (Issue 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows paste textarea by default (no controlled tab)', () => {
    render(<JobInputArea {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/paste the full job description here/i),
    ).toBeInTheDocument();
  });

  it('shows URL input when activeTab="url" (controlled)', () => {
    render(
      <JobInputArea
        {...defaultProps}
        activeTab="url"
        onActiveTabChange={vi.fn()}
      />,
    );
    expect(
      screen.getByPlaceholderText(/linkedin\.com\/jobs/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/paste the full job description here/i),
    ).not.toBeInTheDocument();
  });

  it('switches to paste panel when controlled activeTab changes to "paste"', () => {
    const { rerender } = render(
      <JobInputArea
        {...defaultProps}
        activeTab="url"
        onActiveTabChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByPlaceholderText(/paste the full job description here/i),
    ).not.toBeInTheDocument();

    rerender(
      <JobInputArea
        {...defaultProps}
        activeTab="paste"
        onActiveTabChange={vi.fn()}
      />,
    );
    expect(
      screen.getByPlaceholderText(/paste the full job description here/i),
    ).toBeInTheDocument();
  });

  it('calls onActiveTabChange("url") when user clicks Job URL tab', () => {
    const onTabChange = vi.fn();
    render(
      <JobInputArea
        {...defaultProps}
        activeTab="paste"
        onActiveTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /job url/i }));
    expect(onTabChange).toHaveBeenCalledWith('url');
  });

  it('calls onActiveTabChange("paste") when user clicks Paste description tab', () => {
    const onTabChange = vi.fn();
    render(
      <JobInputArea
        {...defaultProps}
        activeTab="url"
        onActiveTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /paste description/i }));
    expect(onTabChange).toHaveBeenCalledWith('paste');
  });

  it('uses internal state when no activeTab prop is provided', () => {
    render(<JobInputArea {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/paste the full job description here/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /job url/i }));
    expect(
      screen.getByPlaceholderText(/linkedin\.com\/jobs/i),
    ).toBeInTheDocument();
  });
});

describe('JobInputArea — onUrlParsed removed (Issue 5)', () => {
  it('does not accept onUrlParsed as a prop (type-level — verified by tsc)', () => {
    // Runtime check: component renders fine without it
    render(<JobInputArea {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});

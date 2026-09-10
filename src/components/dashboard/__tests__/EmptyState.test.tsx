import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('Dashboard EmptyState — One Composition Design Requirements', () => {
  it('renders a single unified card composition with only 2 primary CTAs', () => {
    const handleCreate = vi.fn();
    const handleUpload = vi.fn();

    render(
      <EmptyState
        onCreateNew={handleCreate}
        onUploadResume={handleUpload}
      />
    );

    // Primary heading
    expect(screen.getByText(/build your first resume/i)).toBeInTheDocument();

    // Primary CTA: Create Resume
    const createBtn = screen.getByRole('button', { name: /create resume/i });
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);
    expect(handleCreate).toHaveBeenCalledTimes(1);

    // Secondary CTA: Upload Existing Resume
    const uploadBtn = screen.getByRole('button', { name: /upload existing resume/i });
    expect(uploadBtn).toBeInTheDocument();
    fireEvent.click(uploadBtn);
    expect(handleUpload).toHaveBeenCalledTimes(1);

    // STRICT: "Optimize for a Job" must NOT appear before a resume exists
    expect(screen.queryByText(/optimize for a job/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tailor for a job/i)).not.toBeInTheDocument();

    // Value badges
    expect(screen.getByText(/ats-optimized/i)).toBeInTheDocument();
    expect(screen.getByText(/ai tailoring/i)).toBeInTheDocument();
    expect(screen.getByText(/instant pdf export/i)).toBeInTheDocument();
  });

  it('renders compact contextual checklist when passed via slot', () => {
    render(
      <EmptyState
        onCreateNew={vi.fn()}
        onUploadResume={vi.fn()}
        checklist={<div data-testid="contextual-checklist">Checklist Content</div>}
      />
    );

    expect(screen.getByTestId('contextual-checklist')).toBeInTheDocument();
    expect(screen.getByText('Checklist Content')).toBeInTheDocument();
  });
});

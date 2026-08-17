import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import SharePage from '../SharePage';

const mocks = vi.hoisted(() => ({
  usePublicResume: vi.fn(),
  useUnlockPublicResume: vi.fn(),
  usePublicShareComments: vi.fn(),
  useAddShareComment: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'missing-share-token' }),
}));

vi.mock('@/hooks/useResumeShares', () => ({
  usePublicResume: mocks.usePublicResume,
  useUnlockPublicResume: mocks.useUnlockPublicResume,
}));

vi.mock('@/hooks/useShareComments', () => ({
  usePublicShareComments: mocks.usePublicShareComments,
  useAddShareComment: mocks.useAddShareComment,
}));

describe('SharePage', () => {
  it('renders the shared-resume skeleton while a public lookup is pending', () => {
    mocks.usePublicResume.mockReturnValue({ data: undefined, isLoading: true, error: null });
    mocks.useUnlockPublicResume.mockReturnValue({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false });
    mocks.usePublicShareComments.mockReturnValue({ data: [] });
    mocks.useAddShareComment.mockReturnValue({ mutate: vi.fn(), isPending: false });

    const { container } = render(<SharePage />);

    expect(container.firstElementChild).not.toBeNull();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OnboardingPage, { onboardingKey } from '../OnboardingPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Alex Morgan' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    authReady: true,
    authSettled: true,
  }),
}));

const mockResumes: unknown[] = [];
vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({
    resumes: mockResumes,
    loading: false,
    fetching: false,
    isFetched: true,
  }),
}));

vi.mock('@/hooks/useMe', () => ({
  useMe: () => ({
    data: { subscription: { effective_plan: 'free' } },
  }),
}));

vi.mock('@/components/ai/AIPrivacyDisclosureProvider', () => ({
  useAIPrivacyDisclosure: () => ({
    requestDisclosure: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/components/ai/AIPrivacyDisclosure', () => ({
  hasAcceptedAIPrivacy: () => true,
}));

vi.mock('@/lib/auditLogger', () => ({
  logAudit: vi.fn(),
}));

const mockListDocuments = vi.fn().mockResolvedValue({ documents: [] });
const mockUpdateDocument = vi.fn().mockResolvedValue({});
vi.mock('@/lib/appwrite', () => ({
  databases: {
    listDocuments: (...args: unknown[]) => mockListDocuments(...args),
    updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
  },
  DATABASE_ID: 'main',
  Query: {
    equal: vi.fn(),
    select: vi.fn(),
    limit: vi.fn(),
  },
}));

vi.mock('@/lib/profileSeed', () => ({
  upsertProfileIdentity: vi.fn().mockResolvedValue({}),
}));

const mockSaveOnboardingProfile = vi.fn().mockResolvedValue({ resumeId: 'starter-123', hasResume: true });
vi.mock('@/lib/onboardingProfile', () => ({
  fromResumeData: vi.fn(),
  fromProfileData: vi.fn(),
  saveOnboardingProfile: (...args: unknown[]) => mockSaveOnboardingProfile(...args),
  probeLinkedInUrl: vi.fn(),
  emptyProfile: () => ({ fullName: 'Alex Morgan', jobTitle: '', experience: [], education: [], skills: [] }),
  reconcileOnboardingCompletion: vi.fn().mockResolvedValue(false),
}));

function renderOnboarding() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OnboardingPage — Goal-First UX & Lifecycle Requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders goal-first initial state with 3 clear goal options', () => {
    renderOnboarding();

    // Goal screen heading
    expect(screen.getByText(/what is your main goal today\?/i)).toBeInTheDocument();

    // 3 primary goals
    expect(screen.getByText(/build a new resume/i)).toBeInTheDocument();
    expect(screen.getByText(/upload or improve existing cv/i)).toBeInTheDocument();
    expect(screen.getByText(/tailor for a specific job/i)).toBeInTheDocument();
  });

  it('Skip for now must NOT appear on the initial goal step, but appears on step 2', async () => {
    renderOnboarding();

    // Initial goal step: Skip for now must NOT be present
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();

    // Click Goal 1: Build a new resume
    fireEvent.click(screen.getByText(/build a new resume/i));

    // Now on step 2: Skip for now MUST appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
    });
  });

  it('tailoring goal guides user with 0 resumes to prerequisite screen', async () => {
    renderOnboarding();

    // Click Goal 3: Tailor for a specific job
    fireEvent.click(screen.getByText(/tailor for a specific job/i));

    // Prerequisite message is displayed because resumes count is 0
    await waitFor(() => {
      expect(screen.getByText(/first, set up your base resume/i)).toBeInTheDocument();
      expect(screen.getByText(/upload existing cv/i)).toBeInTheDocument();
      expect(screen.getByText(/create a starter resume/i)).toBeInTheDocument();
    });
  });

  it('Skip flow persists completion to both Appwrite DB and localStorage and navigates to /dashboard', async () => {
    renderOnboarding();

    // Move to step 2 so Skip is available
    fireEvent.click(screen.getByText(/build a new resume/i));

    const skipButton = await screen.findByRole('button', { name: /skip for now/i });
    fireEvent.click(skipButton);

    await waitFor(() => {
      // LocalStorage key is written
      expect(localStorage.getItem(onboardingKey(mockUser.id))).toBe('true');
      // Navigates to dashboard with replace
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('skips onboarding if user already has completed flag in localStorage', async () => {
    localStorage.setItem(onboardingKey(mockUser.id), 'true');

    renderOnboarding();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('skips onboarding if Appwrite profile confirms onboarding_completed', async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ $id: 'prof-1', onboarding_completed: true }],
    });

    renderOnboarding();

    await waitFor(() => {
      expect(localStorage.getItem(onboardingKey(mockUser.id))).toBe('true');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('supports optional resume name input on create step', async () => {
    renderOnboarding();

    // Click Goal 1: Build a new resume
    fireEvent.click(screen.getByText(/build a new resume/i));

    await waitFor(() => {
      expect(screen.getByText(/resume name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Tech Lead 2026/i)).toBeInTheDocument();
    });
  });

  it('creates starter resume and navigates directly to /editor?id=... on CREATE flow', async () => {
    mockSaveOnboardingProfile.mockResolvedValueOnce({ resumeId: 'starter-resume-456', hasResume: true });
    renderOnboarding();

    // Click Goal 1: Build a new resume
    fireEvent.click(screen.getByText(/build a new resume/i));

    const createButton = await screen.findByRole('button', { name: /create & continue/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockSaveOnboardingProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          createStarterResume: true,
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/editor?id=starter-resume-456', { replace: true });
    });
  });

  it('drops duplicate clicks while submission is in-flight (synchronous lock)', async () => {
    let resolveSave: (val: { resumeId: string; hasResume: boolean }) => void;
    const savePromise = new Promise<{ resumeId: string; hasResume: boolean }>((resolve) => {
      resolveSave = resolve;
    });
    mockSaveOnboardingProfile.mockReturnValueOnce(savePromise);

    renderOnboarding();

    // Click Goal 1: Build a new resume
    fireEvent.click(screen.getByText(/build a new resume/i));

    const createButton = await screen.findByRole('button', { name: /create & continue/i });

    // Fire rapid double-click
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    // Synchronous ref lock ensures exactly one call is dispatched
    expect(mockSaveOnboardingProfile).toHaveBeenCalledTimes(1);

    resolveSave!({ resumeId: 'starter-id-789', hasResume: true });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/editor?id=starter-id-789', { replace: true });
    });
  });
});

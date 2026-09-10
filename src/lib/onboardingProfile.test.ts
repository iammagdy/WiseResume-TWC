import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOnboardingProfile, type ExtractedProfile } from './onboardingProfile';
import { COLLECTIONS } from '@/lib/appwrite-collections';

const appwriteMock = vi.hoisted(() => ({
  accountGet: vi.fn(),
  listDocuments: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => ({
  DATABASE_ID: 'test-db',
  Query: {
    equal: (field: string, value: unknown) => ({ field, value }),
    limit: (value: number) => ({ limit: value }),
  },
  ID: {
    unique: () => 'unique-id',
  },
  account: {
    get: appwriteMock.accountGet,
  },
  databases: {
    listDocuments: appwriteMock.listDocuments,
    createDocument: appwriteMock.createDocument,
    updateDocument: appwriteMock.updateDocument,
  },
}));

function profile(overrides: Partial<ExtractedProfile> = {}): ExtractedProfile {
  return {
    fullName: 'Test User',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    projects: [],
    volunteering: [],
    ...overrides,
  };
}

describe('saveOnboardingProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appwriteMock.accountGet.mockRejectedValue(new Error('session not hydrated'));
    appwriteMock.listDocuments.mockResolvedValue({ documents: [], total: 0 });
    appwriteMock.createDocument.mockResolvedValue({ $id: 'profile-doc' });
  });

  it('uses the parsed CV email when the account email is not hydrated', async () => {
    await saveOnboardingProfile({
      selectedProfile: profile({ email: ' Candidate@Example.COM ' }),
      fallbackUserId: 'user-1',
    });

    expect(appwriteMock.createDocument).toHaveBeenCalledWith(
      'test-db',
      COLLECTIONS.profiles,
      'unique-id',
      expect.objectContaining({
        user_id: 'user-1',
        email: 'candidate@example.com',
        contact_email: 'candidate@example.com',
      }),
    );
  });

  it('creates a placeholder profile email when no account or parsed email exists', async () => {
    await saveOnboardingProfile({
      selectedProfile: profile(),
      fallbackUserId: 'ios-user-1',
    });

    expect(appwriteMock.createDocument).toHaveBeenCalledWith(
      'test-db',
      COLLECTIONS.profiles,
      'unique-id',
      expect.objectContaining({
        user_id: 'ios-user-1',
        email: 'missing-email+ios-user-1@wiseresume.local',
      }),
    );
  });

  it('creates a starter resume when createStarterResume is true even with empty profile', async () => {
    appwriteMock.createDocument
      .mockResolvedValueOnce({ $id: 'profile-doc' })
      .mockResolvedValueOnce({ $id: 'starter-resume-id' });

    const result = await saveOnboardingProfile({
      selectedProfile: profile({ fullName: 'Starter User', jobTitle: 'Developer' }),
      fallbackUserId: 'user-starter',
      resumeTitle: 'Developer Resume',
      createStarterResume: true,
    });

    expect(result).toEqual({ resumeId: 'starter-resume-id', hasResume: true });
    expect(appwriteMock.createDocument).toHaveBeenCalledTimes(2);
    expect(appwriteMock.createDocument).toHaveBeenNthCalledWith(
      2,
      'test-db',
      COLLECTIONS.resumes,
      'unique-id',
      expect.objectContaining({
        user_id: 'user-starter',
        title: 'Developer Resume',
      }),
    );
  });

  it('does not create a resume when createStarterResume is false and profile is empty', async () => {
    appwriteMock.createDocument.mockResolvedValueOnce({ $id: 'profile-doc' });

    const result = await saveOnboardingProfile({
      selectedProfile: profile({ fullName: 'Empty User' }),
      fallbackUserId: 'user-empty',
      createStarterResume: false,
    });

    expect(result).toEqual({ resumeId: null, hasResume: false });
    expect(appwriteMock.createDocument).toHaveBeenCalledTimes(1);
  });

  it('persists optional custom resume name when createStarterResume is true', async () => {
    appwriteMock.createDocument
      .mockResolvedValueOnce({ $id: 'profile-doc' })
      .mockResolvedValueOnce({ $id: 'resume-custom-title' });

    await saveOnboardingProfile({
      selectedProfile: profile({ fullName: 'Sarah Connor' }),
      fallbackUserId: 'user-sarah',
      resumeTitle: 'Senior Tech Lead 2026',
      createStarterResume: true,
    });

    expect(appwriteMock.createDocument).toHaveBeenNthCalledWith(
      2,
      'test-db',
      COLLECTIONS.resumes,
      'unique-id',
      expect.objectContaining({
        title: 'Senior Tech Lead 2026',
      }),
    );
  });

  it('uses default fallback resume title when none is specified', async () => {
    appwriteMock.createDocument
      .mockResolvedValueOnce({ $id: 'profile-doc' })
      .mockResolvedValueOnce({ $id: 'resume-default-title' });

    await saveOnboardingProfile({
      selectedProfile: profile({ fullName: 'Default Title User' }),
      fallbackUserId: 'user-def',
      createStarterResume: true,
    });

    expect(appwriteMock.createDocument).toHaveBeenNthCalledWith(
      2,
      'test-db',
      COLLECTIONS.resumes,
      'unique-id',
      expect.objectContaining({
        title: 'My Resume',
      }),
    );
  });

  it('throws and does not report false success when resume creation fails', async () => {
    appwriteMock.createDocument
      .mockResolvedValueOnce({ $id: 'profile-doc' })
      .mockRejectedValueOnce(new Error('Appwrite DB network error'));

    await expect(
      saveOnboardingProfile({
        selectedProfile: profile({ fullName: 'Failing User' }),
        fallbackUserId: 'user-fail',
        createStarterResume: true,
      }),
    ).rejects.toThrow('Appwrite DB network error');
  });

  it('preserves existing UPLOAD behavior with content regardless of createStarterResume', async () => {
    appwriteMock.createDocument
      .mockResolvedValueOnce({ $id: 'profile-doc' })
      .mockResolvedValueOnce({ $id: 'resume-uploaded' });

    const result = await saveOnboardingProfile({
      selectedProfile: profile({
        fullName: 'Uploaded User',
        experience: [{ id: '1', company: 'Acme', title: 'Eng', startDate: '2020', endDate: '2023', current: false }],
      }),
      fallbackUserId: 'user-upload',
      // createStarterResume omitted (defaults to false)
    });

    expect(result).toEqual({ resumeId: 'resume-uploaded', hasResume: true });
    expect(appwriteMock.createDocument).toHaveBeenCalledTimes(2);
  });
});

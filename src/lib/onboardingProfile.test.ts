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
});

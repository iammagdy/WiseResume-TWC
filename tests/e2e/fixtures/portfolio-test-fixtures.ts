/**
 * E2E Test Fixtures — Public Portfolio Test Data
 *
 * This script creates test portfolios for E2E testing.
 * Run via: npx tsx tests/e2e/fixtures/portfolio-test-fixtures.ts
 *
 * Required environment variables (in .env.local or .env.test):
 *   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
 *   VITE_APPWRITE_PROJECT=your-project-id
 *   APPWRITE_API_KEY=your-server-api-key  (server-side only, never expose to browser)
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import crypto from 'crypto';

// ── Configuration ────────────────────────────────────────────────────────────

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = 'main';
const PROFILES_COLLECTION = 'profiles';
const RESUMES_COLLECTION = 'resumes';

// Test fixture credentials
export const TEST_FIXTURES = {
  public: {
    username: 'testportfolio',
    fullName: 'Test Portfolio User',
    jobTitle: 'Software Engineer',
  },
  protected: {
    username: 'testprotected',
    fullName: 'Protected Portfolio User',
    jobTitle: 'Product Manager',
    password: 'testpass123',
  },
  edgeCase: {
    username: 'testedgecase',
    fullName: 'Edge Case Portfolio',
    jobTitle: 'Developer with Unusual Data',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function createClient(): { client: Client; databases: Databases } {
  if (!PROJECT_ID || !API_KEY) {
    throw new Error(
      'Missing required environment variables: VITE_APPWRITE_PROJECT and APPWRITE_API_KEY'
    );
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const databases = new Databases(client);
  return { client, databases };
}

// ── Fixture Creators ─────────────────────────────────────────────────────────

async function createPublicPortfolioFixture(): Promise<void> {
  const { databases } = createClient();
  const fixture = TEST_FIXTURES.public;

  // Check if already exists
  const existing = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
    Query.equal('username', fixture.username),
    Query.limit(1),
  ]);

  if (existing.total > 0) {
    console.log(`✓ Public portfolio fixture already exists: ${fixture.username}`);
    return;
  }

  // Create test user profile
  const userId = ID.unique();
  const profile = await databases.createDocument(DATABASE_ID, PROFILES_COLLECTION, ID.unique(), {
    user_id: userId,
    username: fixture.username,
    full_name: fixture.fullName,
    job_title: fixture.jobTitle,
    portfolio_enabled: true,
    portfolio_style: 'modern',
    portfolio_accent_color: '#e84545',
    portfolio_font: 'inter',
    portfolio_bio: 'This is a test portfolio for E2E testing.',
    portfolio_extras: JSON.stringify({
      contactFormEnabled: true,
      highlights: [
        { id: '1', value: '5+ years', label: 'Experience' },
        { id: '2', value: '50+', label: 'Projects' },
      ],
    }),
    open_to_work: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Create associated resume
  await databases.createDocument(DATABASE_ID, RESUMES_COLLECTION, ID.unique(), {
    user_id: userId,
    title: 'Test Resume',
    summary: 'Experienced software engineer with expertise in full-stack development.',
    experience: JSON.stringify([
      {
        id: '1',
        position: 'Senior Developer',
        company: 'Test Company',
        startDate: '2020-01-01',
        endDate: null,
        current: true,
        description: 'Building amazing products.',
      },
    ]),
    education: JSON.stringify([
      {
        id: '1',
        institution: 'Test University',
        degree: 'Bachelor of Science in Computer Science',
        startDate: '2015-09-01',
        endDate: '2019-06-01',
      },
    ]),
    skills: JSON.stringify(['JavaScript', 'TypeScript', 'React', 'Node.js']),
    template: 'modern',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  console.log(`✓ Created public portfolio fixture: ${fixture.username} (profile: ${profile.$id})`);
}

async function createProtectedPortfolioFixture(): Promise<void> {
  const { databases } = createClient();
  const fixture = TEST_FIXTURES.protected;
  const passwordHash = sha256Hex(fixture.password);

  // Check if already exists
  const existing = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
    Query.equal('username', fixture.username),
    Query.limit(1),
  ]);

  if (existing.total > 0) {
    console.log(`✓ Protected portfolio fixture already exists: ${fixture.username}`);
    return;
  }

  // Create test user profile with password protection
  const userId = ID.unique();
  const profile = await databases.createDocument(DATABASE_ID, PROFILES_COLLECTION, ID.unique(), {
    user_id: userId,
    username: fixture.username,
    full_name: fixture.fullName,
    job_title: fixture.jobTitle,
    portfolio_enabled: true,
    portfolio_style: 'classic',
    portfolio_accent_color: '#6366f1',
    portfolio_font: 'space-grotesk',
    portfolio_bio: 'This is a password-protected test portfolio.',
    portfolio_extras: JSON.stringify({
      passwordEnabled: true,
      passwordHash: passwordHash,
      contactFormEnabled: false,
    }),
    open_to_work: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Create associated resume
  await databases.createDocument(DATABASE_ID, RESUMES_COLLECTION, ID.unique(), {
    user_id: userId,
    title: 'Protected Test Resume',
    summary: 'Product manager with 8 years of experience.',
    experience: JSON.stringify([
      {
        id: '1',
        position: 'Product Manager',
        company: 'Tech Corp',
        startDate: '2018-03-01',
        endDate: null,
        current: true,
        description: 'Leading product initiatives.',
      },
    ]),
    education: JSON.stringify([
      {
        id: '1',
        institution: 'Business School',
        degree: 'MBA',
        startDate: '2016-09-01',
        endDate: '2018-06-01',
      },
    ]),
    skills: JSON.stringify(['Product Strategy', 'Agile', 'Data Analysis']),
    template: 'classic',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  console.log(`✓ Created protected portfolio fixture: ${fixture.username} (password: ${fixture.password})`);
}

async function createEdgeCasePortfolioFixture(): Promise<void> {
  const { databases } = createClient();
  const fixture = TEST_FIXTURES.edgeCase;

  // Check if already exists
  const existing = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
    Query.equal('username', fixture.username),
    Query.limit(1),
  ]);

  if (existing.total > 0) {
    console.log(`✓ Edge case portfolio fixture already exists: ${fixture.username}`);
    return;
  }

  // Create test user profile with unusual/edge-case data
  const userId = ID.unique();
  const profile = await databases.createDocument(DATABASE_ID, PROFILES_COLLECTION, ID.unique(), {
    user_id: userId,
    username: fixture.username,
    full_name: fixture.fullName,
    job_title: null, // Edge case: null job title
    portfolio_enabled: true,
    portfolio_style: 'minimal',
    portfolio_accent_color: '#10b981',
    portfolio_font: 'serif',
    portfolio_bio: '', // Edge case: empty bio
    portfolio_extras: JSON.stringify({
      // Edge case: minimal extras
    }),
    open_to_work: true,
    availability_status: '🔥 Available immediately with special characters: ñ é ü',
    location: '', // Edge case: empty location
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Create associated resume with edge-case data
  await databases.createDocument(DATABASE_ID, RESUMES_COLLECTION, ID.unique(), {
    user_id: userId,
    title: '', // Edge case: empty title
    summary: null, // Edge case: null summary
    experience: JSON.stringify([]), // Edge case: empty array
    education: JSON.stringify(null), // Edge case: null (should normalize to [])
    skills: JSON.stringify([]), // Edge case: empty skills
    projects: JSON.stringify([]), // Edge case: empty projects
    certifications: null, // Edge case: null certifications
    template: 'minimal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  console.log(`✓ Created edge case portfolio fixture: ${fixture.username}`);
}

async function cleanupTestFixtures(): Promise<void> {
  const { databases } = createClient();

  const usernames = [
    TEST_FIXTURES.public.username,
    TEST_FIXTURES.protected.username,
    TEST_FIXTURES.edgeCase.username,
  ];

  for (const username of usernames) {
    try {
      const existing = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
        Query.equal('username', username),
        Query.limit(1),
      ]);

      if (existing.total > 0) {
        const profile = existing.documents[0];
        const userId = profile.user_id;

        // Delete associated resume(s)
        const resumes = await databases.listDocuments(DATABASE_ID, RESUMES_COLLECTION, [
          Query.equal('user_id', userId),
        ]);
        for (const resume of resumes.documents) {
          await databases.deleteDocument(DATABASE_ID, RESUMES_COLLECTION, resume.$id);
        }

        // Delete profile
        await databases.deleteDocument(DATABASE_ID, PROFILES_COLLECTION, profile.$id);
        console.log(`✓ Cleaned up fixture: ${username}`);
      }
    } catch (err) {
      console.error(`✗ Failed to cleanup ${username}:`, err);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    if (command === 'cleanup') {
      console.log('Cleaning up test fixtures...');
      await cleanupTestFixtures();
      console.log('Cleanup complete.');
    } else {
      console.log('Creating E2E test fixtures...');
      await createPublicPortfolioFixture();
      await createProtectedPortfolioFixture();
      await createEdgeCasePortfolioFixture();
      console.log('\nAll fixtures created successfully!');
      console.log('\nTest credentials:');
      console.log(`  Public portfolio:  /p/${TEST_FIXTURES.public.username}`);
      console.log(`  Protected portfolio: /p/${TEST_FIXTURES.protected.username} (password: ${TEST_FIXTURES.protected.password})`);
      console.log(`  Edge case portfolio: /p/${TEST_FIXTURES.edgeCase.username}`);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();

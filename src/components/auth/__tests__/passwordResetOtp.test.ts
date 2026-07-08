import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Declare mocks first so they can be referenced inside the mockSdk
const mockUpdateDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockListDocuments = vi.fn();
const mockListUsers = vi.fn();
const mockUpdatePassword = vi.fn();

const mockSdk = {
  Client: vi.fn().mockImplementation(function (this: any) {
    this.setEndpoint = vi.fn().mockReturnThis();
    this.setProject = vi.fn().mockReturnThis();
    this.setKey = vi.fn().mockReturnThis();
  }),
  Databases: vi.fn().mockImplementation(function (this: any) {
    this.listDocuments = mockListDocuments;
    this.createDocument = mockCreateDocument;
    this.updateDocument = mockUpdateDocument;
  }),
  Users: vi.fn().mockImplementation(function (this: any) {
    this.list = mockListUsers;
    this.updatePassword = mockUpdatePassword;
  }),
  Functions: vi.fn().mockImplementation(function (this: any) {
    this.createExecution = vi.fn().mockResolvedValue({
      status: 'completed',
      responseBody: JSON.stringify({ success: true }),
    });
  }),
  Query: {
    equal: (field: string, val: any) => `equal:${field}:${val}`,
    greaterThan: (field: string, val: any) => `greater:${field}:${val}`,
    orderDesc: (field: string) => `orderDesc:${field}`,
    limit: (n: number) => `limit:${n}`,
    isNull: (field: string) => `isNull:${field}`,
  },
  ID: {
    unique: () => 'unique-id',
  },
};

// Set in globalThis so the eval'd code can access it
(globalThis as any).mockSdk = mockSdk;

// Read and eval the main.js file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainJsPath = path.resolve(__dirname, '../../../../appwrite-hubs/email-service/src/main.js');
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// Replace node-appwrite require with globalThis.mockSdk
mainJsContent = mainJsContent.replace(
  "const sdk = require('node-appwrite');",
  "const sdk = globalThis.mockSdk;"
);

// Evaluate code by wrapping it in an IIFE/eval function
const cjsRequire = createRequire(import.meta.url);
const wrappedCode = `
  const module = { exports: {} };
  ${mainJsContent}
  globalThis.tempHandler = module.exports;
`;
new Function('require', wrappedCode)(cjsRequire);

const handler = (globalThis as any).tempHandler;

// Mock global fetch for Resend email sending
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ id: 'msg-123' }),
  text: async () => 'OK',
  status: 200,
});
globalThis.fetch = mockFetch;

describe('OTP Password Reset Backend Actions', () => {
  const mockRes = {
    json: vi.fn().mockImplementation((data, status) => ({ data, status })),
    send: vi.fn().mockImplementation((data) => ({ data })),
  };

  const mockLog = vi.fn();
  const mockError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APPWRITE_ENDPOINT = 'https://localhost/v1';
    process.env.APPWRITE_PROJECT_ID = 'test-proj';
    process.env.APPWRITE_API_KEY = 'test-key';
    process.env.PASSWORD_RESET_OTP_SECRET = 'super-secret-key';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.RESEND_API_KEY = 'mock-resend-key';
    
    // Default mock behaviors
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'msg-123' }),
      text: async () => 'OK',
      status: 200,
    });
  });

  afterEach(() => {
    delete process.env.PASSWORD_RESET_OTP_SECRET;
  });

  it('fails closed when PASSWORD_RESET_OTP_SECRET is missing', async () => {
    delete process.env.PASSWORD_RESET_OTP_SECRET;

    const req = {
      method: 'POST',
      body: {
        action: 'send-password-reset-otp',
        email: 'user@example.com',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.status).toBe(500);
    expect(res.data.error).toContain('Internal server configuration error');
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('PASSWORD_RESET_OTP_SECRET is not configured'));
  });

  it('returns success but silently exits without sending email if user does not exist', async () => {
    // Mock cooldown list returning empty
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    // Mock user list returning empty
    mockListUsers.mockResolvedValueOnce({ total: 0, users: [] });

    const req = {
      method: 'POST',
      body: {
        action: 'send-password-reset-otp',
        email: 'missing@example.com',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.status).not.toBe(500);
    expect(res.status).not.toBe(400);
    expect(res.data.success).toBe(true);
    // Ensure no email creation document was made
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it('enforces 60 seconds resend cooldown', async () => {
    // Mock recent OTP exists
    mockListDocuments.mockResolvedValueOnce({ total: 1, documents: [{ $id: 'existing-id' }] });

    const req = {
      method: 'POST',
      body: {
        action: 'send-password-reset-otp',
        email: 'user@example.com',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.status).toBe(429);
    expect(res.data.error).toContain('Please wait 60 seconds');
  });

  it('generates, hashes, stores, and sends OTP for existing user', async () => {
    // Cooldown check empty
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    // User exists check
    mockListUsers.mockResolvedValueOnce({ total: 1, users: [{ $id: 'user-123', email: 'user@example.com' }] });
    // Active OTPs search for revocation (empty)
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });

    const req = {
      method: 'POST',
      body: {
        action: 'send-password-reset-otp',
        email: 'user@example.com',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.data.success).toBe(true);
    
    // Check that OTP document was created
    expect(mockCreateDocument).toHaveBeenCalledTimes(1);
    const args = mockCreateDocument.mock.calls[0];
    expect(args[1]).toBe('password_reset_otps');
    expect(args[3].email).toBe('user@example.com');
    expect(args[3].otp_hash).toBeDefined();
    expect(args[3].used).toBe(false);
  });

  it('fails verification on invalid or expired code and increments attempts', async () => {
    const storedHash = crypto.createHmac('sha256', 'super-secret-key').update('123456').digest('hex');
    mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          $id: 'doc-123',
          email: 'user@example.com',
          otp_hash: storedHash,
          attempts: 0,
          max_attempts: 5,
        },
      ],
    });

    const req = {
      method: 'POST',
      body: {
        action: 'verify-password-reset-otp',
        email: 'user@example.com',
        otp: 'wrongcode',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid code.');
    // Check attempts incremented
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      'main',
      'password_reset_otps',
      'doc-123',
      expect.objectContaining({ attempts: 1 }),
    );
  });

  it('revokes OTP when max failed attempts limit is reached', async () => {
    const storedHash = crypto.createHmac('sha256', 'super-secret-key').update('123456').digest('hex');
    mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          $id: 'doc-123',
          email: 'user@example.com',
          otp_hash: storedHash,
          attempts: 4,
          max_attempts: 5,
        },
      ],
    });

    const req = {
      method: 'POST',
      body: {
        action: 'verify-password-reset-otp',
        email: 'user@example.com',
        otp: 'wrongcode',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.status).toBe(400);
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      'main',
      'password_reset_otps',
      'doc-123',
      expect.objectContaining({ revoked_at: expect.any(String) }),
    );
  });

  it('completes password reset and clears challenge hash when valid challenge is passed', async () => {
    const rawChallenge = 'raw-challenge-123-abc';
    const challengeHash = crypto.createHmac('sha256', 'super-secret-key').update(rawChallenge).digest('hex');

    mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          $id: 'doc-123',
          email: 'user@example.com',
          challenge_token_hash: challengeHash,
          used: false,
        },
      ],
    });

    mockListUsers.mockResolvedValueOnce({
      total: 1,
      users: [{ $id: 'user-123', name: 'Test User', email: 'user@example.com' }],
    });

    const req = {
      method: 'POST',
      body: {
        action: 'reset-password-with-otp',
        email: 'user@example.com',
        challengeToken: rawChallenge,
        password: 'new-secure-password-123',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.data.success).toBe(true);
    
    // Appwrite password update should have been called
    expect(mockUpdatePassword).toHaveBeenCalledWith('user-123', 'new-secure-password-123');

    // Challenge should be consumed
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      'main',
      'password_reset_otps',
      'doc-123',
      expect.objectContaining({
        used: true,
        challenge_token_hash: '',
      }),
    );
  });

  it('rejects old link password reset actions', async () => {
    const req = {
      method: 'POST',
      body: {
        action: 'send-password-reset',
        email: 'user@example.com',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('Link-based password reset is disabled');
  });

  it('sends OTP password reset email with correct Arabic locale attributes when locale="ar"', async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] }); // cooldown check
    mockListUsers.mockResolvedValueOnce({ total: 1, users: [{ $id: 'user-123', email: 'arabic@example.com' }] }); // user check
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] }); // active otps check

    const req = {
      method: 'POST',
      body: {
        action: 'send-password-reset-otp',
        email: 'arabic@example.com',
        locale: 'ar',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.data.success).toBe(true);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: expect.stringMatching(/"subject":"رمز التحقق لإعادة تعيين كلمة المرور"/),
      })
    );

    const callArgs = mockFetch.mock.calls[0][1];
    const parsedBody = JSON.parse(callArgs.body);
    expect(parsedBody.html).toContain('lang="ar"');
    expect(parsedBody.html).toContain('dir="rtl"');
    expect(parsedBody.html).toContain('WiseResume');
  });

  it('sends send-test password-reset preview using passwordResetOtpEmail preview code', async () => {
    process.env.DEVKIT_PASSWORD = 'test-devkit-pass';
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-devkit-pass',
      },
      body: {
        action: 'send-test',
        to: 'preview@example.com',
        template: 'password-reset',
        locale: 'ar',
      },
    };

    const res = await handler({ req, res: mockRes, log: mockLog, error: mockError } as any);
    expect(res.data.success).toBe(true);

    const callArgs = mockFetch.mock.calls[0][1];
    const parsedBody = JSON.parse(callArgs.body);
    expect(parsedBody.subject).toBe('[TEST] رمز التحقق لإعادة تعيين كلمة المرور');
    expect(parsedBody.html).toContain('482913');
    expect(parsedBody.html).toContain('lang="ar"');
    expect(parsedBody.html).toContain('dir="rtl"');
  });
});

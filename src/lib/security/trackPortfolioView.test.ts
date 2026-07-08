import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const mockGetDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockListDocuments = vi.fn();

vi.mock('node-appwrite', () => {
  return {
    Client: vi.fn().mockImplementation(function (this: any) {
      this.setEndpoint = vi.fn().mockReturnThis();
      this.setProject = vi.fn().mockReturnThis();
      this.setKey = vi.fn().mockReturnThis();
    }),
    Databases: vi.fn().mockImplementation(function (this: any) {
      this.getDocument = mockGetDocument;
      this.updateDocument = mockUpdateDocument;
      this.createDocument = mockCreateDocument;
      this.listDocuments = mockListDocuments;
    }),
    Query: {
      equal: (field: string, val: any) => `equal:${field}:${val}`,
      limit: (n: number) => `limit:${n}`,
    },
    ID: {
      unique: () => 'unique-id',
    },
    Permission: {
      read: () => 'read-perm',
      update: () => 'update-perm',
      delete: () => 'delete-perm',
    },
    Role: {
      user: (id: string) => `user:${id}`,
    },
  };
});

let handler: any;

beforeAll(async () => {
  process.env.APPWRITE_PROJECT_ID = 'test-proj';
  process.env.APPWRITE_API_KEY = 'test-key';
  const mod = await import('../../../api/track-portfolio-view');
  handler = mod.default;
});

function mockRequest(body: any): VercelRequest {
  return {
    method: 'POST',
    body,
    headers: {},
  } as VercelRequest;
}

function mockResponse() {
  const statusSpy = vi.fn();
  const endSpy = vi.fn();
  const jsonSpy = vi.fn();

  const res = {
    status: statusSpy.mockImplementation(() => res),
    end: endSpy.mockImplementation(() => res),
    json: jsonSpy.mockImplementation(() => res),
  } as unknown as VercelResponse;

  return { res, statusSpy, endSpy, jsonSpy };
}

describe('track-portfolio-view visit_end validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APPWRITE_PROJECT_ID = 'test-proj';
    process.env.APPWRITE_API_KEY = 'test-key';
  });

  it('updates successfully if username matches existing document', async () => {
    mockGetDocument.mockResolvedValue({
      $id: 'doc-123',
      username: 'john-doe',
    });

    const req = mockRequest({
      action: 'visit_end',
      visitDocId: 'doc-123',
      username: 'john-doe',
      time_spent_seconds: 15,
      sections_viewed: ['experience'],
    });

    const { res, statusSpy } = mockResponse();
    await handler(req, res);

    expect(mockGetDocument).toHaveBeenCalledWith('main', 'portfolio_visits', 'doc-123');
    expect(mockUpdateDocument).toHaveBeenCalledWith('main', 'portfolio_visits', 'doc-123', expect.objectContaining({
      time_spent_seconds: 15,
      sections_viewed: ['experience'],
    }));
    expect(statusSpy).toHaveBeenCalledWith(204);
  });

  it('fails with 400 if username does not match existing document', async () => {
    mockGetDocument.mockResolvedValue({
      $id: 'doc-123',
      username: 'different-user',
    });

    const req = mockRequest({
      action: 'visit_end',
      visitDocId: 'doc-123',
      username: 'john-doe',
      time_spent_seconds: 15,
    });

    const { res, statusSpy } = mockResponse();
    await handler(req, res);

    expect(mockGetDocument).toHaveBeenCalledWith('main', 'portfolio_visits', 'doc-123');
    expect(mockUpdateDocument).not.toHaveBeenCalled();
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('fails with 400 if visitDocId is forged or not found', async () => {
    mockGetDocument.mockRejectedValue(new Error('Document not found'));

    const req = mockRequest({
      action: 'visit_end',
      visitDocId: 'doc-forged',
      username: 'john-doe',
    });

    const { res, statusSpy } = mockResponse();
    await handler(req, res);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(mockUpdateDocument).not.toHaveBeenCalled();
  });

  it('fails with 400 if visitDocId is missing on visit_end', async () => {
    const req = mockRequest({
      action: 'visit_end',
      username: 'john-doe',
    });

    const { res, statusSpy } = mockResponse();
    await handler(req, res);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(mockGetDocument).not.toHaveBeenCalled();
    expect(mockUpdateDocument).not.toHaveBeenCalled();
  });
});

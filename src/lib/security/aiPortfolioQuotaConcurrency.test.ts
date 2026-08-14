import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const aiGateway = require('../../../appwrite-hubs/ai-gateway/src/main.js');

class AtomicCounterDb {
  private readonly documents = new Map<string, Record<string, unknown>>();

  private key(collectionId: string, documentId: string): string {
    return `${collectionId}/${documentId}`;
  }

  async getDocument(_databaseId: string, collectionId: string, documentId: string) {
    const document = this.documents.get(this.key(collectionId, documentId));
    if (!document) throw Object.assign(new Error('Document not found'), { code: 404 });
    return { ...document };
  }

  async createDocument(_databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>) {
    const key = this.key(collectionId, documentId);
    if (this.documents.has(key)) throw Object.assign(new Error('already exists'), { code: 409 });
    const document = { $id: documentId, ...data };
    this.documents.set(key, document);
    return { ...document };
  }

  async incrementDocumentAttribute(
    _databaseId: string,
    collectionId: string,
    documentId: string,
    attribute: string,
    value = 1,
    max?: number,
  ) {
    const key = this.key(collectionId, documentId);
    const document = this.documents.get(key);
    if (!document) throw Object.assign(new Error('Document not found'), { code: 404 });
    const current = Number(document[attribute] || 0);
    if (typeof max === 'number' && current + value > max) {
      throw Object.assign(new Error('increment exceeds maximum'), { code: 400 });
    }
    document[attribute] = current + value;
    return { ...document };
  }

  async decrementDocumentAttribute(
    _databaseId: string,
    collectionId: string,
    documentId: string,
    attribute: string,
    value = 1,
    min = 0,
  ) {
    const key = this.key(collectionId, documentId);
    const document = this.documents.get(key);
    if (!document) throw Object.assign(new Error('Document not found'), { code: 404 });
    document[attribute] = Math.max(min, Number(document[attribute] || 0) - value);
    return { ...document };
  }

  count(collectionId: string, documentId: string, attribute: string): number {
    return Number(this.documents.get(this.key(collectionId, documentId))?.[attribute] || 0);
  }
}

describe('public portfolio AI quota concurrency', () => {
  it('never admits more than ten simultaneous questions for one chat session', async () => {
    const db = new AtomicCounterDb();
    await db.createDocument('main', 'chat_sessions', 'session-concurrency-test', {
      question_count: 0,
    });
    const requests = Array.from({ length: 40 }, () =>
      aiGateway.__test.validatePortfolioSession(db, 'session-concurrency-test'),
    );

    const results = await Promise.all(requests);
    const admitted = results.filter((result: { ok: boolean }) => result.ok);

    expect(admitted).toHaveLength(10);
    expect(db.count('chat_sessions', 'session-concurrency-test', 'question_count')).toBe(10);
    expect(results.filter((result: { code?: string }) => result.code === 'session_limit_reached')).toHaveLength(30);
  });

  it('never admits more than the free-plan daily cap for one portfolio owner', async () => {
    const db = new AtomicCounterDb();
    const requests = Array.from({ length: 75 }, () =>
      aiGateway.__test.checkPortfolioDailyCap(db, 'owner-concurrency-test', 'free'),
    );

    const results = await Promise.all(requests);
    const admitted = results.filter((result: { ok: boolean }) => result.ok);

    expect(admitted).toHaveLength(50);
    const today = new Date().toISOString().slice(0, 10);
    expect(db.count('portfolio_daily_usage', `owner-concurrency-test:${today}`, 'question_count')).toBe(50);
    expect(results.filter((result: { code?: string }) => result.code === 'portfolio_daily_cap')).toHaveLength(25);
  });
});

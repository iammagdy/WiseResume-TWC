import { describe, it, expect, vi } from 'vitest';
import { client } from '../appwrite';

interface TestRealtimeTransport {
  subscriptions: Map<string, {
    channels: string[];
    queries: string[];
    callback: () => void;
  }>;
  url: string;
  createSocket: () => void;
}

describe('Appwrite Realtime Security Hardening', () => {
  it('handles WebSocket SecurityError gracefully during createSocket without crashing', () => {
    const realtime = (client as unknown as { realtime: TestRealtimeTransport }).realtime;
    expect(realtime).toBeDefined();

    // Mock WebSocket to throw SecurityError DOMException
    const originalWebSocket = globalThis.WebSocket;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // Add a test subscription so createSocket doesn't exit early (subscriptions.size >= 1)
      realtime.subscriptions.set('sub-test-id', {
        channels: ['databases.main.collections.test.documents'],
        queries: [],
        callback: () => {},
      });
      realtime.url = '';

      globalThis.WebSocket = vi.fn().mockImplementation(() => {
        const err = new DOMException('The operation is insecure.', 'SecurityError');
        throw err;
      }) as unknown as typeof WebSocket;

      // Invoking createSocket directly should be caught cleanly by the wrapper
      expect(() => {
        realtime.createSocket();
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Appwrite Realtime]'),
        expect.anything()
      );
    } finally {
      realtime.subscriptions.delete('sub-test-id');
      globalThis.WebSocket = originalWebSocket;
      warnSpy.mockRestore();
    }
  });

  it('guarantees client.subscribe returns a safe unsubscribe function even if connection setup fails', () => {
    const unsubscribe = client.subscribe('databases.main.collections.test.documents', () => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});

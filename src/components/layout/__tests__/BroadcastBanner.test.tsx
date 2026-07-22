import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listDocuments } = vi.hoisted(() => ({
  listDocuments: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => ({
  databases: { listDocuments },
  DATABASE_ID: 'main',
  Query: {
    equal: vi.fn(() => 'active'),
    select: vi.fn(() => 'fields'),
    limit: vi.fn(() => 'limit'),
  },
}));

vi.mock('@/lib/appwrite-collections', () => ({
  COLLECTIONS: { broadcasts: 'broadcasts' },
}));

import { shouldLoadBroadcasts } from '@/lib/broadcastPolicy';
import { BroadcastBanner } from '../BroadcastBanner';

describe('BroadcastBanner gating', () => {
  beforeEach(() => {
    listDocuments.mockReset();
    listDocuments.mockResolvedValue({ documents: [] });
  });

  it('does not query on public standalone routes', async () => {
    render(<BroadcastBanner enabled={false} />);

    await Promise.resolve();
    expect(listDocuments).not.toHaveBeenCalled();
    expect(shouldLoadBroadcasts({
      isPublicStandalone: true,
      authReady: true,
      userId: 'user-1',
    })).toBe(false);
  });

  it('waits for authentication readiness', () => {
    expect(shouldLoadBroadcasts({
      isPublicStandalone: false,
      authReady: false,
      userId: 'user-1',
    })).toBe(false);
    expect(shouldLoadBroadcasts({
      isPublicStandalone: false,
      authReady: true,
      userId: null,
    })).toBe(false);
  });

  it('loads broadcasts for an authenticated workspace', async () => {
    render(<BroadcastBanner enabled />);

    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(1));
    expect(shouldLoadBroadcasts({
      isPublicStandalone: false,
      authReady: true,
      userId: 'user-1',
    })).toBe(true);
  });
});

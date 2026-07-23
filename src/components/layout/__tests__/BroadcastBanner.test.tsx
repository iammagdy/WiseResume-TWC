import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createJWT } = vi.hoisted(() => ({
  createJWT: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => ({
  account: { createJWT },
}));

import { shouldLoadBroadcasts } from '@/lib/broadcastPolicy';
import { BroadcastBanner } from '../BroadcastBanner';

describe('BroadcastBanner gating', () => {
  beforeEach(() => {
    createJWT.mockReset();
    createJWT.mockResolvedValue({ jwt: 'test-jwt' });
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ broadcasts: [] }),
    }));
  });

  it('does not request a JWT or broadcasts on public standalone routes', async () => {
    render(<BroadcastBanner enabled={false} />);

    await Promise.resolve();
    expect(createJWT).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
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

  it('loads sanitized broadcasts for an authenticated workspace', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        broadcasts: [{
          id: 'broadcast-1',
          title: 'Scheduled update',
          body: 'Maintenance begins tonight.',
          severity: 'warning',
        }],
      }),
    } as Response);

    render(<BroadcastBanner enabled />);

    expect(await screen.findByText('Scheduled update')).toBeInTheDocument();
    expect(createJWT).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/broadcasts', expect.objectContaining({
      credentials: 'same-origin',
      headers: expect.objectContaining({
        'X-Appwrite-JWT': 'test-jwt',
      }),
    }));
  });

  it('dismisses a broadcast for the current browser session', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        broadcasts: [{
          id: 'broadcast-1',
          title: 'Scheduled update',
          body: 'Maintenance begins tonight.',
          severity: 'info',
        }],
      }),
    } as Response);

    render(<BroadcastBanner enabled />);
    expect(await screen.findByText('Scheduled update')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Scheduled update')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('wiseresume_dismissed_broadcasts')).toContain('broadcast-1');
  });

  it('clears authenticated broadcast state on logout', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        broadcasts: [{
          id: 'broadcast-1',
          title: 'Authenticated only',
          body: 'Workspace message.',
          severity: 'info',
        }],
      }),
    } as Response);

    const { rerender } = render(<BroadcastBanner enabled />);
    expect(await screen.findByText('Authenticated only')).toBeInTheDocument();

    rerender(<BroadcastBanner enabled={false} />);
    await waitFor(() => expect(screen.queryByText('Authenticated only')).not.toBeInTheDocument());
  });
});

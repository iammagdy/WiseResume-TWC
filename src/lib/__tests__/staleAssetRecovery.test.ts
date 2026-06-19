import {
  STALE_ASSET_RELOAD_GUARD_KEY,
  attemptStaleAssetRecovery,
  clearStaleAssetRecoveryGuard,
  isStaleAssetError,
} from '../staleAssetRecovery';

describe('staleAssetRecovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('identifies dynamic import and CSS preload failures', () => {
    expect(
      isStaleAssetError(
        new Error('Failed to fetch dynamically imported module'),
      ),
    ).toBe(true);
    expect(isStaleAssetError(new Error('Unable to preload CSS for /assets/app.css'))).toBe(true);
    expect(isStaleAssetError(Object.assign(new Error('load failed'), { name: 'ChunkLoadError' }))).toBe(true);
    expect(isStaleAssetError(new Error('ordinary render failure'))).toBe(false);
  });

  it('reloads once per stale asset failure session', () => {
    const reload = vi.fn();
    const error = new Error('Loading chunk 42 failed');

    expect(attemptStaleAssetRecovery(error, { reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(STALE_ASSET_RELOAD_GUARD_KEY)).toBeTruthy();

    expect(attemptStaleAssetRecovery(error, { reload })).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears the reload guard after a healthy boot', () => {
    sessionStorage.setItem(STALE_ASSET_RELOAD_GUARD_KEY, '1');

    clearStaleAssetRecoveryGuard();

    expect(sessionStorage.getItem(STALE_ASSET_RELOAD_GUARD_KEY)).toBeNull();
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildResumeShareUrl, shareResumeLink } from '@/lib/shareUtils';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const shareCallSiteSources = [
  'src/components/editor/ExportOptionsSheet.tsx',
  'src/components/editor/ShareSheet.tsx',
  'src/pages/EditorPage.tsx',
  'src/pages/PreviewPage.tsx',
].map(readSource);

describe('public resume share links', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
  });

  it('builds the registered public route from the persisted share token', () => {
    expect(buildResumeShareUrl('token/with spaces')).toBe(
      `${window.location.origin}/share/token%2Fwith%20spaces`,
    );

    const appRoutes = readSource('src/AppInterior.tsx');
    expect(appRoutes).toContain('path="/share/:token"');
  });

  it('passes the public token URL to the native share sheet', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: nativeShare,
    });

    await shareResumeLink('public-token');

    expect(nativeShare).toHaveBeenCalledWith({
      title: 'My Resume',
      url: `${window.location.origin}/share/public-token`,
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the public token URL when native sharing is unavailable', async () => {
    await shareResumeLink('public-token');

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/share/public-token`,
    );
  });

  it('keeps every editor and preview share entry point off the protected preview route', () => {
    for (const source of shareCallSiteSources) {
      expect(source).not.toContain('/preview?shared');
      expect(source).not.toContain('shareAsLink');
    }

    const editorSource = readSource('src/pages/EditorPage.tsx');
    const previewSource = readSource('src/pages/PreviewPage.tsx');
    const shareSheetSource = readSource('src/components/editor/ShareSheet.tsx');

    for (const source of [editorSource, previewSource, shareSheetSource]) {
      expect(source).toContain('useResumeShareMutations');
      expect(source).toContain('createResumeShare.mutateAsync');
      expect(source).toContain('shareResumeLink(share.token)');
    }
  });
});

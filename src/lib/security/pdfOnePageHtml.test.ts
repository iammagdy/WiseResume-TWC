import { describe, expect, it } from 'vitest';
import { buildSegmentHtml } from '../../../api/export/pdf-native';

describe('one-page PDF HTML', () => {
  it('uses a standard page and scales the complete source from the top', () => {
    const html = buildSegmentHtml({
      sourceHtml: '<!doctype html><html><head><style>.resume{height:1496px}</style></head><body><main class="resume">Complete resume</main></body></html>',
      pageWidthPx: 612,
      contentStartPx: 0,
      contentHeightPx: 748,
      footerHeightPx: 44,
      pageNumber: 'Page 1 of 1',
      showBranding: false,
      sourceScale: 0.5,
      locale: 'en',
    });

    expect(html).toContain('@page { size: 612pt 792pt; margin: 0; }');
    expect(html).toContain('top: -0px;');
    expect(html).toContain('transform: scale(0.5);');
    expect(html).toContain('Complete resume');
    expect(html).toContain('Page 1 of 1');
  });
});

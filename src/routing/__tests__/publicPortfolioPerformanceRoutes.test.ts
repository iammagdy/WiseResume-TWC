import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const mainSource = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
const chatSource = readFileSync(resolve(process.cwd(), 'src/components/portfolio/public/ChatWidget.tsx'), 'utf8');
const pageSource = readFileSync(resolve(process.cwd(), 'src/pages/PublicPortfolioPage.tsx'), 'utf8');
const heroSource = readFileSync(resolve(process.cwd(), 'src/components/portfolio/public/PublicHero.tsx'), 'utf8');
const stickySource = readFileSync(resolve(process.cwd(), 'src/components/portfolio/public/StickyHeader.tsx'), 'utf8');

describe('public portfolio performance contracts', () => {
  it.each(['/p/:username', '/ar/p/:username'])('routes %s before the AppInterior wildcard', (path) => {
    const routeAt = appSource.indexOf(`path="${path}"`);
    const wildcardAt = appSource.indexOf('path="*"');
    expect(routeAt).toBeGreaterThan(0);
    expect(routeAt).toBeLessThan(wildcardAt);
  });

  it('starts the existing public queries in the route shell while the page chunk loads', () => {
    expect(appSource).toContain('usePortfolioGate(username)');
    expect(appSource).toContain('usePublicPortfolio(username, !gateInfo?.passwordEnabled)');
  });

  it('keeps monitoring and optional portfolio modules out of the hero window', () => {
    expect(mainSource).toContain('isPublicPortfolioRoute');
    expect(mainSource).toContain('setTimeout(loadMonitoring, 10000)');
    expect(pageSource).toContain('setDeferredContentReady(true), 1000');
    expect(pageSource).toContain('deferredContentReady && profile.contactFormEnabled');
    expect(pageSource).toContain('deferredContentReady && (');
  });

  it('does not require Framer before the public hero renders', () => {
    expect(pageSource).not.toContain("from 'framer-motion'");
    expect(heroSource).not.toContain("from 'framer-motion'");
  });

  it('keeps the floating chat launcher geometry fixed when its hint appears', () => {
    expect(chatSource).toContain('z-[60] h-14 w-14');
    expect(chatSource).toContain('absolute bottom-0 right-[calc(100%+0.625rem)]');
  });

  it('does not request the sticky avatar until the header is visible', () => {
    expect(stickySource).toContain('visible && avatarSources');
    expect(stickySource).toContain('fetchPriority="low"');
  });
});

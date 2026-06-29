import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const landingSource = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');
const interiorSource = readFileSync(resolve(process.cwd(), 'src/AppInterior.tsx'), 'utf8');

describe('public landing route contract', () => {
  it.each(['/', '/enterprises', '/ar', '/ar/enterprises'])('keeps %s on the public landing app', (path) => {
    expect(appSource).toContain(`<Route path="${path}" element={<AppLanding />} />`);
  });

  it('mounts locale direction and account preference synchronization at the app shell', () => {
    expect(appSource).toContain('<LocaleProvider>');
    expect(appSource).toContain('<LocaleAccountSync />');
  });

  it('does not force authenticated users into the WiseHire dashboard', () => {
    expect(landingSource).not.toMatch(/navigate\(\s*['"]\/wisehire\/dashboard['"]/);
    expect(landingSource).not.toContain('useAccountType');
  });

  it.each([
    '/ar/pricing',
    '/ar/whats-new',
    '/ar/waitlist',
    '/ar/enterprise',
    '/ar/privacy-policy',
    '/ar/terms-of-service',
    '/ar/guides',
    '/ar/guides/:slug',
    '/ar/examples',
    '/ar/p/:username',
    '/ar/share/:token',
    '/ar/share/brief/:shareToken',
    '/ar/share/scorecard/:shareToken',
    '/ar/interview/report/:token',
    '/ar/l/:linkId',
  ])('defines the Arabic public route %s', (path) => {
    expect(interiorSource).toContain(`<Route path="${path}"`);
  });

  it('recognizes the Arabic enterprise landing URL', () => {
    expect(landingSource).toContain("window.location.pathname === '/ar/enterprises'");
  });
});

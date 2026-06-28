import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const landingSource = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');

describe('public landing route contract', () => {
  it.each(['/', '/enterprises'])('keeps %s on the public landing app', (path) => {
    expect(appSource).toContain(`<Route path="${path}" element={<AppLanding />} />`);
  });

  it('does not force authenticated users into the WiseHire dashboard', () => {
    expect(landingSource).not.toMatch(/navigate\(\s*['"]\/wisehire\/dashboard['"]/);
    expect(landingSource).not.toContain('useAccountType');
  });
});

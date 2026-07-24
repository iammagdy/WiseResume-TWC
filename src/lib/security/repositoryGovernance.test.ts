import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('public repository security governance', () => {
  it('publishes a private-first vulnerability reporting policy', () => {
    const policy = readFileSync('SECURITY.md', 'utf8');
    expect(policy).toContain('Private Vulnerability Reporting');
    expect(policy).toContain('Never submit a real CV');
    expect(policy).not.toMatch(/mailto:/i);
  });

  it('assigns security-sensitive paths to the repository owner', () => {
    const owners = readFileSync('.github/CODEOWNERS', 'utf8');
    for (const path of ['/appwrite-hubs/', '/api/', '/appwrite.json', '/package-lock.json']) {
      expect(owners).toContain(path);
    }
    expect(owners).toContain('@iammagdy');
  });

  it('configures conservative npm and GitHub Actions updates', () => {
    const dependabot = readFileSync('.github/dependabot.yml', 'utf8');
    expect(dependabot).toContain('package-ecosystem: npm');
    expect(dependabot).toContain('package-ecosystem: github-actions');
    expect(dependabot.match(/interval: weekly/g)).toHaveLength(2);
  });

  it('keeps the removed diagnostics endpoint unavailable', () => {
    expect(existsSync('api/admin-diagnostics.ts')).toBe(false);
  });
});

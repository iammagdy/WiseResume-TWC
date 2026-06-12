import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const wisehireGateway = require('../../../appwrite-hubs/wisehire-gateway/src/main.js') as {
  _test: {
    canAccessWiseHireDocument: (doc: Record<string, unknown> | null, access: Record<string, unknown>) => boolean;
    hasRequiredWiseHireRole: (role: string, requiredRoles: string[]) => boolean;
  };
};

describe('wisehire-gateway authorization helpers', () => {
  it('allows own owner-scoped records only', () => {
    const access = { userId: 'u_1', ownerId: 'u_1', companyId: 'co_1' };
    expect(wisehireGateway._test.canAccessWiseHireDocument({ owner_id: 'u_1' }, access)).toBe(true);
    expect(wisehireGateway._test.canAccessWiseHireDocument({ company_id: 'co_1' }, access)).toBe(true);
    expect(wisehireGateway._test.canAccessWiseHireDocument({ owner_id: 'u_2', company_id: 'co_2' }, access)).toBe(false);
    expect(wisehireGateway._test.canAccessWiseHireDocument(null, access)).toBe(false);
  });

  it('allows member access only through matching company scope', () => {
    const access = { userId: 'recruiter_1', ownerId: 'owner_1', companyId: 'co_1' };
    expect(wisehireGateway._test.canAccessWiseHireDocument({ owner_id: 'owner_1' }, access)).toBe(true);
    expect(wisehireGateway._test.canAccessWiseHireDocument({ owner_id: 'owner_2', company_id: 'co_1' }, access)).toBe(true);
    expect(wisehireGateway._test.canAccessWiseHireDocument({ owner_id: 'owner_2', company_id: 'co_2' }, access)).toBe(false);
  });

  it('treats owner/admin as privileged and rejects unrelated roles', () => {
    expect(wisehireGateway._test.hasRequiredWiseHireRole('owner', ['recruiter'])).toBe(true);
    expect(wisehireGateway._test.hasRequiredWiseHireRole('admin', ['recruiter'])).toBe(true);
    expect(wisehireGateway._test.hasRequiredWiseHireRole('recruiter', ['recruiter'])).toBe(true);
    expect(wisehireGateway._test.hasRequiredWiseHireRole('viewer', ['recruiter'])).toBe(false);
  });
});

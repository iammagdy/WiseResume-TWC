import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeWisehireAccess } = vi.hoisted(() => ({ invokeWisehireAccess: vi.fn() }));

vi.mock('@/lib/wisehire/wisehireAccessClient', () => ({ invokeWisehireAccess }));

import {
  clearWiseHireInviteIntent,
  clearWiseHireSignupRedirect,
  getRememberedWiseHireInvite,
  getRememberedWiseHireSignupRedirect,
  rememberWiseHireInvite,
  rememberWiseHireSignupRedirect,
  validateEarlyAccessCode,
} from './inviteTokenClient';

describe('WiseHire invitation intent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    invokeWisehireAccess.mockReset();
  });

  it('retains a case-sensitive token across tabs and clears it explicitly', () => {
    rememberWiseHireInvite('AbC_sensitive-token_123', '2099-01-01T00:00:00.000Z');
    expect(getRememberedWiseHireInvite()).toBe('AbC_sensitive-token_123');
    clearWiseHireInviteIntent();
    expect(getRememberedWiseHireInvite()).toBe('');
  });

  it('rejects an expired stored invitation', () => {
    localStorage.setItem('wh_invite_token', JSON.stringify({
      token: 'expired-token',
      expiresAt: Date.now() - 1,
    }));
    expect(getRememberedWiseHireInvite()).toBe('');
    expect(localStorage.getItem('wh_invite_token')).toBeNull();
  });

  it('stores only safe internal post-verification redirects', () => {
    rememberWiseHireSignupRedirect('//attacker.example/path');
    expect(getRememberedWiseHireSignupRedirect('/dashboard')).toBe('/wisehire/signup');
    clearWiseHireSignupRedirect();
    expect(getRememberedWiseHireSignupRedirect('/dashboard')).toBe('/dashboard');
  });

  it('uses the server invitation validator for legacy early-access codes', async () => {
    invokeWisehireAccess.mockResolvedValue({
      data: {
        valid: true,
        recipient_email: 'recruiter@example.com',
        expires_at: '2099-01-01T00:00:00.000Z',
      },
      error: null,
    });

    await expect(validateEarlyAccessCode('MiXeD-Code')).resolves.toEqual({
      valid: true,
      recipient_email: 'recruiter@example.com',
      expires_at: '2099-01-01T00:00:00.000Z',
    });
    expect(invokeWisehireAccess).toHaveBeenCalledWith('validate-invite', { token: 'MiXeD-Code' });
  });
});

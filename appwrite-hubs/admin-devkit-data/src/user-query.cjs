'use strict';

const SORTS = new Set(['joined_desc', 'joined_asc', 'active_desc', 'active_asc']);

function normalizeUserQuery(body = {}) {
  const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
  return {
    page: Math.max(0, Number(body.page) || 0),
    pageSize: Math.min(100, Math.max(1, Number(body.pageSize || body.per_page) || 50)),
    search: String(body.search || body.query || '').trim().toLowerCase(),
    sort: SORTS.has(body.sort) ? body.sort : 'joined_desc',
    filters: {
      ...(filters.verification ? { verification: filters.verification } : {}),
      ...(filters.profile ? { profile: filters.profile } : {}),
      ...(filters.resume ? { resume: filters.resume } : {}),
      ...(filters.plan ? { plan: filters.plan } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.accountType ? { accountType: filters.accountType } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    },
  };
}

function filterAndSortUsers(users, query, enrich = new Map()) {
  const { search, filters, sort } = query;
  const filtered = (users || []).filter(user => {
    const joined = user.$createdAt || '';
    const extra = enrich.get(user.$id) || {};
    if (search && ![user.email, user.name, user.$id].some(value => String(value || '').toLowerCase().includes(search))) return false;
    if (filters.verification === 'verified' && !user.emailVerification) return false;
    if (filters.verification === 'unverified' && user.emailVerification) return false;
    if (filters.profile === 'missing' && extra.profile) return false;
    if (filters.profile === 'present' && !extra.profile) return false;
    if (filters.resume === 'missing' && (extra.resumeCount || 0) > 0) return false;
    if (filters.resume === 'present' && (extra.resumeCount || 0) === 0) return false;
    if (filters.plan && extra.plan !== filters.plan) return false;
    if (filters.status === 'suspended' && !extra.isSuspended) return false;
    if (filters.accountType && extra.accountType !== filters.accountType) return false;
    if (filters.from && joined < filters.from) return false;
    if (filters.to && joined >= filters.to) return false;
    return true;
  });
  const ascending = sort.endsWith('_asc');
  const active = sort.startsWith('active');
  return filtered.sort((a, b) => {
    const extraA = enrich.get(a.$id) || {};
    const extraB = enrich.get(b.$id) || {};
    const av = active ? (extraA.lastActive || '') : (a.$createdAt || '');
    const bv = active ? (extraB.lastActive || '') : (b.$createdAt || '');
    return (ascending ? 1 : -1) * av.localeCompare(bv);
  });
}

module.exports = { normalizeUserQuery, filterAndSortUsers };

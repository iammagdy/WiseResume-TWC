const REDACTED_VALUE = '[REDACTED]';

type ParameterTransformMode = 'redact' | 'remove';

function decodeParameterName(name: string): string {
  try {
    return decodeURIComponent(name.replace(/\+/g, ' '));
  } catch {
    return name;
  }
}
function normalizeParameterName(name: string): string {
  return decodeParameterName(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Recovery, verification, and OAuth credentials must never reach client logs.
 * Normalising punctuation/case covers common spellings such as
 * challengeToken, challenge_token, access-token, oauth_state, and authCode.
 */
export function isSensitiveUrlParameterName(name: string): boolean {
  const normalized = normalizeParameterName(name);
  if (!normalized) return false;
  return (
    normalized === 'secret' ||
    normalized.endsWith('secret') ||
    normalized === 'token' ||
    normalized.endsWith('token') ||
    normalized === 'code' ||
    normalized.endsWith('code') ||
    normalized === 'state' ||
    normalized.endsWith('state')
  );
}

function additionalNameSet(names: readonly string[]): Set<string> {
  return new Set(names.map(normalizeParameterName).filter(Boolean));
}

function shouldTransformParameter(name: string, additionalNames: Set<string>): boolean {
  return isSensitiveUrlParameterName(name) || additionalNames.has(normalizeParameterName(name));
}

function transformParameterString(
  raw: string,
  mode: ParameterTransformMode,
  additionalNames: Set<string>,
): string {
  const params = new URLSearchParams(raw);
  const keys = [...new Set(params.keys())];
  let changed = false;

  for (const key of keys) {
    if (!shouldTransformParameter(key, additionalNames)) continue;
    changed = true;
    if (mode === 'remove') {
      params.delete(key);
      continue;
    }

    const occurrences = Math.max(1, params.getAll(key).length);
    params.delete(key);
    for (let index = 0; index < occurrences; index += 1) {
      params.append(key, REDACTED_VALUE);
    }
  }

  return changed ? params.toString() : raw;
}

function containsSensitiveAssignment(value: string, additionalNames: Set<string>): boolean {
  const assignment = /(?:^|[?&])([^=&#]+)=/g;
  let match: RegExpExecArray | null;
  while ((match = assignment.exec(value)) !== null) {
    if (shouldTransformParameter(match[1], additionalNames)) return true;
  }
  return false;
}

function transformHash(
  rawHash: string,
  mode: ParameterTransformMode,
  additionalNames: Set<string>,
): string {
  if (!rawHash) return '';

  const queryIndex = rawHash.indexOf('?');
  if (queryIndex >= 0) {
    const prefix = rawHash.slice(0, queryIndex);
    const transformed = transformParameterString(rawHash.slice(queryIndex + 1), mode, additionalNames);
    return transformed ? `${prefix}?${transformed}` : prefix;
  }

  if (containsSensitiveAssignment(rawHash, additionalNames)) {
    return transformParameterString(rawHash, mode, additionalNames);
  }

  return rawHash;
}

function transformUrlLike(
  rawValue: string,
  mode: ParameterTransformMode,
  additionalNames: readonly string[] = [],
): string {
  if (!rawValue) return rawValue;
  const names = additionalNameSet(additionalNames);
  const hashIndex = rawValue.indexOf('#');
  const beforeHash = hashIndex >= 0 ? rawValue.slice(0, hashIndex) : rawValue;
  const hash = hashIndex >= 0 ? rawValue.slice(hashIndex + 1) : '';

  const queryIndex = beforeHash.indexOf('?');
  let transformedBeforeHash = beforeHash;
  if (queryIndex >= 0) {
    const prefix = beforeHash.slice(0, queryIndex);
    const transformed = transformParameterString(beforeHash.slice(queryIndex + 1), mode, names);
    transformedBeforeHash = transformed ? `${prefix}?${transformed}` : prefix;
  }

  if (hashIndex < 0) return transformedBeforeHash;
  const transformedHash = transformHash(hash, mode, names);
  return transformedHash ? `${transformedBeforeHash}#${transformedHash}` : transformedBeforeHash;
}

/** Redact credential-bearing query/hash values while retaining diagnostic shape. */
export function sanitizeSensitiveUrl(value: string): string {
  return transformUrlLike(value, 'redact');
}

/** Remove credential-bearing parameters, used when replacing the browser address. */
export function removeSensitiveUrlParameters(
  value: string,
  additionalNames: readonly string[] = [],
): string {
  return transformUrlLike(value, 'remove', additionalNames);
}

/**
 * Redact URL-style parameter assignments embedded in error messages or stacks.
 * This intentionally targets name=value syntax rather than arbitrary prose.
 */
export function sanitizeSensitiveText(value: string): string {
  if (!value) return value;
  return value.replace(
    /(^|[?&#\s"'(,;])([^=?&#\s"'(),;]+)=([^&#\s"'<>]*)/g,
    (match, delimiter: string, rawName: string) => {
      if (!isSensitiveUrlParameterName(rawName)) return match;
      return `${delimiter}${rawName}=${REDACTED_VALUE}`;
    },
  );
}

export function sanitizeErrorForClientLogging(error: Error): Error {
  const sanitized = new Error(sanitizeSensitiveText(error.message));
  sanitized.name = error.name;
  if (error.stack) sanitized.stack = sanitizeSensitiveText(error.stack);
  return sanitized;
}

export function sanitizeUnknownForClientLogging(value: unknown): unknown {
  if (value instanceof Error) return sanitizeErrorForClientLogging(value);
  return typeof value === 'string' ? sanitizeSensitiveText(value) : value;
}

export function getSanitizedCurrentClientRoute(): string {
  if (typeof window === 'undefined') return '/';
  return sanitizeSensitiveUrl(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Storage keys contain only a hash of an already-sanitized crash signature. */
export function buildSanitizedCrashDedupeKey(
  errorName: string,
  errorMessage: string,
  route: string,
): string {
  const signature = [
    sanitizeSensitiveText(errorName),
    sanitizeSensitiveText(errorMessage),
    sanitizeSensitiveUrl(route),
  ].join('|');
  return `wr-crash-auto:${stableHash(signature)}`;
}

/**
 * Replace the current history entry without navigation, retaining router state.
 * Additional names let recovery pages remove paired identifiers such as userId/email.
 */
export function removeSensitiveParamsFromCurrentAddressBar(
  additionalNames: readonly string[] = [],
): boolean {
  if (typeof window === 'undefined') return false;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const cleaned = removeSensitiveUrlParameters(current, additionalNames);
  if (cleaned === current) return false;
  window.history.replaceState(window.history.state, '', cleaned || window.location.pathname || '/');
  return true;
}

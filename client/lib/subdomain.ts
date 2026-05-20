/**
 * Subdomain-based routing utilities for MUCHI dashboards.
 *
 * Subdomain → Portal mapping:
 *   admin.muchiapp.com   → School Admin Portal
 *   teacher.muchiapp.com → Teacher Portal
 *   student.muchiapp.com → Student Portal
 *   gov.muchiapp.com     → Government Portal
 *   system.muchiapp.com  → System Admin Portal
 */

export const KNOWN_SUBDOMAINS = ['admin', 'teacher', 'student', 'gov', 'system'] as const;
export type KnownSubdomain = typeof KNOWN_SUBDOMAINS[number];

/** Roles that belong to each subdomain */
export const SUBDOMAIN_ROLE_MAP: Record<KnownSubdomain, string[]> = {
  admin: [
    'school_admin',
    'bursar',
    'registrar',
    'exam_officer',
    'academic_auditor',
    'accounts',
    'content_manager',
  ],
  teacher: ['teacher'],
  student: ['student'],
  gov: ['government'],
  system: ['system_admin'],
};

/** Which subdomain a given role should land on after login */
export const ROLE_SUBDOMAIN_MAP: Record<string, KnownSubdomain> = {
  school_admin: 'admin',
  bursar: 'admin',
  registrar: 'admin',
  exam_officer: 'admin',
  academic_auditor: 'admin',
  accounts: 'admin',
  content_manager: 'admin',
  teacher: 'teacher',
  student: 'student',
  government: 'gov',
  system_admin: 'system',
};

/**
 * Returns the active subdomain from the current hostname, or null if on
 * the root domain / localhost without a subdomain prefix.
 *
 * Supports:
 *   - admin.muchiapp.com  → "admin"
 *   - admin.localhost     → "admin"
 *   - localhost / 127.x   → null
 *   - muchiapp.com / www  → null
 */
export function getSubdomain(): KnownSubdomain | null {
  const hostname = window.location.hostname;

  // IP address — no subdomain
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) return null;

  const parts = hostname.split('.');

  let candidate: string | null = null;

  if (parts.length === 1) {
    // Plain "localhost" — no subdomain
    candidate = null;
  } else if (parts.length === 2 && parts[1] === 'localhost') {
    // e.g. "admin.localhost"
    candidate = parts[0];
  } else if (parts.length >= 3) {
    // e.g. "admin.muchiapp.com"
    const sub = parts[0].toLowerCase();
    candidate = sub === 'www' ? null : sub;
  }

  if (candidate && (KNOWN_SUBDOMAINS as readonly string[]).includes(candidate)) {
    return candidate as KnownSubdomain;
  }

  return null;
}

/**
 * Builds a full URL for a given subdomain and optional path, using
 * VITE_APP_URL as the base domain.
 *
 * e.g. getSubdomainUrl('admin') → "https://admin.muchiapp.com"
 *      getSubdomainUrl('admin', '/data-audit') → "https://admin.muchiapp.com/data-audit"
 */
export function getSubdomainUrl(subdomain: KnownSubdomain, path: string = ''): string {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  try {
    const url = new URL(appUrl);

    // Strip leading "www." if present
    let hostname = url.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Handle localhost — use port from the current page
    if (hostname === 'localhost') {
      url.hostname = `${subdomain}.localhost`;
      url.pathname = path;
      return url.toString();
    }

    url.hostname = `${subdomain}.${hostname}`;
    url.pathname = path;
    return url.toString();
  } catch {
    // Fallback to relative path (works on root domain in dev)
    return path || '/';
  }
}

/**
 * Returns the subdomain URL for a given user role, used after login to
 * redirect to the correct dashboard.
 */
export function getRoleSubdomainUrl(role: string, userId?: string): string {
  const sub = ROLE_SUBDOMAIN_MAP[role];

  if (!sub) return '/';

  // Student URL includes the user ID
  if (sub === 'student' && userId) {
    // On the student subdomain there's no :id in the path — session resolves it
    return getSubdomainUrl('student');
  }

  return getSubdomainUrl(sub);
}

/**
 * Returns true when the app is running on a known dashboard subdomain.
 */
export function isOnSubdomain(): boolean {
  return getSubdomain() !== null;
}

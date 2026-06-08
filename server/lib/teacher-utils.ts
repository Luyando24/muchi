export function formatTeacherDisplayName(fullName?: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  return `${firstName.charAt(0).toUpperCase()}. ${lastName}`;
}

export function buildSubjectTeacherMap(classSubjects: any[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const cs of classSubjects) {
    const rawName = cs.teacher_name || (Array.isArray(cs.profiles)
      ? cs.profiles[0]?.full_name
      : cs.profiles?.full_name);
    map.set(cs.subject_id, formatTeacherDisplayName(rawName));
  }
  return map;
}


import { supabase } from '@/lib/supabase';

/** Current user's school — used for cache keys and client-side filtering. */
export async function getProfileSchoolId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', session.user.id)
    .single();

  return profile?.school_id ?? null;
}

export function schoolCacheKey(base: string, schoolId: string | null | undefined): string {
  return schoolId ? `${base}--${schoolId}` : base;
}

/** Keep only rows that belong to this school (defense in depth vs stale cache). */
export function filterBySchoolId<T extends { school_id?: string | null }>(
  items: T[] | null | undefined,
  schoolId: string | null,
): T[] {
  if (!items?.length) return [];
  if (!schoolId) return items;
  return items.filter((item) => item.school_id === schoolId);
}

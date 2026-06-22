import { db, isOnline, syncOfflineData } from './offline';
import { supabase } from './supabase';

export interface SyncOptions extends RequestInit {
  cacheKey?: string;
  forceSync?: boolean;
}

// 30 minutes in milliseconds (30 * 60 * 1000)
const CACHE_TTL = 1800000;

/**
 * Invalidates related cache keys from Dexie DB when a mutation (POST/PUT/DELETE) is made
 */
export const invalidateCache = async (mutationUrl: string, cacheKey?: string) => {
  try {
    const cleanUrl = mutationUrl.split('?')[0];
    
    // 1. Delete matching base URL prefix (e.g. /api/school/students)
    await db.cache.where('url').startsWith(cleanUrl).delete();
    await db.cache.where('url').startsWith(`supabase:${cleanUrl}`).delete();

    // 2. Delete specific cacheKey if provided (with user scoping check)
    if (cacheKey) {
      let scopedKey = cacheKey;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId && !scopedKey.includes(userId)) {
          scopedKey = `${scopedKey}--usr-${userId}`;
        }
      } catch (err) {}
      await db.cache.delete(scopedKey);
      await db.cache.delete(`supabase:${scopedKey}`);
    }

    // 3. Special check for grade/results/student updates to clear related caches
    const isGradeOrResultMutation = cleanUrl.includes('/grades') || cleanUrl.includes('/results');
    const isStudentMutation = cleanUrl.includes('/students') || cleanUrl.includes('/enroll') || cleanUrl.includes('/create-student');
    if (isGradeOrResultMutation || isStudentMutation) {
      const allEntries = await db.cache.toArray();
      for (const entry of allEntries) {
        const key = entry.url;
        if (
          key.includes('students') ||
          key.includes('gradebook') || 
          key.includes('verify-status') || 
          key.includes('report-card') ||
          key.includes('grades') ||
          key.includes('results')
        ) {
          await db.cache.delete(key);
        }
      }
    }

    // 4. Extract the last segment to find other related caches (e.g. settings, students, etc.)
    const segments = cleanUrl.split('/');
    let lastSegment = segments[segments.length - 1];
    
    // Resolve parent collection for action verbs in mutations
    if (['bulk', 'bulk-complete', 'batch', 'clear', 'migrate', 'submit', 'publish'].includes(lastSegment)) {
      lastSegment = segments[segments.length - 2];
    }
    
    if (lastSegment && lastSegment.length > 2) {
      const allEntries = await db.cache.toArray();
      for (const entry of allEntries) {
        const key = entry.url;
        // If the cache key contains the segment keyword (e.g. "students", "teachers", "settings")
        if (key.includes(lastSegment) || (cacheKey && key.includes(cacheKey))) {
          await db.cache.delete(key);
        }
      }
    }
  } catch (err) {
    console.warn('Cache invalidation warning:', err);
  }
};

// Helper to extract userId from Authorization header JWT payload
const getUserIdFromHeaders = (headers: Record<string, string>): string | null => {
  try {
    const auth = headers['Authorization'] || headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.substring(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        const rawPayload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(rawPayload);
        return payload.sub || null;
      }
    }
  } catch (err) {
    // Ignore decoding issues
  }
  return null;
};

/**
 * Enhanced fetch that supports offline caching and queued mutations
 */
export const syncFetch = async (url: string, options: SyncOptions = {}) => {
  const method = options.method || 'GET';
  const headers = (options.headers as Record<string, string>) || {};

  // Resolve user-scoped cache key if applicable
  let cacheKey = options.cacheKey || url;
  try {
    let userId: string | null = null;
    
    // 1. Try resolving from headers first (instant & reliable)
    userId = getUserIdFromHeaders(headers);
    
    // 2. Try supabase session
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
    }

    // 3. Fall back to localStorage last logged-in user ID to bypass session resolution races
    if (!userId && typeof window !== 'undefined') {
      userId = window.localStorage.getItem('muchi_last_user_id');
    }

    if (userId && !cacheKey.includes(userId)) {
      cacheKey = `${cacheKey}--usr-${userId}`;
    }
  } catch (err) {
    console.warn('Failed to auto-scope cacheKey:', err);
  }

  // GET Requests: Cache and fallback
  if (method === 'GET') {
    // Check if online and cached data is fresh (within 30 minutes)
    if (isOnline() && !options.forceSync) {
      const cached = await db.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log('ONLINE: Serving fresh cached data:', cacheKey);
        return cached.data;
      }
    }

    // IF OFFLINE: IMMEDIATELY RETURN CACHE
    if (!isOnline()) {
      const cached = await db.cache.get(cacheKey);
      if (cached) {
        console.log('OFFLINE: Serving from cache:', cacheKey);
        return cached.data;
      }
      throw new Error('OFFLINE: No connection and no cached data available.');
    }

    // IF ONLINE: FETCH AND UPDATE CACHE
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        const data = await response.json();
        await db.cache.put({ url: cacheKey, data, timestamp: Date.now() });
        return data;
      } else {
        // Server responded with an error (e.g. 403, 500)
        console.warn(`Server responded with ${response.status} for ${url}`);
        
        // Try to get from cache as a fallback even for non-network errors
        const cached = await db.cache.get(cacheKey);
        if (cached) {
          console.log('Serving from cache after server error:', cacheKey);
          return cached.data;
        }

        const errorData = await response.json().catch(() => ({ message: `HTTP Error ${response.status}` }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error: any) {
      if (error.message.includes('Server error') || error.message.includes('HTTP Error')) {
        throw error;
      }
      console.warn('Network error, falling back to cache...', error);
      const cached = await db.cache.get(cacheKey);
      if (cached) return cached.data;
      throw new Error(`No connection and no cached data available: ${error.message}`);
    }
  }

  // POST/PUT/DELETE Requests: Queue and Sync
  if (!isOnline() && !options.forceSync) {
    console.log('Offline: Queuing operation...', { url, method });
    
    // Store in pending sync queue
    await db.pendingSync.add({
      url,
      method,
      headers,
      body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body),
      timestamp: Date.now()
    });
    
    // Return a mock successful response for the UI
    return { success: true, offline: true, message: 'Operation queued for sync.' };
  }

  // Online: Perform request directly
  const response = await fetch(url, options);
  
  // If request failed but it was a mutation, we could also queue it if it was a network error
  if (!response.ok) {
    let errorMessage = `Server error (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Response body was not JSON (e.g. HTML error page); keep the HTTP status message
      const statusText = response.statusText || 'Unknown error';
      errorMessage = `HTTP ${response.status}: ${statusText}`;
    }
    throw new Error(errorMessage);
  }

  // Invalidate related cache entries after a successful mutation
  await invalidateCache(url, cacheKey);

  // If we just came online, trigger a sync of all pending items
  if (isOnline()) {
    syncOfflineData();
  }

  return response.json();
};

/**
 * Offline-aware Supabase query wrapper
 */
export const offlineQuery = async (query: any, cacheKey: string, forceSync = false) => {
  let scopedCacheKey = cacheKey;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id;
    if (!userId && typeof window !== 'undefined') {
      userId = window.localStorage.getItem('muchi_last_user_id') || undefined;
    }
    if (userId && !scopedCacheKey.includes(userId)) {
      scopedCacheKey = `${scopedCacheKey}--usr-${userId}`;
    }
  } catch (err) {
    console.warn('Failed to auto-scope offlineQuery cacheKey:', err);
  }

  if (isOnline() && !forceSync) {
    const cached = await db.cache.get(`supabase:${scopedCacheKey}`);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log('ONLINE: Serving fresh cached query:', scopedCacheKey);
      return { data: cached.data, error: null };
    }
  }

  if (isOnline()) {
    const { data, error } = await query;
    if (!error && data) {
      await db.cache.put({ url: `supabase:${scopedCacheKey}`, data, timestamp: Date.now() });
      return { data, error: null };
    }
    // If online query fails, try cache
  }

  const cached = await db.cache.get(`supabase:${scopedCacheKey}`);
  if (cached) {
    return { data: cached.data, error: null, offline: true };
  }

  return { data: null, error: new Error('No connection and no cached data available.') };
};

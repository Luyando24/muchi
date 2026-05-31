import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase URL or Key. Authentication will not work.');
}

const CHUNK_SIZE = 2500;

// Safe helper to read a cookie by name with individual decoding
function getCookieByName(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const ca = document.cookie.split(';');
  const nameEQ = name + "=";
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      try {
        return decodeURIComponent(c.substring(nameEQ.length));
      } catch (e) {
        console.error("Failed to decode cookie value for key: " + name, e);
        return c.substring(nameEQ.length);
      }
    }
  }
  return null;
}

// Helper to write a cookie
function setCookie(name: string, value: string, domain: string, maxAge: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; ${domain}max-age=${maxAge}; SameSite=Lax; Secure`;
}

// Helper to delete a cookie
function deleteCookie(name: string, domain: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; ${domain}max-age=0; SameSite=Lax; Secure`;
}

// Custom storage handler to sync and share auth sessions across all subdomains in production
const subdomainCookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    // 1. Try local storage first (highest priority)
    const localVal = window.localStorage.getItem(key);
    if (localVal) return localVal;

    // 2. Try shared domain chunked cookies fallback
    const chunkCountStr = getCookieByName(key + "_chunks");
    if (chunkCountStr) {
      const count = parseInt(chunkCountStr, 10);
      let fullValue = '';
      for (let i = 0; i < count; i++) {
        const chunk = getCookieByName(`${key}_${i}`);
        if (chunk === null) {
          // If any chunk is missing, we have an incomplete session
          return null;
        }
        fullValue += chunk;
      }
      // Sync it to local storage for fast client access
      window.localStorage.setItem(key, fullValue);
      return fullValue;
    }

    // 3. Fallback to legacy non-chunked cookie
    const legacyVal = getCookieByName(key);
    if (legacyVal) {
      window.localStorage.setItem(key, legacyVal);
      return legacyVal;
    }

    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    
    // Save to local storage
    window.localStorage.setItem(key, value);

    // Determine domain
    const hostname = window.location.hostname;
    const isProd = hostname.endsWith('muchiapp.com');
    const domain = isProd ? 'domain=.muchiapp.com; ' : '';
    
    // 1. Clear any existing chunks first to prevent leftovers
    const oldChunksStr = getCookieByName(key + "_chunks");
    if (oldChunksStr) {
      const count = parseInt(oldChunksStr, 10);
      for (let i = 0; i < count; i++) {
        deleteCookie(`${key}_${i}`, domain);
      }
      deleteCookie(`${key}_chunks`, domain);
    }
    // Also clear legacy non-chunked cookie
    deleteCookie(key, domain);

    // 2. Write new value in chunks
    const numChunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < numChunks; i++) {
      const chunk = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      setCookie(`${key}_${i}`, chunk, domain, 31536000); // 1 year
    }
    setCookie(`${key}_chunks`, String(numChunks), domain, 31536000);
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    
    // Remove from local storage
    window.localStorage.removeItem(key);
    
    // Determine domain
    const hostname = window.location.hostname;
    const isProd = hostname.endsWith('muchiapp.com');
    const domain = isProd ? 'domain=.muchiapp.com; ' : '';
    
    // Read the chunk count and delete all chunks
    const chunkCountStr = getCookieByName(key + "_chunks");
    if (chunkCountStr) {
      const count = parseInt(chunkCountStr, 10);
      for (let i = 0; i < count; i++) {
        deleteCookie(`${key}_${i}`, domain);
      }
      deleteCookie(`${key}_chunks`, domain);
    }
    
    // Also delete any legacy non-chunked cookie
    deleteCookie(key, domain);
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: subdomainCookieStorage,
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true
  }
});

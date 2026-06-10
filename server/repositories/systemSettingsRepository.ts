import { supabaseAdmin } from '../lib/supabase.js';

let cachedSettings: { key: string; value: any }[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class SystemSettingsRepository {
  static async getSystemSettings(): Promise<{ key: string; value: any }[]> {
    const now = Date.now();
    if (cachedSettings && now < cacheExpiry) {
      return cachedSettings;
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('key, value');
    
    if (error) {
      throw error;
    }
    
    cachedSettings = data || [];
    cacheExpiry = now + CACHE_TTL_MS;
    return cachedSettings;
  }
}

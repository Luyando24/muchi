import Dexie, { Table } from 'dexie';

export interface PendingSync {
  id?: number;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
}

export interface CacheEntry {
  url: string;
  data: any;
  timestamp: number;
}

export class OfflineDB extends Dexie {
  pendingSync!: Table<PendingSync>;
  cache!: Table<CacheEntry>;

  constructor() {
    super('OfflineDB');
    this.version(1).stores({
      pendingSync: '++id, url, method, timestamp',
      cache: 'url, timestamp'
    });
  }
}

export const db = new OfflineDB();

export const isOnline = () => window.navigator.onLine;

export const syncOfflineData = async () => {
  if (!isOnline()) return;

  const pending = await db.pendingSync.toArray();
  if (pending.length === 0) return;

  console.log(`Syncing ${pending.length} pending operations...`);

  for (const op of pending) {
    try {
      const res = await fetch(op.url, {
        method: op.method,
        headers: op.headers,
        body: op.body
      });

      if (res.ok) {
        await db.pendingSync.delete(op.id!);
      } else {
        console.error(`Failed to sync operation ${op.id}:`, await res.text());
      }
    } catch (error) {
      console.error(`Error syncing operation ${op.id}:`, error);
      break; // Stop syncing if there's a network error
    }
  }
};

// Listen for online status to trigger sync
window.addEventListener('online', syncOfflineData);

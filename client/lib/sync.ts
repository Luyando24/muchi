import { db } from "./db";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";

async function post(path: string, body: unknown) {
  if (USE_MOCK) return; // skip network in mock mode
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

export class SyncService {
  private timer: number | null = null;
  private running = false;

  start(intervalMs = 5000) {
    if (this.timer != null) return;
    const tick = async () => {
      if (!navigator.onLine || this.running) return;
      this.running = true;
      try {
        const items = await db.syncQueue.orderBy("createdAt").toArray();
        for (const item of items) {
          try {
            const op = item.op as any;
            if (op.entity === "patient" && op.type === "create")
              await post("/patients", op.payload);
            else if (op.entity === "patient" && op.type === "update")
              await post(`/patients/${op.id}`, op.payload);
            else if (op.entity === "test" && op.type === "create")
              await post("/tests", op.payload);
            await db.syncQueue.delete(item.id);
          } catch (err: any) {
            const retryCount = item.retryCount + 1;
            await db.syncQueue.update(item.id, {
              retryCount,
              lastError: String(err?.message || err),
            });
            // exponential backoff per item can be implemented here if needed
          }
        }
      } finally {
        this.running = false;
      }
    };
    this.timer = window.setInterval(tick, intervalMs);
    window.addEventListener("online", tick);
  }

  stop() {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
  }
}

export const syncService = new SyncService();

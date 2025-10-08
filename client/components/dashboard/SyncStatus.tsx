import React, { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { WifiOff, Wifi } from "lucide-react";

export default function SyncStatus() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [queue, setQueue] = useState<number>(0);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    const timer = setInterval(
      async () => setQueue(await db.syncQueue.count()),
      1000,
    );
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      {online ? (
        <Wifi className="h-4 w-4 text-green-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-600" />
      )}
      <span className="text-muted-foreground">
        {online ? "Online" : "Offline"}
      </span>
      <span>·</span>
      <span className="text-muted-foreground">Sync queue: {queue}</span>
    </div>
  );
}

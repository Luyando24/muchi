import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import SyncStatus from "@/components/dashboard/SyncStatus";

export default function SecurityPanel({ hospitalId }: { hospitalId: string }) {
  const [activeStaff, setActiveStaff] = useState(0);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const list = await db.staffUsers
        .where({ hospitalId })
        .filter((u) => u.isActive)
        .toArray();
      if (!cancel) setActiveStaff(list.length);
    };
    load();
    const t = setInterval(load, 1000);
    return () => {
      cancel = true;
      clearInterval(t);
    };
  }, [hospitalId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security & Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Active staff logged in
          </div>
          <div className="text-lg font-semibold">{activeStaff}</div>
        </div>
        <div className="text-sm">Sync</div>
        <div className="rounded-md border p-2 bg-background">
          <SyncStatus />
        </div>
      </CardContent>
    </Card>
  );
}

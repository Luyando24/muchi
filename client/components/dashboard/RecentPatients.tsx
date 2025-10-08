import React, { useEffect, useState } from "react";
import { db } from "@/lib/db";
import type { Patient } from "@shared/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecentPatients() {
  const [items, setItems] = useState<Patient[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const rows = await db.patients
        .orderBy("updatedAt")
        .reverse()
        .limit(5)
        .toArray();
      if (!cancelled) setItems(rows);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Patients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : null}
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <div className="truncate">
              <div className="font-medium truncate">
                {p.firstName || p.lastName
                  ? `${p.firstName} ${p.lastName}`
                  : p.nrc}
              </div>
              <div className="text-muted-foreground">NRC: {p.nrc}</div>
            </div>
            <a
              className="text-primary hover:underline"
              href={`/clinic/patient/${p.id}`}
            >
              Open
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

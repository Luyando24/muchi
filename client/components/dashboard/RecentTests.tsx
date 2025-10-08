import React, { useEffect, useState } from "react";
import { db } from "@/lib/db";
import type { LabTest, Patient } from "@shared/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = LabTest & { patientName: string };

export default function RecentTests() {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tests = await db.tests
        .orderBy("updatedAt")
        .reverse()
        .limit(5)
        .toArray();
      const rows: Row[] = [];
      for (const t of tests) {
        const p = (await db.patients.get(t.patientId)) as Patient | undefined;
        rows.push({
          ...t,
          patientName: p
            ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.nrc
            : t.patientId,
        });
      }
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
        <CardTitle>Recent Tests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No tests yet</div>
        ) : null}
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between text-sm">
            <div className="truncate">
              <div className="font-medium truncate">{t.type}</div>
              <div className="text-muted-foreground">
                {t.patientName} · {t.status}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

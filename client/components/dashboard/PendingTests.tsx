import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { LabTest, Patient } from "@shared/api";

export default function PendingTests({ hospitalId }: { hospitalId: string }) {
  const [items, setItems] = useState<
    (LabTest & { patient?: Patient | null })[]
  >([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const list = await db.tests
        .where({ hospitalId })
        .filter((t) => t.status === "ordered" || t.status === "in_progress")
        .sortBy("updatedAt");
      const recent = list.slice(0, 8);
      const withPatients = await Promise.all(
        recent.map(async (t) => ({
          ...t,
          patient: await db.patients.get(t.patientId),
        })),
      );
      if (!cancel) setItems(withPatients);
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
        <CardTitle>Pending Lab Tests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending tests.</div>
        ) : (
          <ul className="divide-y">
            {items.map((t) => (
              <li key={t.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.status}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.patient?.firstName
                    ? `${t.patient.firstName} ${t.patient.lastName}`
                    : t.patientId}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

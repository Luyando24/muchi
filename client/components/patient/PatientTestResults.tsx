import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LabTest } from "@shared/api";
import { Api } from "@/lib/api";

interface Props {
  patientId: string;
}

export default function PatientTestResults({ patientId }: Props) {
  const [items, setItems] = useState<LabTest[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const list = await Api.listPatientTests(patientId);
      if (!cancelled) setItems(list.items.slice(0, 5));
    };
    run();
    const t = setInterval(run, 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [patientId]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">Test Results</CardTitle>
        <a className="text-xs text-primary" href="#">
          View All
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No test results</div>
        ) : null}
        {items.map((t) => (
          <div key={t.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t.type}</div>
              <Badge
                variant={
                  t.status === "completed"
                    ? "default"
                    : t.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                }
              >
                {t.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(t.updatedAt).toLocaleString()}
            </div>
            {t.resultSummary ? (
              <div className="text-xs text-foreground mt-1">
                Result: {t.resultSummary}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

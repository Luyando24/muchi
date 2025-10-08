import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@shared/api";
import { db } from "@/lib/db";

interface Props {
  patientId: string;
}

export default function UpcomingAppointments({ patientId }: Props) {
  const [items, setItems] = useState<Appointment[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const rows = await db.appointments
        .where({ patientId })
        .reverse()
        .sortBy("scheduledFor");
      if (!cancelled) setItems(rows.slice(0, 5));
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
        <CardTitle className="text-base">Upcoming Appointments</CardTitle>
        <a className="text-xs text-primary" href="#">
          View All
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No upcoming appointments
          </div>
        ) : null}
        {items.map((a) => (
          <div key={a.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{a.reason || "Appointment"}</div>
              <Badge
                variant={
                  a.status === "scheduled"
                    ? "secondary"
                    : a.status === "completed"
                      ? "default"
                      : a.status === "cancelled"
                        ? "destructive"
                        : "outline"
                }
              >
                {a.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(a.scheduledFor).toLocaleString()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

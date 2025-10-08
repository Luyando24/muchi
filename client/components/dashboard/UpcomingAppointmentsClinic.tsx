import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { format } from "date-fns";
import type { Appointment, Patient } from "@shared/api";

export default function UpcomingAppointmentsClinic({
  hospitalId,
}: {
  hospitalId: string;
}) {
  const [items, setItems] = useState<
    (Appointment & { patient?: Patient | null })[]
  >([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const now = new Date();
      const list = await db.appointments
        .where({ hospitalId })
        .filter(
          (a) => new Date(a.scheduledFor) >= now && a.status === "scheduled",
        )
        .sortBy("scheduledFor");
      const limited = list.slice(0, 8);
      const withPatients = await Promise.all(
        limited.map(async (a) => ({
          ...a,
          patient: await db.patients.get(a.patientId),
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
        <CardTitle>Upcoming Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No upcoming appointments.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {a.patient?.firstName
                      ? `${a.patient.firstName} ${a.patient.lastName}`
                      : a.patientId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.reason || "Check-up"}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(a.scheduledFor), "PPp")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

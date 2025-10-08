import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

export default function PatientEngagement({
  hospitalId,
}: {
  hospitalId: string;
}) {
  const [missed7d, setMissed7d] = useState(0);
  const [upcoming3d, setUpcoming3d] = useState(0);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const now = new Date();
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      const next3 = new Date();
      next3.setDate(now.getDate() + 3);
      const all = await db.appointments.where({ hospitalId }).toArray();
      const m = all.filter(
        (a) => a.status === "no_show" && new Date(a.scheduledFor) >= past7,
      ).length;
      const u = all.filter(
        (a) =>
          a.status === "scheduled" &&
          new Date(a.scheduledFor) <= next3 &&
          new Date(a.scheduledFor) >= now,
      ).length;
      if (!cancel) {
        setMissed7d(m);
        setUpcoming3d(u);
      }
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
        <CardTitle>Patient engagement</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">
            Missed in last 7 days
          </div>
          <div className="text-2xl font-semibold">{missed7d}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Upcoming (next 3 days)
          </div>
          <div className="text-2xl font-semibold">{upcoming3d}</div>
        </div>
      </CardContent>
    </Card>
  );
}

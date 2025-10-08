import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { StaffUser } from "@shared/api";

export default function DoctorRoster({ hospitalId }: { hospitalId: string }) {
  const [doctors, setDoctors] = useState<StaffUser[]>([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const list = await db.staffUsers
        .where({ hospitalId })
        .filter((u) => u.role === "doctor")
        .toArray();
      if (!cancel) setDoctors(list);
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
        <CardTitle>Doctor availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {doctors.length === 0 ? (
          <div className="text-sm text-muted-foreground">No doctors found.</div>
        ) : (
          <ul className="divide-y">
            {doctors.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {d.firstName ? `${d.firstName} ${d.lastName}` : d.email}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.email}
                  </div>
                </div>
                <span
                  className={
                    d.isActive
                      ? "text-emerald-600 text-xs"
                      : "text-muted-foreground text-xs"
                  }
                >
                  {d.isActive ? "On duty" : "Off duty"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

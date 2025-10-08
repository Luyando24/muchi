import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { LabTest, Patient } from "@shared/api";
import TopNav from "@/components/navigation/TopNav";
import { ClipboardList, Search as SearchIcon } from "lucide-react";

export default function ClinicTests() {
  const [status, setStatus] = useState<LabTest["status"] | "all">("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<(LabTest & { patient?: Patient | null })[]>(
    [],
  );

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const list = await db.tests.orderBy("updatedAt").reverse().toArray();
      const withP = await Promise.all(
        list.map(async (t) => ({
          ...t,
          patient: await db.patients.get(t.patientId),
        })),
      );
      if (!cancel) setRows(withP);
    };
    load();
    const t = setInterval(load, 1000);
    return () => {
      cancel = true;
      clearInterval(t);
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!qq ||
          r.type.toLowerCase().includes(qq) ||
          r.patient?.firstName?.toLowerCase().includes(qq) ||
          r.patient?.lastName?.toLowerCase().includes(qq)),
    );
  }, [rows, status, q]);

  return (
    <div className="pb-16 md:pb-0">
      <TopNav
        brand="Clinic"
        items={[
          { to: "/clinic", label: "Dashboard" },
          { to: "/clinic/patients", label: "Patients" },
          { to: "/clinic/tests", label: "Tests" },
          { to: "/clinic/settings", label: "Settings" },
        ]}
      />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold">Tests</h1>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {["all", "ordered", "in_progress", "completed", "cancelled"].map(
                (s) => (
                  <Button
                    key={s}
                    variant={status === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatus(s as any)}
                  >
                    {s.replace("_", " ")}
                  </Button>
                ),
              )}
            </div>
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-64"
                placeholder="Search by type or patient"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t.type}</span>
                  <span className="text-xs rounded bg-muted px-2 py-0.5">
                    {t.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>
                  Patient:{" "}
                  <span className="text-foreground">
                    {t.patient?.firstName} {t.patient?.lastName}
                  </span>
                </div>
                {t.resultSummary ? (
                  <div>
                    Result:{" "}
                    <span className="text-foreground">{t.resultSummary}</span>
                  </div>
                ) : null}
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/clinic/patient/${t.patientId}`}>
                      Open record
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

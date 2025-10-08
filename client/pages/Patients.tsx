import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { Patient } from "@shared/api";
import { Plus, Search as SearchIcon, UserRound } from "lucide-react";
import TopNav from "@/components/navigation/TopNav";

export default function Patients() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Patient[]>([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const list = await db.patients.orderBy("updatedAt").reverse().toArray();
      if (!cancel) setItems(list);
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
    if (!qq) return items;
    return items.filter(
      (p) =>
        p.firstName?.toLowerCase().includes(qq) ||
        p.lastName?.toLowerCase().includes(qq) ||
        p.nrc?.toLowerCase().includes(qq) ||
        p.cardId?.toLowerCase().includes(qq),
    );
  }, [q, items]);

  return (
    <div className="pb-20 md:pb-0">
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
          <h1 className="text-2xl font-semibold">Patients</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-72"
                placeholder="Search name, Hospital ID, or Card ID"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button asChild>
              <Link to="/clinic/search">
                <Plus className="h-4 w-4 mr-1" /> Add Patient
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  {p.firstName} {p.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>
                  Hospital ID: <span className="text-foreground">{p.hospitalCardId || 'Not assigned'}</span>
                </div>
                <div>
                  Card ID: <span className="text-foreground">{p.cardId}</span>
                </div>
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/clinic/patient/${p.id}`}>Open record</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button
        asChild
        className="fixed bottom-16 right-4 md:bottom-6 md:right-6 shadow-lg"
      >
        <Link to="/clinic/search">
          <Plus className="h-5 w-5 mr-1" /> Add Patient
        </Link>
      </Button>
    </div>
  );
}

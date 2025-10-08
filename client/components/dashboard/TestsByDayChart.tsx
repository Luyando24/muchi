import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

interface Point {
  day: string;
  count: number;
}

function formatDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function TestsByDayChart() {
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const tests = await db.tests.orderBy("updatedAt").toArray();
      const byDay = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        byDay.set(formatDay(d), 0);
      }
      for (const t of tests) {
        if (!t.updatedAt) continue;
        const d = new Date(t.updatedAt);
        if (d >= since) {
          const key = formatDay(
            new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          );
          byDay.set(key, (byDay.get(key) || 0) + 1);
        }
      }
      const arr: Point[] = Array.from(byDay.entries()).map(([day, count]) => ({
        day,
        count,
      }));
      if (!cancelled) setPoints(arr);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const config = useMemo(
    () => ({ tests: { label: "Tests", color: "hsl(var(--primary))" } }),
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tests (7 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <BarChart data={points}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-tests)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

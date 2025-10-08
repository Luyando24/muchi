import React from "react";

export default function ProgramVisual() {
  const bars = [
    [60, 80, 40, 90, 70],
    [50, 55, 45, 65, 60],
    [30, 40, 35, 45, 50],
  ];
  return (
    <div aria-hidden className="mx-auto w-full max-w-3xl">
      <div className="grid gap-4 md:grid-cols-3">
        {bars.map((row, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground mb-2">
              {["HIV", "TB", "Malaria"][i]}
            </div>
            <div className="flex items-end gap-2 h-24">
              {row.map((h, j) => (
                <div key={j} className="flex-1 rounded bg-primary/20">
                  <div
                    className="w-full rounded bg-primary"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from "react";

export default function HeroVisual() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
          <div className="font-semibold">Clinic Dashboard</div>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="h-2 w-2 rounded-full bg-red-500" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          <div className="col-span-2 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {["Patients", "Tests", "Appointments"].map((t, i) => (
                <div key={t} className="rounded-lg border p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {t}
                  </div>
                  <div className="mt-1 text-xl font-bold">
                    {[420, 128, 36][i]}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-2">
                Tests by day
              </div>
              <div className="flex items-end gap-1 h-24">
                {[18, 24, 12, 30, 22, 34, 28, 20, 14, 26, 32, 16].map(
                  (h, idx) => (
                    <div key={idx} className="w-3 rounded-sm bg-primary/30">
                      <div
                        style={{ height: `${h * 3}px` }}
                        className="w-full rounded-sm bg-primary"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="col-span-1 space-y-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Patient QR</div>
              <div className="mt-2 aspect-square rounded bg-muted grid place-items-center">
                <div className="h-16 w-16 rounded bg-foreground/80" />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Sync status</div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div className="h-2 w-3/4 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                3 pending • 97% synced
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none absolute -left-8 -top-8 -z-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl animate-float-slow"
        style={{ animationDelay: "-1s" }}
      />
      <div
        className="pointer-events-none absolute -right-10 -bottom-10 -z-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl animate-float-slow"
        style={{ animationDelay: "-3s" }}
      />
    </div>
  );
}

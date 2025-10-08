import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export type BottomItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

interface BottomNavProps {
  items: BottomItem[];
}

export default function BottomNav({ items }: BottomNavProps) {
  const { pathname, hash } = useLocation();
  const isActive = (to: string) => {
    if (to.includes("#")) return `${pathname}${hash}` === to;
    return pathname === to;
  };
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <ul className="grid grid-cols-4">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-xs",
                isActive(it.to) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="h-5 w-5">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

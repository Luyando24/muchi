import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import FlovaLogo from "@/components/ui/FlovaLogo";

type NavItem = { to: string; label: string };

interface TopNavProps {
  brand?: string;
  items: NavItem[];
  onLogout?: () => void;
}

export default function TopNav({
  brand = "Flova",
  items,
  onLogout,
}: TopNavProps) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-between py-3">
        <Link to="/" className="flex items-center">
          <FlovaLogo size="md" />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => (
            <Button
              key={it.to}
              asChild
              variant={pathname === it.to ? "default" : "ghost"}
            >
              <Link to={it.to}>{it.label}</Link>
            </Button>
          ))}
          <ThemeToggle />
          {onLogout && (
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

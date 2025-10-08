import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import FlovaLogo from "@/components/ui/FlovaLogo";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 border-b">
            <Link
                to="/"
                className="flex items-center"
                onClick={closeMenu}
              >
                <FlovaLogo size="md" />
              </Link>
            <ThemeToggle />
          </div>
          
          <nav className="flex flex-col gap-4 py-6 flex-1">
            <Link 
              to="/pharmacy" 
              className="text-lg font-medium hover:text-primary transition-colors"
              onClick={closeMenu}
            >
              Pharmacy
            </Link>
            <Link 
              to="/portal" 
              className="text-lg font-medium hover:text-primary transition-colors"
              onClick={closeMenu}
            >
              Patient Portal
            </Link>
            <div className="border-t pt-4 mt-4">
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start" size="lg">
                  <Link to="/login" onClick={closeMenu}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" size="lg">
                  <Link to="/register" onClick={closeMenu}>
                    Create account
                  </Link>
                </Button>
              </div>
            </div>
          </nav>
          
          <div className="border-t pt-4 text-sm text-muted-foreground">
            <p>Healthcare-grade privacy, offline-first</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/navigation/ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 z-50">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center text-xs">CoA</div>
          <span className="font-bold text-lg">ZamPortal</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="default">
            <Link to="#">Get App</Link>
          </Button>
        </nav>
        
        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button asChild variant="default">
            <Link to="#">Get App</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
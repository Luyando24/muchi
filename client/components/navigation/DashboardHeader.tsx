import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function DashboardHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="ZamPortal Logo" className="h-10 w-auto" />
          <div>
            <span className="text-2xl font-bold">ZamPortal</span>
            <p className="text-xs text-muted-foreground">Government services at your fingertips</p>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-base font-medium">
          <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">All Services</Link>
          <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">Life Scenarios</Link>
          <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link>
          <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">Help</Link>
          <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">News</Link>
          <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">Contact us</Link>
          
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="#">Register</Link>
            </Button>
            <Button asChild variant="default" className="rounded-full">
              <Link to="#">Login</Link>
            </Button>
            <ThemeToggle />
          </div>
        </nav>
        
        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button asChild variant="default" className="rounded-full">
            <Link to="#">Login</Link>
          </Button>
          <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t">
          <nav className="flex flex-col gap-4 p-4">
            <Link to="#" className="text-muted-foreground hover:text-primary transition-colors py-2">All Services</Link>
            <Link to="#" className="text-muted-foreground hover:text-primary transition-colors py-2">Life Scenarios</Link>
            <Link to="#" className="text-muted-foreground hover:text-primary transition-colors py-2">FAQ</Link>
            <Link to="#" className="text-muted-foreground hover:text-primary transition-colors py-2">Help</Link>
            <Link to="#" className="text-muted-foreground hover:text-primary transition-colors py-2">News</Link>
            <Link to="#" className="text-muted-foreground hover:text-primary transition-colors py-2">Contact us</Link>
            <Button asChild variant="ghost">
              <Link to="#">New User</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
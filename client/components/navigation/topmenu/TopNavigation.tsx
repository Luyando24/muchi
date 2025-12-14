import React, { useState } from 'react';
import { User, Search, GraduationCap, LogOut, Bell, Settings, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { useAuth, clearSession } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { useSchoolInfo } from '@/hooks/useSchoolInfo';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { logError } from '@/lib/errorUtils';

interface TopNavigationProps {
  toggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function TopNavigation({ toggleSidebar, sidebarCollapsed }: TopNavigationProps) {
  const { session } = useAuth();
  const { schoolInfo } = useSchoolInfo();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      console.log('[TopNavigation] Logging out user');
      await clearSession();
      navigate('/login');
    } catch (error) {
      logError(error as Error, 'TopNavigation', { action: 'logout' });
      console.error('Logout failed:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('[TopNavigation] Searching for:', searchQuery);
      // TODO: Implement search functionality
    } catch (error) {
      logError(error as Error, 'TopNavigation', { action: 'search', query: searchQuery });
    }
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Section - Brand & Breadcrumbs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MUCHI</h1>
                <p className="text-xs text-gray-500 leading-tight">
                  {schoolInfo?.name || 'School Management Platform'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          <div className="hidden md:block">
            <Breadcrumb />
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search students, classes, reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-50 border-gray-200 focus:bg-white focus:border-primary"
            />
          </form>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 text-sm text-muted-foreground">
                No new notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* User Role Badge */}
          {session?.role && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {session.role}
            </Badge>
          )}

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium">
                    {session?.role || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session?.userId?.slice(0, 12) || 'user@example.com'}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{session?.role || 'User'}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {session?.userId || 'user@example.com'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Breadcrumbs */}
      <div className="md:hidden px-6 pb-3">
        <Breadcrumb />
      </div>
    </div>
  );
}
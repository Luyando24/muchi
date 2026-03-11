import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Menu,
  X,
  Search,
  LogOut,
  User,
  Settings,
  HelpCircle,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  GraduationCap,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Notification } from '@shared/api';
import { useToast } from "@/components/ui/use-toast";
import { OfflineIndicator } from '@/components/navigation/OfflineIndicator';

interface SchoolAdminNavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onSelectStudent?: (id: string | null) => void;
  onSelectTeacher?: (id: string | null) => void;
  onLogout: () => void;
}

export default function SchoolAdminNavbar({
  isSidebarOpen,
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  onSelectStudent,
  onSelectTeacher,
  onLogout
}: SchoolAdminNavbarProps) {
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    role: string;
    email: string;
    profileImage?: string;
    schoolName?: string;
  } | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    students: any[],
    teachers: any[]
  }>({ students: [], teachers: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
    fetchNotifications();

    // Subscribe to realtime notifications (Optional enhancement for later)
    // const subscription = supabase...
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (profile) {
        // Split full name if possible
        const names = (profile.full_name || 'Admin User').split(' ');
        setUser({
          firstName: names[0],
          lastName: names.length > 1 ? names.slice(1).join(' ') : '',
          role: profile.role || 'School Admin',
          email: authUser.email || '',
          profileImage: profile.avatar_url,
          schoolName: profile.school?.name
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/notifications', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data: Notification[] = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`/api/school/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults({ students: [], teachers: [] });
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'students': return 'Student Management';
      case 'teachers': return 'Teacher Management';
      case 'academics': return 'Academics & Results';
      case 'finance': return 'Financial Overview';
      case 'reports': return 'Reports & Analytics';
      case 'calendar': return 'School Calendar';
      case 'settings': return 'System Settings';
      default: return 'Dashboard';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Fallback user if loading
  const displayUser = user || {
    firstName: 'Admin',
    lastName: 'User',
    role: 'Loading...',
    email: '',
    profileImage: undefined
  };

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 overflow-hidden">
      <div className="px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo and School Name */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  MUCHI Admin
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider line-clamp-1 max-w-[120px] sm:max-w-none">
                  {displayUser.schoolName || 'Portal'}
                </p>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="hidden md:flex items-center text-sm text-slate-500 ml-4 border-l pl-4 border-slate-200 dark:border-slate-700">
              <span className="font-medium text-slate-900 dark:text-white capitalize">{activeTab}</span>
            </div>
          </div>

          {/* Search Bar (Center) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="search"
                    placeholder="Search students, teachers..."
                    className="w-full pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] md:w-[400px] p-0" align="start">
                <div className="p-4 border-b">
                  <p className="text-sm font-medium text-muted-foreground">Search Results</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {searchResults.students.length === 0 && searchResults.teachers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No results found
                        </div>
                      ) : (
                        <>
                          {searchResults.students.length > 0 && (
                            <div className="py-2">
                              <h4 className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase">Students</h4>
                              {searchResults.students.map(student => (
                                <div
                                  key={student.id}
                                  className="px-4 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                                  onClick={() => {
                                    if (setActiveTab) setActiveTab('students');
                                    if (onSelectStudent) onSelectStudent(student.id);
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                >
                                  <span className="text-sm font-medium">{student.full_name}</span>
                                  <Badge variant="outline" className="text-xs">{student.grade}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          {searchResults.teachers.length > 0 && (
                            <div className="py-2">
                              <h4 className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase">Teachers</h4>
                              {searchResults.teachers.map(teacher => (
                                <div
                                  key={teacher.id}
                                  className="px-4 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                                  onClick={() => {
                                    if (setActiveTab) setActiveTab('teachers');
                                    if (onSelectTeacher) onSelectTeacher(teacher.id);
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                >
                                  <span className="text-sm font-medium">{teacher.full_name}</span>
                                  <Badge variant="outline" className="text-xs">{teacher.subject}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-1 sm:gap-4">
            <div className="hidden sm:block">
              <OfflineIndicator />
            </div>
            
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel className="flex justify-between items-center">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isLoadingNotifications ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="grid gap-1">
                    {notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={cn(
                          "cursor-pointer flex flex-col items-start gap-1 p-3",
                          !notification.is_read ? "bg-muted/50" : ""
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex w-full items-start gap-2">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 space-y-1">
                            <p className={cn("text-sm font-medium leading-none", !notification.is_read && "font-bold")}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-blue-600 mt-1" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <Bell className="h-8 w-8 opacity-20" />
                    <span>No new notifications</span>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="w-full text-center cursor-pointer justify-center text-primary font-medium">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={displayUser.profileImage} />
                    <AvatarFallback>{displayUser.firstName[0]}{displayUser.lastName ? displayUser.lastName[0] : ''}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                      {displayUser.firstName} {displayUser.lastName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {displayUser.role}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab && setActiveTab('profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab && setActiveTab('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <div className="sm:hidden px-2 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm">
                  <div className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="text-sm">Dark Mode</span>
                  </div>
                  <ThemeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
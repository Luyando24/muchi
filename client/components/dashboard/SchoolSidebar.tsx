import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  ClipboardCheck, 
  DollarSign, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  UserPlus,
  FileText,
  Home,
  School,
  UserCheck,
  Clock,
  ChevronDown,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface SchoolSidebarProps {
  className?: string;
  activeTab?: string;
  onAddStudent?: () => void;
}

export default function SchoolSidebar({ className, activeTab: propActiveTab, onAddStudent }: SchoolSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [expandedGroups, setExpandedGroups] = useState({
    academics: true,
    people: true,
    administration: true
  });

  const toggleGroup = (group) => {
    setExpandedGroups({
      ...expandedGroups,
      [group]: !expandedGroups[group]
    });
  };

  const handleItemClick = (itemId: string) => {
    if (itemId === 'support') {
      navigate('/support');
    } else if (itemId === 'assignments') {
      navigate('/dashboard/assignments');
    } else if (itemId === 'classes') {
      navigate('/dashboard/classes');
    } else if (itemId === 'subjects') {
      navigate('/dashboard/subjects');
    } else if (itemId === 'attendance') {
      navigate('/dashboard/attendance');
    } else if (itemId === 'grades') {
      navigate('/dashboard/grades');
    } else if (itemId === 'timetable') {
      navigate('/dashboard/timetable');
    } else if (itemId === 'finance') {
      navigate('/dashboard/finance');
    } else {
      setActiveTab(itemId);
      // Ensure the parent Tabs component updates its value
      setTimeout(() => {
        const tabsElement = document.querySelector('[data-orientation="horizontal"][role="tablist"]');
        if (tabsElement) {
          const tabButton = tabsElement.querySelector(`[data-value="${itemId}"]`);
          if (tabButton && tabButton instanceof HTMLElement) {
            tabButton.click();
          } else {
            console.log(`Tab button for ${itemId} not found`);
          }
        } else {
          console.log('Tabs element not found');
        }
      }, 0);
    }
  };

  // Group menu items by category
  const menuGroups = {
    main: [
      {
        id: 'overview',
        label: 'Overview',
        icon: Home,
        badge: null,
        href: '/dashboard'
      }
    ],
    people: [
      {
        id: 'students',
        label: 'Students',
        icon: Users,
        badge: '1,247',
        href: '/dashboard/students'
      },
      {
        id: 'teachers',
        label: 'Teachers',
        icon: UserCheck,
        badge: '45',
        href: '/dashboard/teachers'
      }
    ],
    academics: [
      {
        id: 'classes',
        label: 'Classes',
        icon: School,
        badge: '32',
        href: '/dashboard/classes'
      },
      {
        id: 'subjects',
        label: 'Subjects',
        icon: BookOpen,
        badge: null,
        href: '/dashboard/subjects'
      },
      {
        id: 'assignments',
        label: 'Assignments',
        icon: FileText,
        badge: '23',
        href: '/dashboard/assignments'
      },
      {
        id: 'attendance',
        label: 'Attendance',
        icon: ClipboardCheck,
        badge: null,
        href: '/dashboard/attendance'
      },
      {
        id: 'grades',
        label: 'Grades',
        icon: BarChart3,
        badge: null,
        href: '/dashboard/grades'
      },
      {
        id: 'timetable',
        label: 'Timetable',
        icon: Calendar,
        badge: null,
        href: '/dashboard/timetable'
      }
    ],
    administration: [
      {
        id: 'finance',
        label: 'Finance',
        icon: DollarSign,
        badge: '12',
        href: '/dashboard/finance',
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: MessageSquare,
        badge: '5',
        href: '/dashboard/communications',
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
        badge: null,
        href: '/dashboard/reports',
      },
      {
        id: 'support',
        label: 'Support',
        icon: HelpCircle,
        badge: null,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        badge: null,
        href: '/dashboard/settings',
      }
    ]
  };

  return (
    <div className={cn("w-80 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex flex-col", className)}>

      <div className="p-2 space-y-1 flex-grow overflow-y-auto">
          {/* Main items (always visible) */}
          {menuGroups.main.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors h-10",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          {/* People Group */}
          <div className="pt-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 h-8 font-medium text-xs text-muted-foreground"
              onClick={() => toggleGroup('people')}
            >
              {expandedGroups.people ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="flex-1 text-left">PEOPLE</span>
            </Button>
            
            {expandedGroups.people && menuGroups.people.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors h-10 pl-6",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Academics Group */}
          <div className="pt-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 h-8 font-medium text-xs text-muted-foreground"
              onClick={() => toggleGroup('academics')}
            >
              {expandedGroups.academics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="flex-1 text-left">ACADEMICS</span>
            </Button>
            
            {expandedGroups.academics && menuGroups.academics.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors h-10 pl-6",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Administration Group */}
          <div className="pt-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 h-8 font-medium text-xs text-muted-foreground"
              onClick={() => toggleGroup('administration')}
            >
              {expandedGroups.administration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="flex-1 text-left">ADMINISTRATION</span>
            </Button>
            
            {expandedGroups.administration && menuGroups.administration.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              // If item has href, use Link component, otherwise use Button
              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors h-10 pl-6",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              }
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10 pl-6",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => handleItemClick(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>


      {/* Quick Actions */}
      <div className="p-4 border-t mt-auto">
        <div className="space-y-2">
          <Button size="sm" className="w-full justify-start gap-2" onClick={onAddStudent}>
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start gap-2">
            <Clock className="h-4 w-4" />
            Mark Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}
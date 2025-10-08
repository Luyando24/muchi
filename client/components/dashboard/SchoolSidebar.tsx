import { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface SchoolSidebarProps {
  className?: string;
}

export default function SchoolSidebar({ className }: SchoolSidebarProps) {
  const [activeTab, setActiveTab] = useState('overview');
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

  // Group menu items by category
  const menuGroups = {
    main: [
      {
        id: 'overview',
        label: 'Overview',
        icon: Home,
        badge: null,
      }
    ],
    people: [
      {
        id: 'students',
        label: 'Students',
        icon: Users,
        badge: '1,247',
      },
      {
        id: 'teachers',
        label: 'Teachers',
        icon: UserCheck,
        badge: '45',
      }
    ],
    academics: [
      {
        id: 'classes',
        label: 'Classes',
        icon: School,
        badge: '32',
      },
      {
        id: 'subjects',
        label: 'Subjects',
        icon: BookOpen,
        badge: null,
      },
      {
        id: 'assignments',
        label: 'Assignments',
        icon: FileText,
        badge: '23',
      },
      {
        id: 'attendance',
        label: 'Attendance',
        icon: ClipboardCheck,
        badge: null,
      },
      {
        id: 'grades',
        label: 'Grades',
        icon: BarChart3,
        badge: null,
      },
      {
        id: 'timetable',
        label: 'Timetable',
        icon: Calendar,
        badge: null,
      }
    ],
    administration: [
      {
        id: 'finance',
        label: 'Finance',
        icon: DollarSign,
        badge: '12',
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: MessageSquare,
        badge: '5',
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
        badge: null,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        badge: null,
      }
    ]
  };

  return (
    <div className={cn("w-80 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex flex-col", className)}>

      <div className="p-2 space-y-1 flex-grow overflow-y-auto">
          {/* Main items (always visible) */}
          {menuGroups.main.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive && "bg-secondary/80"
                )}
                onClick={() => setActiveTab(item.id)}
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
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10 pl-6",
                    isActive && "bg-secondary/80"
                  )}
                  onClick={() => setActiveTab(item.id)}
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
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10 pl-6",
                    isActive && "bg-secondary/80"
                  )}
                  onClick={() => setActiveTab(item.id)}
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
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10 pl-6",
                    isActive && "bg-secondary/80"
                  )}
                  onClick={() => setActiveTab(item.id)}
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
          <Button size="sm" className="w-full justify-start gap-2">
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
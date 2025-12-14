import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  ClipboardCheck, 
  DollarSign, 
  MessageSquare, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  FileText,
  HelpCircle,
  Home,
  School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface LeftMenuProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function LeftMenu({ 
  collapsed = false, 
  onToggle,
  className,
  activeTab = "dashboard",
  setActiveTab = () => {}
}: LeftMenuProps) {
  const { session } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState({
    main: true,
    academics: true,
    administration: true
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [group]: !expandedGroups[group]
    });
  };

  // Navigation items organized by category
  const menuGroups = {
    main: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        href: '/dashboard'
      }
    ],
    academics: [
      {
        id: 'students',
        label: 'Students',
        icon: Users,
        badge: '120',
        href: '/dashboard/students'
      },
      {
        id: 'classes',
        label: 'Classes',
        icon: School,
        badge: '8',
        href: '/dashboard/classes'
      },
      {
        id: 'subjects',
        label: 'Subjects',
        icon: BookOpen,
        href: '/dashboard/subjects'
      },
      {
        id: 'attendance',
        label: 'Attendance',
        icon: ClipboardCheck,
        href: '/dashboard/attendance'
      },
      {
        id: 'timetable',
        label: 'Timetable',
        icon: Calendar,
        href: '/dashboard/timetable'
      }
    ],
    administration: [
      {
        id: 'finance',
        label: 'Finance',
        icon: DollarSign,
        badge: '12',
        href: '/dashboard/finance'
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: MessageSquare,
        badge: '5',
        href: '/dashboard/communications'
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
        href: '/dashboard/reports'
      },
      {
        id: 'support',
        label: 'Support',
        icon: HelpCircle,
        href: '/support'
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        href: '/dashboard/settings'
      }
    ]
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <School className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Navigation</span>
          </div>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {/* Main Group */}
        {menuGroups.main.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-start",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Button>
          );
        })}

        {/* Academics Group */}
        {!collapsed && (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-8 font-medium text-xs text-muted-foreground"
            onClick={() => toggleGroup('academics')}
          >
            <div className="flex items-center w-full justify-between">
              <span>ACADEMICS</span>
              {expandedGroups.academics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </Button>
        )}
        
        {(expandedGroups.academics || collapsed) && (
          <div className={cn("space-y-1", collapsed && "mt-2")}>
            {menuGroups.academics.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-start",
                    !collapsed && "pl-6",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {/* Administration Group */}
        {!collapsed && (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-8 font-medium text-xs text-muted-foreground"
            onClick={() => toggleGroup('administration')}
          >
            <div className="flex items-center w-full justify-between">
              <span>ADMINISTRATION</span>
              {expandedGroups.administration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </Button>
        )}
        
        {(expandedGroups.administration || collapsed) && (
          <div className={cn("space-y-1", collapsed && "mt-2")}>
            {menuGroups.administration.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-start",
                    !collapsed && "pl-6",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            <p>MUCHI v1.0</p>
            <p>School Management</p>
          </div>
        )}
      </div>
    </div>
  );
}
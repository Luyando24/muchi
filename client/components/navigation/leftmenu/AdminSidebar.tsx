import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  Shield, 
  Database,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: BarChart3,
    description: 'Overview and analytics'
  },
  {
    title: 'Schools',
    href: '/admin/schools',
    icon: Building,
    description: 'Manage schools'
  },
  {
    title: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: CreditCard,
    description: 'Billing and plans'
  },
  {
    title: 'Super Admins',
    href: '/admin/super-admins',
    icon: Shield,
    description: 'Admin user management'
  },
  {
    title: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration'
  },
  {
    title: 'Database',
    href: '/admin/database',
    icon: Database,
    description: 'Database management'
  },
  {
    title: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    description: 'System notifications'
  },
  {
    title: 'Support',
    href: '/admin/support',
    icon: HelpCircle,
    description: 'Help and support'
  }
];

export default function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const location = useLocation();

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Admin Panel</span>
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
      <nav className="flex-1 p-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          // Fix: Check if the current path starts with the item's href to handle nested routes
          const isActive = location.pathname === item.href || 
                          (item.href !== '/admin' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  <span className="text-xs opacity-70">{item.description}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            <p>MUCHI Admin v1.0</p>
            <p>System Management</p>
          </div>
        )}
      </div>
    </div>
  );
}
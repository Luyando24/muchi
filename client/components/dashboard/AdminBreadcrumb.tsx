import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminBreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  items?: AdminBreadcrumbItem[];
  className?: string;
}

const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({ items, className }) => {
  const location = useLocation();
  
  // Generate breadcrumbs from URL if items not provided
  const generateBreadcrumbs = (): AdminBreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: AdminBreadcrumbItem[] = [];
    
    // Always start with Admin Dashboard
    breadcrumbs.push({ label: 'Admin Dashboard', href: '/admin' });
    
    // Map admin routes to readable names
    const routeMap: Record<string, string> = {
      'schools': 'Schools',
      'subscriptions': 'Subscriptions',
      'super-admins': 'Super Admins',
      'settings': 'System Settings',
      'database': 'Database',
      'notifications': 'Notifications',
      'support': 'Support',
      'analytics': 'Analytics',
      'users': 'Users',
      'billing': 'Billing',
      'reports': 'Reports'
    };
    
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      if (segment === 'admin') return; // Skip the admin segment
      
      currentPath += `/${segment}`;
      const fullPath = `/admin${currentPath}`;
      
      // Use mapped name or capitalize segment
      const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Don't add href for the last segment (current page)
      const isLast = index === pathSegments.length - 1;
      breadcrumbs.push({
        label,
        href: isLast ? undefined : fullPath
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbItems = items || generateBreadcrumbs();
  
  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      <Shield className="h-4 w-4 text-primary" />
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.href ? (
            <Link
              to={item.href}
              className="hover:text-foreground transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default AdminBreadcrumb;
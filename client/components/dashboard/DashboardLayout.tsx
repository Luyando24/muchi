import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import ErrorBoundary from './ErrorBoundary';
import { logError } from '../../lib/errorUtils';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import TopNavigation from '@/components/navigation/topmenu/TopNavigation';
import LeftMenu from '@/components/navigation/leftmenu/LeftMenu';
import StudentsTab from './StudentsTab';
import SupportTab from './SupportTab';
import ClassesTab from './ClassesTab';
import SubjectsTab from './SubjectsTab';
import TimetableTab from './TimetableTab';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isAdmin?: boolean;
  activeTab?: string;
  onAddStudent?: () => void;
  studentCount?: number;
  teacherCount?: number;
  classCount?: number;
}

export default function DashboardLayout({
  children,
  title,
  subtitle,
  icon,
  isAdmin = false,
  activeTab,
  onAddStudent,
  studentCount,
  teacherCount,
  classCount
}: DashboardLayoutProps) {
  const { session } = useAuth();
  const [renderError, setRenderError] = useState<Error | null>(null);
  
  // Validate required props and log initialization
  useEffect(() => {
    try {
      console.log('[DashboardLayout] Initializing with props:', { 
        title, 
        isAdmin, 
        activeTab, 
        hasChildren: !!children,
        sessionRole: session?.role
      });
      
      if (isAdmin && !activeTab) {
        console.warn('[DashboardLayout] Warning: Admin view without activeTab specified');
      }
      
      if (!children) {
        console.warn('[DashboardLayout] Warning: No children provided');
      }
    } catch (error) {
      logError(error as Error, 'DashboardLayout', { message: 'Error during initialization' });
      setRenderError(error as Error);
    }
  }, [title, isAdmin, activeTab, children, session?.role]);

  // Error fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md flex items-center space-x-4">
        <AlertTriangle className="h-12 w-12 text-destructive flex-shrink-0" />
        <div>
          <h3 className="text-xl font-medium text-destructive">Dashboard Error</h3>
          <p className="text-gray-500 mt-1">There was a problem loading the dashboard.</p>
          <p className="text-xs text-gray-400 mt-2">{error.message}</p>
          <Button 
            className="mt-4" 
            onClick={() => {
              setRenderError(null);
              window.location.reload();
            }}
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );

  // If there's a render error, show the error fallback
  if (renderError) {
    return <ErrorFallback error={renderError} />;
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Use the activeTab from props or default to "dashboard"
  const [localActiveTab, setLocalActiveTab] = useState(activeTab || "dashboard");
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  try {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background flex flex-col">
          {/* Top Navigation - Single instance across all pages */}
          <TopNavigation 
            toggleSidebar={toggleSidebar}
            sidebarCollapsed={sidebarCollapsed}
          />
          
          <div className="flex flex-1">
            {/* Left Menu */}
            <LeftMenu 
              collapsed={sidebarCollapsed}
              toggleCollapsed={toggleSidebar}
              activeTab={localActiveTab}
              setActiveTab={setLocalActiveTab}
            />
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-auto">
              <Tabs value={localActiveTab} className="w-full">
                <TabsContent value="dashboard" className="mt-0">
                  <div className="p-6">
                    {children}
                  </div>
                </TabsContent>
                <TabsContent value="students" className="mt-0">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Students Management</h2>
                    <StudentsTab />
                  </div>
                </TabsContent>
                <TabsContent value="classes" className="mt-0">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Classes Management</h2>
                    <ClassesTab />
                  </div>
                </TabsContent>
                <TabsContent value="subjects" className="mt-0">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Subjects Management</h2>
                    <SubjectsTab />
                  </div>
                </TabsContent>
                <TabsContent value="schedule" className="mt-0">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Schedule Management</h2>
                    <TimetableTab />
                  </div>
                </TabsContent>
                <TabsContent value="settings" className="mt-0">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Settings</h2>
                    <SupportTab />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    logError(error as Error, 'DashboardLayout', { message: 'Fatal rendering error' });
    setRenderError(error as Error);
    return <ErrorFallback error={error as Error} />;
  }
}
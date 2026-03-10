import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  Calendar,
  Settings,
  CreditCard,
  PieChart,
} from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import SchoolDashboard from '@/components/school-admin/SchoolDashboard';
import StudentManagement from '@/components/school-admin/StudentManagement';
import TeacherManagement from '@/components/school-admin/TeacherManagement';
import AcademicManagement from '@/components/school-admin/AcademicManagement';
import GradebookView from '@/components/school-admin/GradebookView';
import FinanceManagement from '@/components/school-admin/FinanceManagement';
import ReportsManagement from '@/components/school-admin/ReportsManagement';
import CalendarManagement from '@/components/school-admin/CalendarManagement';
import SchoolSettings from '@/components/school-admin/SchoolSettings';
import SchoolAdminNavbar from '@/components/school-admin/SchoolAdminNavbar';
import { syncFetch } from '@/lib/syncService';
import LicenseAccessDenied from '@/components/common/LicenseAccessDenied';
import { useToast } from "@/components/ui/use-toast";

// Mock data for School Admin Portal
const adminData = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  profileImage: ""
};

export default function SchoolAdminPortal() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const navigate = useNavigate();

  // Check license and pre-fetch critical data for offline use
  useEffect(() => {
    const initializePortal = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = { Authorization: `Bearer ${session.access_token}` };

        // 1. License Check (HEAD request)
        const response = await fetch('/api/school/dashboard', {
          method: 'HEAD',
          headers
        });

        if (response.status === 403) {
          setLicenseError("Your school license has expired or is invalid.");
        }

        // 2. Pre-fetch School Settings (Foundation for all other data)
        const settings = await syncFetch('/api/school/settings', { 
          headers, 
          cacheKey: 'school-settings' 
        });

        // 3. If settings available, pre-fetch current term finance data
        if (settings) {
          const term = settings.current_term || 'Term 1';
          const year = settings.academic_year || new Date().getFullYear().toString();
          
          console.log(`[Offline] Pre-fetching Finance data for ${term} ${year}...`);
          
          syncFetch(`/api/school/finance?term=${term}&academic_year=${year}`, { 
            headers, 
            cacheKey: `school-finance-transactions-${term}-${year}` 
          }).catch(() => {});
          
          syncFetch(`/api/school/finance/stats?term=${term}&academic_year=${year}`, { 
            headers, 
            cacheKey: `school-finance-stats-${term}-${year}` 
          }).catch(() => {});
        }

        // 4. Pre-fetch Teachers & Subjects for Offline Management
        console.log('[Offline] Pre-fetching Management Data...');
        syncFetch('/api/school/teachers', { headers, cacheKey: 'school-teachers-list' }).catch(() => {});
        syncFetch('/api/school/subjects', { headers, cacheKey: 'school-subjects-list' }).catch(() => {});
        syncFetch('/api/school/students', { headers, cacheKey: 'school-students-list' }).catch(() => {});
        syncFetch('/api/school/classes', { headers, cacheKey: 'school-classes-list' }).catch(() => {});
        syncFetch('/api/school/calendar', { headers, cacheKey: 'school-calendar-events' }).catch(() => {});

      } catch (error) {
        console.error("Portal initialization failed:", error);
      } finally {
        setIsLoadingLicense(false);
      }
    };

    initializePortal();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/login');
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: GraduationCap },
    { id: "teachers", label: "Teachers", icon: Users },
    { id: "academics", label: "Academics & Results", icon: Building2 },
    { id: "gradebook", label: "Gradebook", icon: GraduationCap },
    { id: "finance", label: "Finance", icon: CreditCard },
    { id: "reports", label: "Reports", icon: PieChart },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  if (isLoadingLicense) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (licenseError) {
    return <LicenseAccessDenied message={licenseError} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <SchoolAdminNavbar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">System Status</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <p className="text-xs text-blue-600 dark:text-blue-300">All Systems Operational</p>
                </div>
                <Button size="sm" variant="outline" className="w-full text-xs">View Logs</Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-64px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <SchoolDashboard />
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-6">
              <StudentManagement />
            </TabsContent>

            {/* Teachers Tab */}
            <TabsContent value="teachers" className="space-y-6">
              <TeacherManagement />
            </TabsContent>

            {/* Academics Tab */}
            <TabsContent value="academics" className="space-y-6">
              <AcademicManagement />
            </TabsContent>

            {/* Gradebook Tab */}
            <TabsContent value="gradebook" className="space-y-6">
              <GradebookView />
            </TabsContent>

            {/* Finance Tab */}
            <TabsContent value="finance" className="space-y-6">
              <FinanceManagement />
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <ReportsManagement />
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="space-y-6">
              <CalendarManagement />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <SchoolSettings />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

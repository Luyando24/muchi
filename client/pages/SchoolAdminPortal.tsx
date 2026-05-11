import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  GraduationCap,
  Building2,
  Calendar,
  Settings,
  CreditCard,
  PieChart,
  Globe,
  Utensils,
  ShieldAlert
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
import WebsiteManagement from '@/components/school-admin/WebsiteManagement';
import FeedingProgramManagement from '@/components/school-admin/FeedingProgramManagement';
import ApplicationsView from '@/components/school-admin/ApplicationsView';
import { GradeAnomalies } from '@/components/school-admin/GradeAnomalies';
import SchoolAdminNavbar from '@/components/school-admin/SchoolAdminNavbar';
import { syncFetch } from '@/lib/syncService';
import LicenseAccessDenied from '@/components/common/LicenseAccessDenied';
import { useToast } from "@/components/ui/use-toast";
import OnboardingTutorial from '@/components/school-admin/OnboardingTutorial';
import { cn } from '@/lib/utils';


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
  const navigate = useNavigate();
  const location = useLocation();
  
  // Derive active tab from pathname (e.g., /school-admin/students -> students)
  const activeTab = location.pathname === '/school-admin' || location.pathname === '/school-admin/' 
    ? "dashboard" 
    : location.pathname.split('/').pop() || "dashboard";

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [showTutorial, setShowTutorial] = useState(false);


  // Listen for hash changes to support direct linking to tabs
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#data-audit') {
        navigate('/school-admin/data-audit');
      }
    };
    
    // Check initial hash
    handleHashChange();
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check license and pre-fetch critical data for offline use
  useEffect(() => {
    const initializePortal = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch user profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, has_completed_onboarding')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUserRole(profile.role);
          setUserId(session.user.id);
          // Only show tutorial for school admins who haven't completed it
          if (profile.role === 'school_admin' && !profile.has_completed_onboarding) {
            setShowTutorial(true);
          }
        }


        const headers = { Authorization: `Bearer ${session.access_token}` };

        // 1. License Check (HEAD request)
        const response = await fetch('/api/school/dashboard', {
          method: 'HEAD',
          headers
        });

        if (response.status === 403) {
          // If 403, it could be license or role/profile issues
          // Let's try a GET to get the error message
          const getRes = await fetch('/api/school/dashboard', {
            method: 'GET',
            headers
          });
          const errorData = await getRes.json().catch(() => ({ message: "Your school license has expired or is invalid." }));
          setLicenseError(errorData.message || "Your school license has expired or is invalid.");
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
        syncFetch('/api/school/grading-scales', { headers, cacheKey: 'school-grading-scales' }).catch(() => {});

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

  const sidebarGroups = [
    {
      label: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["school_admin", "bursar", "registrar", "exam_officer", "academic_auditor", "accounts", "content_manager"] },
        { id: "calendar", label: "Calendar", icon: Calendar, roles: ["school_admin", "registrar"] },
      ]
    },
    {
      label: "Management",
      items: [
        { id: "applications", label: "Applications", icon: UserPlus, roles: ["school_admin", "registrar", "academic_auditor"] },
        { id: "students", label: "Students", icon: Users, roles: ["school_admin", "registrar", "academic_auditor"] },
        { id: "teachers", label: "Teachers", icon: GraduationCap, roles: ["school_admin", "registrar", "academic_auditor"] },
      ]
    },
    {
      label: "Academic",
      items: [
        { id: "academics", label: "Academics & Results", icon: Building2, roles: ["school_admin", "registrar", "exam_officer", "academic_auditor"] },
        { id: "gradebook", label: "Gradebook", icon: GraduationCap, roles: ["school_admin", "teacher", "exam_officer"] },
        { id: "reports", label: "Reports", icon: PieChart, roles: ["school_admin", "academic_auditor"] },
        { id: "data-audit", label: "Data Audit", icon: ShieldAlert, roles: ["school_admin", "exam_officer", "academic_auditor"] },
      ]
    },
    {
      label: "Operations",
      items: [
        { id: "finance", label: "Finance", icon: CreditCard, roles: ["school_admin", "bursar", "accounts", "academic_auditor"] },
        { id: "feeding_program", label: "Feeding Program", icon: Utensils, roles: ["school_admin", "bursar", "content_manager"] },
        { id: "website", label: "Website", icon: Globe, roles: ["school_admin", "content_manager"] },
      ]
    },
    {
      label: "System",
      items: [
        { id: "settings", label: "Settings", icon: Settings, roles: ["school_admin"] }
      ]
    }
  ];

  const filteredSidebarGroups = sidebarGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || item.roles.includes(userRole))
  })).filter(group => group.items.length > 0);

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
        setActiveTab={(tab) => navigate(`/school-admin/${tab}`)}
        onSelectStudent={setSelectedStudentId}
        onSelectTeacher={setSelectedTeacherId}
        onLogout={handleLogout}
      />

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {filteredSidebarGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.id}
                          id={`sidebar-${item.id}`}
                          variant={activeTab === item.id ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start h-9 px-4 transition-all duration-200",
                            activeTab === item.id 
                              ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                          )}
                          onClick={() => {
                            navigate(`/school-admin/${item.id}`);
                            setIsSidebarOpen(false);
                          }}
                        >
                          <Icon className={cn(
                            "h-4 w-4 mr-3 transition-transform",
                            activeTab === item.id ? "scale-110" : "scale-100"
                          )} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto h-[calc(100vh-64px)] pb-24 lg:pb-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            
            <Route path="dashboard" element={
              <div className="space-y-6">
                <SchoolDashboard onRelaunchTutorial={() => setShowTutorial(true)} />
              </div>
            } />

            <Route path="applications" element={
              <div className="space-y-6">
                <ApplicationsView />
              </div>
            } />

            <Route path="students" element={
              <div className="space-y-6">
                <StudentManagement 
                  initialViewId={selectedStudentId} 
                  onClearViewId={() => setSelectedStudentId(null)} 
                />
              </div>
            } />

            <Route path="teachers" element={
              <div className="space-y-6">
                <TeacherManagement 
                  initialViewId={selectedTeacherId} 
                  onClearViewId={() => setSelectedTeacherId(null)} 
                />
              </div>
            } />

            <Route path="academics" element={
              <div className="space-y-6">
                <AcademicManagement />
              </div>
            } />

            <Route path="gradebook" element={
              <div className="space-y-6">
                <GradebookView />
              </div>
            } />

            <Route path="finance" element={
              <div className="space-y-6">
                <FinanceManagement />
              </div>
            } />

            <Route path="reports" element={
              <div className="space-y-6">
                <ReportsManagement />
              </div>
            } />

            <Route path="website" element={
              <div className="space-y-6">
                <WebsiteManagement />
              </div>
            } />

            <Route path="feeding_program" element={
              <div className="space-y-6">
                <FeedingProgramManagement />
              </div>
            } />

            <Route path="calendar" element={
              <div className="space-y-6">
                <CalendarManagement />
              </div>
            } />

            <Route path="settings" element={
              <div className="space-y-6">
                <SchoolSettings />
              </div>
            } />

            <Route path="data-audit" element={
              <div className="space-y-6">
                <GradeAnomalies />
              </div>
            } />
          </Routes>
        </main>
      </div>

      {showTutorial && (
        <OnboardingTutorial 
          userId={userId} 
          onComplete={() => setShowTutorial(false)} 
          onStepChange={(tab) => navigate(`/school-admin/${tab}`)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40 px-2 py-2 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {[
            filteredSidebarGroups.flatMap(g => g.items).find(i => i.id === 'dashboard'),
            filteredSidebarGroups.flatMap(g => g.items).find(i => i.id === 'students'),
            filteredSidebarGroups.flatMap(g => g.items).find(i => i.id === 'academics'),
            filteredSidebarGroups.flatMap(g => g.items).find(i => i.id === 'finance'),
            filteredSidebarGroups.flatMap(g => g.items).find(i => i.id === 'settings')
          ].map((item) => {
            if (!item) return null;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/school-admin/${item.id}`)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[64px] ${
                  activeTab === item.id 
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${activeTab === item.id ? "scale-110" : "scale-100"} transition-transform`} />
                <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

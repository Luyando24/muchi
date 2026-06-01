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
  ShieldAlert,
  Receipt,
  Mail,
  Phone,
  Save
} from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SchoolDashboard from '@/components/school-admin/SchoolDashboard';
import StudentManagement from '@/components/school-admin/StudentManagement';
import TeacherManagement from '@/components/school-admin/TeacherManagement';
import AcademicManagement from '@/components/school-admin/AcademicManagement';
import GradebookView from '@/components/school-admin/GradebookView';
import FinanceManagement from '@/components/school-admin/FinanceManagement';
import SchoolFeesManagement from '@/components/school-admin/SchoolFeesManagement';
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
import { isOnSubdomain } from '@/lib/subdomain';
import { markSettingsCompletionPopupEligibleInOneMinute } from '@/lib/settingsCompletionPrompt';
import { getProfileSchoolId, schoolCacheKey } from '@/lib/schoolScope';
import SubscriptionReminder from '@/components/common/SubscriptionReminder';
import SetupReminder from '@/components/common/SetupReminder';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


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
  const activeTab = location.pathname === '/school-admin' || location.pathname === '/school-admin/' || location.pathname === '/' || location.pathname === ''
    ? "dashboard" 
    : location.pathname.split('/').pop() || "dashboard";

  const portalBase = isOnSubdomain() ? '' : '/school-admin';

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSubscriptionReminder, setShowSubscriptionReminder] = useState(false);
  const [showSetupReminder, setShowSetupReminder] = useState(false);
  const [setupStats, setSetupStats] = useState({ classes: 0, subjects: 0, teachers: 0, students: 0, assignments: 0 });
  const [setupRewardClaimed, setSetupRewardClaimed] = useState(false);
  const [setupRewardDays, setSetupRewardDays] = useState(30);
  const [setupReminderMandatory, setSetupReminderMandatory] = useState(false);
  const [subscriptionReminderMandatory, setSubscriptionReminderMandatory] = useState(false);
  const [schoolNameForReminder, setSchoolNameForReminder] = useState("");
  const [schoolIdForReminder, setSchoolIdForReminder] = useState("");
  const [subscriptionVariant, setSubscriptionVariant] = useState<'renew' | 'onboarding'>('renew');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [ictForm, setIctForm] = useState({ ict_name: '', ict_email: '', ict_phone: '' });
  const [isSavingIct, setIsSavingIct] = useState(false);
  const { toast } = useToast();


  // Listen for hash changes to support direct linking to tabs
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#data-audit') {
        navigate(`${portalBase}/data-audit`);
      }
    };
    
    // Check initial hash
    handleHashChange();
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check license and pre-fetch critical data for offline use
  useEffect(() => {
    const initializePortal = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch user profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, secondary_role, has_completed_onboarding, school_id')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUserRole(profile.role);
          setUserId(session.user.id);
          // Only show tutorial for school admins who haven't completed it
          if (profile.role === 'school_admin' && !profile.has_completed_onboarding) {
            setShowTutorial(true);
          }

          // Check for subscription reminder and setup completion status if user is a school admin
          const isAdmin = profile.role === 'school_admin' || profile.secondary_role === 'school_admin';
          if (isAdmin && profile.school_id) {
            const schoolId = profile.school_id;
            setSchoolIdForReminder(schoolId);
            
            // 1. Fetch school details (registration date, name, category, setup_reward_claimed, setup_reward_days_applied)
            const { data: school } = await supabase
              .from('schools')
              .select('created_at, name, category, setup_reward_claimed, setup_reward_days_applied')
              .eq('id', schoolId)
              .single();
              
            if (school) {
              setSchoolNameForReminder(school.name);
              setSetupRewardClaimed(!!school.setup_reward_claimed);

              const { data: rewardSetting } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'setup_completion_reward_days')
                .maybeSingle();
              const rewardDays = parseInt(rewardSetting?.value || '30') || 30;
              setSetupRewardDays(rewardDays);

              const regDate = new Date(school.created_at);
              const daysSinceReg = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24);
              const setupDaysApplied = school.setup_reward_days_applied || 0;
              const trialPeriod = 30 + setupDaysApplied;
              
              // A. Fetch license status if registration is older than trialPeriod
              let hasLicense = false;
              if (daysSinceReg > trialPeriod) {
                const { data: licenses } = await supabase
                  .from('school_licenses')
                  .select('id')
                  .eq('school_id', schoolId)
                  .eq('status', 'active')
                  .gt('end_date', new Date().toISOString());
                hasLicense = licenses && licenses.length > 0;
              }

              // B. Fetch setup completion counts
              const { data: classesData } = await supabase
                .from('classes')
                .select('id')
                .eq('school_id', schoolId);
              const classesCount = classesData?.length || 0;
              const classIds = classesData?.map((c: any) => c.id) || [];

              const { data: subjectsData } = await supabase
                .from('subjects')
                .select('id')
                .eq('school_id', schoolId);
              const subjectsCount = subjectsData?.length || 0;

              let allocationsCount = 0;
              if (classIds.length > 0) {
                const { data: allocationsData } = await supabase
                  .from('class_subjects')
                  .select('id')
                  .in('class_id', classIds);
                allocationsCount = allocationsData?.length || 0;
              }

              const { count: teachersCount } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('role', 'teacher')
                .or('employment_status.neq.Terminated,employment_status.is.null');

              const { count: studentsCount } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('role', 'student');

              setSetupStats({
                classes: classesCount,
                subjects: subjectsCount || 0,
                teachers: teachersCount || 0,
                students: studentsCount || 0,
                assignments: allocationsCount
              });

              // Calculate if setup is complete
              const isSetupComplete = classesCount >= 5 && (subjectsCount || 0) >= 5 && allocationsCount >= 10;
              // Set mandatory flag if registered > 5 days and setup is incomplete
              setSetupReminderMandatory(daysSinceReg > 5 && !isSetupComplete);
              setSubscriptionReminderMandatory(daysSinceReg > 5 && !isSetupComplete);

              // C. Determine reminder to show (prioritize license if expired/needs renewal)
              let showingLicenseReminder = false;
              if (daysSinceReg > trialPeriod && !hasLicense) {
                const dismissedUntil = localStorage.getItem(`school_license_reminder_dismissed_until_${schoolId}`);
                if (!dismissedUntil || Date.now() > parseInt(dismissedUntil)) {
                  // Determine variant based on school size & category
                  const isPrivate = school.category?.toLowerCase().includes('private');
                  let isOnboarded = isPrivate;

                  if (!isPrivate) {
                    // Count teachers and students in parallel
                    const [teacherRes, studentRes] = await Promise.all([
                      supabase
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .eq('school_id', schoolId)
                        .eq('role', 'teacher')
                        .or('employment_status.neq.Terminated,employment_status.is.null'),
                      supabase
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .eq('school_id', schoolId)
                        .eq('role', 'student')
                    ]);
                    const teacherCount = teacherRes.count || 0;
                    const studentCount = studentRes.count || 0;
                    isOnboarded = teacherCount > 20 && studentCount > 500;
                  }

                  setSubscriptionVariant(isOnboarded ? 'renew' : 'onboarding');
                  setShowSubscriptionReminder(true);
                  showingLicenseReminder = true;
                }
              }

              // Show setup completion reminder if subscription reminder isn't active AND no valid license
              if (!showingLicenseReminder && !hasLicense) {
                const isSetupIncomplete = classesCount < 5 || (subjectsCount || 0) < 5 || allocationsCount < 10;
                if (isSetupIncomplete) {
                  const setupDismissedUntil = localStorage.getItem(`school_setup_reminder_dismissed_until_${schoolId}`);
                  if (!setupDismissedUntil || Date.now() > parseInt(setupDismissedUntil)) {
                    setShowSetupReminder(true);
                  }
                }
              }
            }
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

        const profileSchoolId = profile?.school_id ?? (await getProfileSchoolId());

        // 2. Pre-fetch School Settings (Foundation for all other data)
        const settings = await syncFetch('/api/school/settings', { 
          headers, 
          cacheKey: schoolCacheKey('school-settings', profileSchoolId),
        });
        setSchoolSettings(settings);
        const schoolId = profileSchoolId ?? settings?.id ?? null;

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
        syncFetch('/api/school/grading-scales', { headers, cacheKey: schoolCacheKey('school-grading-scales', schoolId) }).catch(() => {});

      } catch (error) {
        console.error("Portal initialization failed:", error);
      } finally {
        setIsLoadingLicense(false);
      }
    };

    initializePortal();
  }, [refreshTrigger]);

  const isIctMissing = userRole === 'school_admin' && (
    !schoolSettings ||
    !schoolSettings.ict_name?.trim() ||
    !schoolSettings.ict_email?.trim() ||
    !schoolSettings.ict_phone?.trim()
  );

  useEffect(() => {
    if (schoolSettings) {
      setIctForm({
        ict_name: schoolSettings.ict_name || '',
        ict_email: schoolSettings.ict_email || '',
        ict_phone: schoolSettings.ict_phone || '',
      });
    }
  }, [schoolSettings]);

  const handleIctInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIctForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveIct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ictForm.ict_name.trim() || !ictForm.ict_email.trim() || !ictForm.ict_phone.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please enter the full name, email, and phone number for your ICT support contact.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingIct(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...schoolSettings,
          ...ictForm,
          exam_types: ['Mid Term', 'End of Term'],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save ICT contact details');
      }

      const updatedSchool = await response.json();
      setSchoolSettings(updatedSchool);
      markSettingsCompletionPopupEligibleInOneMinute();
      toast({
        title: "Contact saved",
        description: "ICT support details saved. You can now use all platform features.",
      });
    } catch (error: any) {
      console.error('Error saving ICT details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save ICT contact details.",
        variant: "destructive",
      });
    } finally {
      setIsSavingIct(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/login');
    }
  };

  const handleSnoozeReminder = () => {
    if (schoolIdForReminder) {
      const snoozeUntil = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days
      localStorage.setItem(`school_license_reminder_dismissed_until_${schoolIdForReminder}`, snoozeUntil.toString());
    }
    setShowSubscriptionReminder(false);
  };

  const handleCloseReminder = () => {
    setShowSubscriptionReminder(false);
  };

  const handleSnoozeSetupReminder = () => {
    if (schoolIdForReminder) {
      const snoozeUntil = Date.now() + 1 * 24 * 60 * 60 * 1000; // 1 day
      localStorage.setItem(`school_setup_reminder_dismissed_until_${schoolIdForReminder}`, snoozeUntil.toString());
    }
    setShowSetupReminder(false);
  };

  const handleCloseSetupReminder = () => {
    setShowSetupReminder(false);
  };

  const handleClaimReward = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/setup/claim-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to claim reward');
      }

      const result = await response.json();
      setSetupRewardClaimed(true);
      setShowSetupReminder(false);
      toast({
        title: "Reward Claimed!",
        description: result.message || `Successfully claimed ${setupRewardDays} free days!`,
      });
      
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error claiming setup reward:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim setup reward.",
        variant: "destructive",
      });
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
        { id: "reports", label: "Academic performance", icon: PieChart, roles: ["school_admin", "academic_auditor"] },
        { id: "data-audit", label: "Data Audit", icon: ShieldAlert, roles: ["school_admin", "exam_officer", "academic_auditor"] },
      ]
    },
    {
      label: "Operations",
      items: [
        { id: "finance", label: "Finance (Ledger)", icon: CreditCard, roles: ["school_admin", "bursar", "accounts", "academic_auditor"] },
        { id: "fees", label: "School Fees", icon: Receipt, roles: ["school_admin", "bursar", "accounts"] },
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
        setActiveTab={(tab) => navigate(`${portalBase}/${tab}`)}
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
                            navigate(`${portalBase}/${item.id}`);
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

            <Route path="fees" element={
              <div className="space-y-6">
                <SchoolFeesManagement />
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
                <SchoolSettings onSettingsSaved={(newSettings) => setSchoolSettings(newSettings)} />
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
          onComplete={() => setShowTutorial(false)}
          onStepChange={(tab) => navigate(`${portalBase}/${tab}`)}
          userId={userId}
        />
      )}

      <SubscriptionReminder
        isOpen={showSubscriptionReminder}
        onClose={handleCloseReminder}
        onSnooze={handleSnoozeReminder}
        schoolName={schoolNameForReminder}
        variant={subscriptionVariant}
        setupProgress={Math.round(
          (Math.min((setupStats.classes / 5) * 100, 100) +
           Math.min((setupStats.subjects / 5) * 100, 100) +
           Math.min((setupStats.teachers / 5) * 100, 100) +
           Math.min((setupStats.students / 20) * 100, 100) +
           Math.min((setupStats.assignments / 10) * 100, 100)) / 5
        )}
        rewardDays={setupRewardDays}
        rewardClaimed={setupRewardClaimed}
        onClaimReward={handleClaimReward}
        isMandatory={subscriptionReminderMandatory}
      />

      <SetupReminder
        isOpen={showSetupReminder}
        onClose={handleCloseSetupReminder}
        onSnooze={handleSnoozeSetupReminder}
        schoolName={schoolNameForReminder}
        stats={setupStats}
        onNavigateToSetup={() => {
          setShowSetupReminder(false);
          navigate(`${portalBase}/academics`);
        }}
        rewardDays={setupRewardDays}
        rewardClaimed={setupRewardClaimed}
        onClaimReward={handleClaimReward}
        onRefreshStats={() => setRefreshTrigger(prev => prev + 1)}
        isMandatory={setupReminderMandatory}
      />

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
                onClick={() => navigate(`${portalBase}/${item.id}`)}
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
      {isIctMissing && (
        <Dialog open={isIctMissing}>
          <DialogContent
            className="sm:max-w-[500px] border border-blue-100 dark:border-blue-900/50 shadow-2xl bg-white dark:bg-slate-900 [&>button.absolute]:hidden"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center border border-amber-200 dark:border-amber-900 animate-pulse">
                <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="text-center text-xl font-black text-slate-900 dark:text-white">
                Data / ICT Support Required
              </DialogTitle>
              <DialogDescription className="text-center text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                To continue using MUCHI, you must configure the contact details for your school's designated Data or ICT Support Personnel.
                <span className="block mt-2 font-semibold text-blue-600 dark:text-blue-400">
                  This contact information is mandatory and will be displayed to teachers so they can request profile updates or support.
                </span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveIct} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal_ict_name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Full Names <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="modal_ict_name"
                  name="ict_name"
                  value={ictForm.ict_name}
                  onChange={handleIctInputChange}
                  placeholder="e.g. Jane Mulenga"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal_ict_email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="modal_ict_email"
                    name="ict_email"
                    type="email"
                    value={ictForm.ict_email}
                    onChange={handleIctInputChange}
                    className="pl-9"
                    placeholder="ict@school.edu"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal_ict_phone" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Phone Number (WhatsApp) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="modal_ict_phone"
                    name="ict_phone"
                    value={ictForm.ict_phone}
                    onChange={handleIctInputChange}
                    className="pl-9"
                    placeholder="+260..."
                    required
                  />
                </div>
              </div>
              <SubmitButton
                type="submit"
                className="w-full"
                loading={isSavingIct}
                loadingText="Saving..."
                disabled={!schoolSettings}
              >
                <Save className="mr-2 h-4 w-4" />
                Save & Continue
              </SubmitButton>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

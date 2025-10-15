import "./global.css";
import "./styles/card-animations.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthLogin from "./pages/AuthLogin";
import AdminLogin from "./pages/AdminLogin";
import SchoolDashboard from "./pages/SchoolDashboard";
import StudentInformationSystem from "./pages/StudentInformationSystem";
import TeacherManagement from "./pages/TeacherManagement";
import AcademicManagement from "./pages/AcademicManagement";
import ClassesManagement from "./pages/ClassesManagement";
import SubjectsManagement from "./pages/SubjectsManagement";
import AttendanceTracking from "./pages/AttendanceTracking";
import GradesManagement from "./pages/GradesManagement";
import TimetableManagement from "./pages/TimetableManagement";
import ParentPortal from "./pages/ParentPortal";
import FinanceManagement from './pages/FinanceManagement';
import CommunicationsManagement from './pages/CommunicationsManagement';
import ReportsManagement from './pages/ReportsManagement';
import EMISExport from './pages/EMISExport';
import Register from "./pages/Register";
import SaasAdminDashboard from "./pages/SaasAdminDashboard";
import SuperAdmins from "./pages/SuperAdmins";
import Schools from "./pages/Schools";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import SystemSettings from "./pages/SystemSettings";
import SchoolSettings from "./pages/SchoolSettings";
import NotificationsPage from "./pages/NotificationsPage";
import UserSupportPage from "./pages/UserSupportPage";
import AdminSupportManagement from "./pages/AdminSupportManagement";
import DatabaseManagement from "./pages/DatabaseManagement";
import SchoolWebsite from "./pages/SchoolWebsite";

import SchoolFaculty from "./pages/SchoolFaculty";
import SchoolAdmissions from "./pages/SchoolAdmissions";
import SchoolContact from "./pages/SchoolContact";
import StudentPortal from "./pages/StudentPortal";
import { useEffect } from "react";
import { syncService } from "@/lib/sync";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    syncService.start();
    return () => syncService.stop();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider attribute="class" defaultTheme="dark">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<AuthLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/register" element={<Register />} />
              
              {/* Public School Website Routes */}
              <Route path="/school/:schoolId" element={<SchoolWebsite />} />
      
              <Route path="/school/:schoolId/faculty" element={<SchoolFaculty />} />
              <Route path="/school/:schoolId/admissions" element={<SchoolAdmissions />} />
              <Route path="/school/:schoolId/contact" element={<SchoolContact />} />
              <Route path="/school" element={<SchoolWebsite />} />
              
              {/* Student Portal - No auth required for UI development */}
              <Route path="/student-portal" element={<StudentPortal />} />
              
              {/* Protected School Portal Routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher", "teacher", "accountant"]} />}>
                <Route path="/school" element={<SchoolDashboard />} />
                <Route path="/dashboard" element={<SchoolDashboard />} />
              </Route>
              
              {/* Student Management - Admin, Headteacher, Teacher */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher", "teacher"]} />}>
                <Route path="/students" element={<StudentInformationSystem />} />
                <Route path="/dashboard/students" element={<StudentInformationSystem />} />
              </Route>
              
              {/* Teacher Management - Admin, Headteacher only */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher"]} />}>
                <Route path="/dashboard/teachers" element={<TeacherManagement />} />
              </Route>
              
              {/* Academic Management - Admin, Headteacher, Teacher */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher", "teacher"]} />}>
                <Route path="/academics" element={<AcademicManagement />} />
                <Route path="/dashboard/assignments" element={<AcademicManagement />} />
                <Route path="/classes" element={<ClassesManagement />} />
                <Route path="/dashboard/classes" element={<ClassesManagement />} />
                <Route path="/subjects" element={<SubjectsManagement />} />
                <Route path="/dashboard/subjects" element={<SubjectsManagement />} />
                <Route path="/attendance" element={<AttendanceTracking />} />
                <Route path="/dashboard/attendance" element={<AttendanceTracking />} />
                <Route path="/grades" element={<GradesManagement />} />
                <Route path="/dashboard/grades" element={<GradesManagement />} />
                <Route path="/timetable" element={<TimetableManagement />} />
                <Route path="/dashboard/timetable" element={<TimetableManagement />} />
                <Route path="/communications" element={<CommunicationsManagement />} />
                <Route path="/dashboard/communications" element={<CommunicationsManagement />} />
                <Route path="/parent-portal" element={<ParentPortal />} />
              </Route>
              
              {/* Finance Management - Admin, Headteacher, Accountant */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher", "accountant"]} />}>
                <Route path="/finance" element={<FinanceManagement />} />
                <Route path="/dashboard/finance" element={<FinanceManagement />} />
              </Route>
              
              {/* Reports - Admin, Headteacher, Accountant */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher", "accountant"]} />}>
                <Route path="/reports" element={<ReportsManagement />} />
                <Route path="/dashboard/reports" element={<ReportsManagement />} />
              </Route>
              
              {/* School Settings & EMIS - Admin, Headteacher only */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher"]} />}>
                <Route path="/settings" element={<SchoolSettings />} />
                <Route path="/dashboard/settings" element={<SchoolSettings />} />
                <Route path="/emis" element={<EMISExport />} />
              </Route>
              
              {/* Support - All authenticated users */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "headteacher", "teacher", "accountant"]} />}>
                <Route path="/support" element={<UserSupportPage />} />
              </Route>
              
              {/* Protected SaaS Admin Routes - Only for superadmin */}
              <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
                <Route path="/admin" element={<SaasAdminDashboard />} />
                <Route path="/admin/database" element={<DatabaseManagement />} />
                <Route path="/admin/super-admins" element={<SuperAdmins />} />
                <Route path="/admin/schools" element={<Schools />} />
                <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
                <Route path="/admin/settings" element={<SystemSettings />} />
                <Route path="/admin/notifications" element={<NotificationsPage />} />
                <Route path="/admin/support" element={<AdminSupportManagement />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);

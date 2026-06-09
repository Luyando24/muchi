import "./global.css";
import "./styles/card-animations.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import TeacherRegister from "./pages/TeacherRegister";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ForcePasswordReset from "./pages/ForcePasswordReset";
import SchoolRegister from "./pages/SchoolRegister";
import NotFound from "./pages/NotFound";
import StudentPortal from "./pages/StudentPortal";
import TeacherPortal from "./pages/TeacherPortal";
import TeacherVerifyGrades from "./pages/TeacherVerifyGrades";
import SchoolAdminPortal from "./pages/SchoolAdminPortal";
import SchoolWebsite from "./pages/SchoolWebsite";
import GovernmentPortal from "./pages/GovernmentPortal";
import SystemAdminPortal from "./pages/SystemAdminPortal";
import VerifyReport from "./pages/VerifyReport";
import DataAuditPage from "./pages/DataAuditPage";
import CheckResults from "./pages/CheckResults";
import SchoolCalendar from "./pages/SchoolCalendar";
import EnterResults from "./pages/results/EnterResults";
import ResultsAnalysis from "./pages/results/ResultsAnalysis";
import MasterSheet from "./pages/results/MasterSheet";
import { getSubdomain } from "./lib/subdomain";

/** Shared providers wrapper */
const Providers = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <ThemeProvider attribute="class" defaultTheme="light">
      <BrowserRouter>{children}</BrowserRouter>
    </ThemeProvider>
  </TooltipProvider>
);

/** Common unauthenticated routes available on every subdomain */
const CommonRoutes = () => (
  <>
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/force-password-reset" element={<ForcePasswordReset />} />
    <Route path="/verify/:hash" element={<VerifyReport />} />
    <Route path="/school-calendar" element={<SchoolCalendar />} />
  </>
);

/** admin.muchiapp.com — School Admin Portal */
const AdminSubdomainApp = () => (
  <Providers>
    <Routes>
      {CommonRoutes()}
      <Route
        path="/data-audit"
        element={
          <ProtectedRoute allowedRoles={["school_admin","bursar","registrar","exam_officer","academic_auditor","accounts","content_manager","system_admin"]}>
            <DataAuditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute allowedRoles={["school_admin","bursar","registrar","exam_officer","academic_auditor","accounts","content_manager","system_admin"]}>
            <SchoolAdminPortal />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Providers>
);

/** teacher.muchiapp.com — Teacher Portal */
const TeacherSubdomainApp = () => (
  <Providers>
    <Routes>
      {CommonRoutes()}
      <Route
        path="/verify"
        element={
          <ProtectedRoute allowedRoles={["teacher","school_admin"]}>
            <TeacherVerifyGrades />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute allowedRoles={["teacher","school_admin","bursar","registrar","exam_officer","academic_auditor","accounts","content_manager","system_admin"]}>
            <TeacherPortal />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Providers>
);

/** student.muchiapp.com — Student Portal (ID resolved from session) */
const StudentSubdomainApp = () => (
  <Providers>
    <Routes>
      {CommonRoutes()}
      <Route
        path="/:id/*"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentPortal />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Providers>
);

/** gov.muchiapp.com — Government Portal */
const GovSubdomainApp = () => (
  <Providers>
    <Routes>
      {CommonRoutes()}
      <Route
        path="/*"
        element={
          <ProtectedRoute allowedRoles={["system_admin","government"]}>
            <GovernmentPortal />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Providers>
);

/** system.muchiapp.com — System Admin Portal */
const SystemSubdomainApp = () => (
  <Providers>
    <Routes>
      {CommonRoutes()}
      <Route
        path="/login"
        element={<SystemAdminLogin />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute allowedRoles={["system_admin"]}>
            <SystemAdminPortal />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Providers>
);

/** Root domain — full route set (fallback for local dev & public pages) */
const RootApp = () => (
  <Providers>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/school/register" element={<SchoolRegister />} />
      <Route path="/teacher/register" element={<TeacherRegister />} />
      <Route path="/system-admin/login" element={<SystemAdminLogin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/force-password-reset" element={<ForcePasswordReset />} />
      <Route
        path="/student-portal/:id/*"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher-portal/verify"
        element={
          <ProtectedRoute allowedRoles={["teacher","school_admin"]}>
            <TeacherVerifyGrades />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher-portal/*"
        element={
          <ProtectedRoute allowedRoles={["teacher","school_admin","bursar","registrar","exam_officer","academic_auditor","accounts","content_manager","system_admin"]}>
            <TeacherPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/school-admin/*"
        element={
          <ProtectedRoute allowedRoles={["school_admin","bursar","registrar","exam_officer","academic_auditor","accounts","content_manager","system_admin"]}>
            <SchoolAdminPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/school-admin/data-audit"
        element={
          <ProtectedRoute allowedRoles={["school_admin","bursar","registrar","exam_officer","academic_auditor","accounts","content_manager","system_admin"]}>
            <DataAuditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/system-admin"
        element={
          <ProtectedRoute allowedRoles={["system_admin"]}>
            <SystemAdminPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gov"
        element={
          <ProtectedRoute allowedRoles={["system_admin","government"]}>
            <GovernmentPortal />
          </ProtectedRoute>
        }
      />
      <Route path="/verify/:hash" element={<VerifyReport />} />
      <Route path="/check-results" element={<CheckResults />} />
      <Route path="/school-calendar" element={<SchoolCalendar />} />
      <Route path="/:slug/*" element={<SchoolWebsite />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Providers>
);

/** Entry point — pick the right app based on the active subdomain */
const App = () => {
  const subdomain = getSubdomain();

  switch (subdomain) {
    case "admin":   return <AdminSubdomainApp />;
    case "teacher": return <TeacherSubdomainApp />;
    case "student": return <StudentSubdomainApp />;
    case "gov":     return <GovSubdomainApp />;
    case "system":  return <SystemSubdomainApp />;
    default:        return <RootApp />;
  }
};

createRoot(document.getElementById("root")!).render(<App />);

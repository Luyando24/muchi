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
import EnterResults from "./pages/results/EnterResults";
import ResultsAnalysis from "./pages/results/ResultsAnalysis";
import MasterSheet from "./pages/MasterSheet";
import { PWAInstallPrompt } from "./components/navigation/PWAInstallPrompt";

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="light">
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/school/register" element={<SchoolRegister />} />
            <Route path="/teacher/register" element={<TeacherRegister />} />
            <Route path="/system-admin/login" element={<SystemAdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/force-password-reset" element={<ForcePasswordReset />} />
            <Route path="/student-portal/:id/*" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentPortal />
              </ProtectedRoute>
            } />
            <Route path="/teacher-portal/verify" element={
              <ProtectedRoute allowedRoles={['teacher', 'school_admin']}>
                <TeacherVerifyGrades />
              </ProtectedRoute>
            } />
            <Route path="/teacher-portal/results/enter" element={
              <ProtectedRoute allowedRoles={['teacher', 'school_admin']}>
                <TeacherPortal />
              </ProtectedRoute>
            } />
            <Route path="/teacher-portal/results/analysis" element={
              <ProtectedRoute allowedRoles={['teacher', 'school_admin']}>
                <TeacherPortal />
              </ProtectedRoute>
            } />
            <Route path="/teacher-portal/results/master-sheet" element={
              <ProtectedRoute allowedRoles={['teacher', 'school_admin']}>
                <TeacherPortal />
              </ProtectedRoute>
            } />
            <Route path="/teacher-portal/*" element={
              <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'bursar', 'registrar', 'exam_officer', 'academic_auditor', 'accounts', 'content_manager', 'system_admin']}>
                <TeacherPortal />
              </ProtectedRoute>
            } />
            <Route path="/school-admin" element={
              <ProtectedRoute allowedRoles={['school_admin', 'bursar', 'registrar', 'exam_officer', 'academic_auditor', 'accounts', 'content_manager', 'system_admin']}>
                <SchoolAdminPortal />
              </ProtectedRoute>
            } />
            <Route path="/school-admin/data-audit" element={
              <ProtectedRoute allowedRoles={['school_admin', 'bursar', 'registrar', 'exam_officer', 'academic_auditor', 'accounts', 'content_manager', 'system_admin']}>
                <DataAuditPage />
              </ProtectedRoute>
            } />
            <Route path="/system-admin" element={
              <ProtectedRoute allowedRoles={['system_admin']}>
                <SystemAdminPortal />
              </ProtectedRoute>
            } />
            <Route path="/gov" element={
              <ProtectedRoute allowedRoles={['system_admin', 'government']}>
                <GovernmentPortal />
              </ProtectedRoute>
            } />
            <Route path="/verify/:hash" element={<VerifyReport />} />
            <Route path="/check-results" element={<CheckResults />} />
            <Route path="/:slug/*" element={<SchoolWebsite />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);

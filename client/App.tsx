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
import NotFound from "./pages/NotFound";
import StudentPortal from "./pages/StudentPortal";
import TeacherPortal from "./pages/TeacherPortal";
import SchoolAdminPortal from "./pages/SchoolAdminPortal";
import SchoolWebsite from "./pages/SchoolWebsite";
import GovernmentPortal from "./pages/GovernmentPortal";
import SystemAdminPortal from "./pages/SystemAdminPortal";

const App = () => {
  // --- SUBDOMAIN DETECTION ---
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Check if we are on a subdomain (e.g., school-slug.muchi.vercel.app or school-slug.localhost)
  // We assume the main domain is 'muchi.vercel.app' or 'localhost'
  let schoolSlug: string | null = null;
  
  if (hostname.includes('vercel.app')) {
    // pattern: [slug].muchi.vercel.app
    if (parts.length >= 4 && parts[parts.length - 3] === 'muchi') {
      schoolSlug = parts[0];
    }
  } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // pattern: [slug].localhost
    if (parts.length >= 2) {
      const firstPart = parts[0];
      if (firstPart !== 'localhost' && firstPart !== 'www' && firstPart !== '127') {
        schoolSlug = firstPart;
      }
    }
  }

  // If a school slug is detected via subdomain, render the school website directly
  if (schoolSlug) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider attribute="class" defaultTheme="light">
          <BrowserRouter>
            <SchoolWebsite subdomainSlug={schoolSlug} />
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="light">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/teacher/register" element={<TeacherRegister />} />
            <Route path="/system-admin/login" element={<SystemAdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/force-password-reset" element={<ForcePasswordReset />} />
            <Route path="/school/:slug/*" element={<SchoolWebsite />} />
            <Route path="/student-portal/:id/*" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentPortal />
              </ProtectedRoute>
            } />
            <Route path="/teacher-portal" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherPortal />
              </ProtectedRoute>
            } />
            <Route path="/school-admin" element={
              <ProtectedRoute allowedRoles={['school_admin', 'bursar', 'registrar', 'exam_officer', 'academic_auditor', 'accounts', 'content_manager']}>
                <SchoolAdminPortal />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);

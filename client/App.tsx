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
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import StudentPortal from "./pages/StudentPortal";
import TeacherPortal from "./pages/TeacherPortal";
import SchoolAdminPortal from "./pages/SchoolAdminPortal";
import SystemAdminPortal from "./pages/SystemAdminPortal";
import SchoolWebsite from "./pages/SchoolWebsite";

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="light">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/system-admin/login" element={<SystemAdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/school/:slug" element={<SchoolWebsite />} />
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
              <ProtectedRoute allowedRoles={['school_admin']}>
                <SchoolAdminPortal />
              </ProtectedRoute>
            } />
            <Route path="/system-admin" element={
              <ProtectedRoute allowedRoles={['system_admin']}>
                <SystemAdminPortal />
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

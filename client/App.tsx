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
import SchoolDashboard from "./pages/SchoolDashboard";
import StudentInformationSystem from "./pages/StudentInformationSystem";
import AcademicManagement from "./pages/AcademicManagement";
import AttendanceTracking from "./pages/AttendanceTracking";
import ParentPortal from "./pages/ParentPortal";
import FinanceManagement from './pages/FinanceManagement';
import EMISExport from './pages/EMISExport';
import Register from "./pages/Register";
import { useEffect } from "react";
import { syncService } from "@/lib/sync";

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
              <Route path="/register" element={<Register />} />
              
              {/* School Portal Routes */}
              <Route path="/school" element={<SchoolDashboard />} />
              <Route path="/dashboard" element={<SchoolDashboard />} />
              <Route path="/students" element={<StudentInformationSystem />} />
              <Route path="/academics" element={<AcademicManagement />} />
              <Route path="/attendance" element={<AttendanceTracking />} />
              <Route path="/parent-portal" element={<ParentPortal />} />
              <Route path="/finance" element={<FinanceManagement />} />
          <Route path="/emis" element={<EMISExport />} />
              
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

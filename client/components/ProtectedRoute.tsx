import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  redirectPath?: string;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({
  redirectPath = "/login",
  allowedRoles,
}: ProtectedRouteProps) => {
  const { session } = useAuth();
  const location = useLocation();

  // First check if user is logged in at all
  if (!session) {
    return <Navigate to={redirectPath} replace />;
  }

  // If allowedRoles is specified, check if the user has the required role
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    // Redirect to appropriate dashboard based on user role
    switch (session.role) {
      case "superadmin":
        return <Navigate to="/admin" replace />;
      case "school":
        return <Navigate to="/dashboard" replace />;
      case "teacher":
        return <Navigate to="/teacher" replace />;
      case "student":
        return <Navigate to="/student" replace />;
      case "parent":
        return <Navigate to="/parent" replace />;

      default:
        return <Navigate to="/" replace />;
    }
  }

  // User is authenticated and has the required role (or no role restriction)
  return <Outlet />;
};
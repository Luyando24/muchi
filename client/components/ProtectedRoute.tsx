import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthorized(false);
        setLoading(false);
      }
    });

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setLoading(false);
          return;
        }

        if (allowedRoles && allowedRoles.length > 0) {
          // Check user role from profiles table
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('role, secondary_role')
            .eq('id', session.user.id)
            .limit(1);
          
          const profile = profiles && profiles.length > 0 ? profiles[0] : null;
          
          if (error || !profile) {
            console.error('Error fetching profile:', error);
            setLoading(false);
            return;
          }

          if (allowedRoles.includes(profile.role) || (profile.secondary_role && allowedRoles.includes(profile.secondary_role))) {
            setAuthorized(true);
          } else {
             toast({
              variant: "destructive",
              title: "Access Denied",
              description: `You do not have permission to access this page. Required role: ${allowedRoles.join(', ')}`,
            });
          }
        } else {
          // No specific roles required, just authentication
          setAuthorized(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [allowedRoles, toast]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    // If not authorized but we have a session (meaning role mismatch), go to home or previous page
    // If no session, go to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert, LogOut, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { getRoleSubdomainUrl } from '@/lib/subdomain';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function AccessDeniedScreen({ userRole, userId, allowedRoles }: { userRole: string; userId: string; allowedRoles?: string[] }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/login';
    }
  };

  const getRoleDisplayName = (r: string) => {
    return r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const myPortalUrl = getRoleSubdomainUrl(userRole, userId);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
          <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You do not have permission to view this section of the portal.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-900 text-left space-y-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
            <span className="text-slate-400 font-medium">Logged in as:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
              {getRoleDisplayName(userRole || 'User')}
            </span>
          </div>
          {allowedRoles && allowedRoles.length > 0 && (
            <div className="pt-1">
              <span className="text-slate-400 font-medium block mb-1">Required access:</span>
              <div className="flex flex-wrap gap-1">
                {allowedRoles.map(r => (
                  <span key={r} className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 px-2 py-0.5 rounded">
                    {getRoleDisplayName(r)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 flex items-center justify-center gap-2 rounded-xl transition-all"
            onClick={() => { window.location.href = myPortalUrl; }}
          >
            Go to My Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button 
            variant="outline"
            className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 font-semibold h-11 flex items-center justify-center gap-2 rounded-xl transition-all"
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Sign Out & Switch Account
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthorized(false);
        setSessionUser(null);
        setUserRole('');
        setLoading(false);
      }
    });

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setSessionUser(null);
          setLoading(false);
          return;
        }

        setSessionUser(session.user);
        const metaRole = session.user.user_metadata?.role;
        const metaSecondaryRole = session.user.user_metadata?.secondary_role;

        // Fetch DB profile to get the most accurate, up-to-date roles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('role, secondary_role')
          .eq('id', session.user.id)
          .limit(1);
        
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;
        const activeRole = profile?.role || metaRole || '';
        setUserRole(activeRole);

        if (allowedRoles && allowedRoles.length > 0) {
          let isAuthorized = false;

          if (metaRole && (allowedRoles.includes(metaRole) || (metaSecondaryRole && allowedRoles.includes(metaSecondaryRole)))) {
            isAuthorized = true;
          }

          if (profile) {
            if (allowedRoles.includes(profile.role) || (profile.secondary_role && allowedRoles.includes(profile.secondary_role))) {
              isAuthorized = true;
            } else if (isAuthorized) {
              // If metadata said yes but DB says no, DB wins
              isAuthorized = false;
            }
          }

          if (isAuthorized) {
            setAuthorized(true);
          } else {
            console.warn(`[ProtectedRoute] Access Denied. DB Role: ${profile?.role}, Secondary: ${profile?.secondary_role}. Meta Role: ${metaRole}, Meta Secondary: ${metaSecondaryRole}. Allowed: ${allowedRoles.join(', ')}`);
            toast({
              variant: "destructive",
              title: "Access Denied",
              description: `You do not have permission to access this page.`,
            });
            setAuthorized(false);
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
    // If not authorized but we have a session (meaning role mismatch), render the Access Denied screen.
    // If no session, redirect to login.
    if (sessionUser) {
      return (
        <AccessDeniedScreen 
          userRole={userRole} 
          userId={sessionUser.id} 
          allowedRoles={allowedRoles} 
        />
      );
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

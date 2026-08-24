import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getSubdomain, getRoleSubdomainUrl, getLoginSubdomainUrl } from "@/lib/subdomain";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  GraduationCap,
  Lock,
  ArrowRight,
  User,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  School,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  identifier: z.string().min(1, "Email, Username, or ID is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export type AudienceType = "student" | "teacher" | "school_admin";

interface LoginProps {
  defaultAudience?: AudienceType;
}

const PORTAL_OPTIONS = [
  {
    audience: "student" as const,
    roleParam: "student",
    eyebrow: "Learners & Academics",
    title: "Student Login",
    description: "Access report cards, continuous assessment grades, timetables, and fee statements.",
    Icon: GraduationCap,
    accent: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    audience: "teacher" as const,
    roleParam: "teacher",
    eyebrow: "Faculty & Academics",
    title: "Teacher Login",
    description: "Manage class attendance, enter term marks, submit grades, and view teaching schedules.",
    Icon: BookOpen,
    accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    audience: "school_admin" as const,
    roleParam: "admin",
    eyebrow: "School Management",
    title: "School Admin Login",
    description: "Manage school operations, staff, student admissions, fee structures, and institutional settings.",
    Icon: ShieldCheck,
    accent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
  },
];

const AUDIENCE_CONFIG: Record<AudienceType, {
  eyebrow: string;
  title: string;
  description: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  Icon: any;
  headerBg: string;
  buttonBg: string;
  extraAction?: { label: string; to: string };
}> = {
  student: {
    eyebrow: "Student Portal",
    title: "Student Sign In",
    description: "Enter your student credentials to access your academic records.",
    identifierLabel: "Student Number or Email",
    identifierPlaceholder: "Student Number (e.g. 2026...) or Email",
    Icon: GraduationCap,
    headerBg: "bg-blue-600 shadow-blue-500/20",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
  },
  teacher: {
    eyebrow: "Teacher Portal",
    title: "Teacher Sign In",
    description: "Enter your staff credentials to access your teaching workspace.",
    identifierLabel: "Email, Staff Number, or Username",
    identifierPlaceholder: "Staff Number (e.g. T2026...), Email, or Username",
    Icon: BookOpen,
    headerBg: "bg-emerald-600 shadow-emerald-500/20",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700",
    extraAction: {
      label: "New Teacher? Register Here",
      to: "/teacher/register",
    },
  },
  school_admin: {
    eyebrow: "School Administration",
    title: "School Admin Sign In",
    description: "Enter your administrator credentials to manage school operations.",
    identifierLabel: "Admin Email, Username, or Staff ID",
    identifierPlaceholder: "admin@school.com or username",
    Icon: ShieldCheck,
    headerBg: "bg-indigo-600 shadow-indigo-500/20",
    buttonBg: "bg-indigo-600 hover:bg-indigo-700",
    extraAction: {
      label: "New School? Register Here",
      to: "/school/register",
    },
  },
};

export default function Login({ defaultAudience }: LoginProps) {
  const { role: routeRole } = useParams<{ role?: string }>();
  const subdomain = getSubdomain();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userData, setUserData] = useState<{ session: any; profile: any } | null>(null);

  // Resolve which audience to display:
  // 1. If we are on a specific subdomain (student, teacher, admin) -> use that directly
  // 2. If passed via defaultAudience prop -> use that
  // 3. If passed via route parameter (/login/student, /login/teacher, /login/admin) -> use that
  // 4. Otherwise (plain /login on root) -> null (display portal chooser)
  const resolveAudience = (): AudienceType | null => {
    if (subdomain === "student") return "student";
    if (subdomain === "teacher") return "teacher";
    if (subdomain === "admin") return "school_admin";
    if (defaultAudience) return defaultAudience;

    if (routeRole) {
      const r = routeRole.toLowerCase();
      if (r === "student") return "student";
      if (r === "teacher") return "teacher";
      if (r === "admin" || r === "school-admin" || r === "school_admin") return "school_admin";
    }

    return null;
  };

  const audience = resolveAudience();

  // Check if user is already logged in with a valid session without logging them out
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, secondary_role")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile && isMounted) {
            handleRoleNavigation(profile.role, session.user.id);
          }
        }
      } catch (err) {
        console.warn("Session verification warning:", err);
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });

  const handleRoleNavigation = (role: string, userId: string) => {
    const subdomainUrl = getRoleSubdomainUrl(role, userId);

    const currentSub = getSubdomain();
    const targetSubMap: Record<string, string> = {
      school_admin: "admin", bursar: "admin", registrar: "admin",
      exam_officer: "admin", academic_auditor: "admin", accounts: "admin",
      content_manager: "admin",
      teacher: "teacher",
      student: "student",
      government: "gov",
      system_admin: "system",
    };
    const targetSub = targetSubMap[role];

    if (currentSub && currentSub === targetSub) {
      navigate("/");
    } else if (subdomainUrl && subdomainUrl.startsWith("http")) {
      window.location.href = subdomainUrl;
    } else {
      if (["school_admin", "bursar", "registrar", "exam_officer", "academic_auditor", "accounts", "content_manager"].includes(role)) {
        navigate("/school-admin");
      } else {
        switch (role) {
          case "system_admin": navigate("/system-admin"); break;
          case "government":   navigate("/gov"); break;
          case "teacher":      navigate("/teacher-portal"); break;
          case "student":      navigate(`/student-portal/${userId}`); break;
          default:             navigate("/");
        }
      }
    }
  };

  const handlePortalSelect = (option: typeof PORTAL_OPTIONS[number]) => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost') || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      navigate(`/login/${option.roleParam}`);
    } else {
      const targetUrl = getLoginSubdomainUrl(option.audience);
      if (targetUrl.startsWith("http")) {
        window.location.href = targetUrl;
      } else {
        navigate(`/login/${option.roleParam}`);
      }
    }
  };

  // Dual-role selection screen
  if (showRoleSelection && userData) {
    const roles = [
      { id: userData.profile.role, name: userData.profile.role.replace('_', ' '), icon: userData.profile.role === 'teacher' ? BookOpen : ShieldAlert },
      { id: userData.profile.secondary_role, name: userData.profile.secondary_role.replace('_', ' '), icon: userData.profile.secondary_role === 'teacher' ? BookOpen : ShieldAlert },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Choose your dashboard
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Select which portal you'd like to use for this session
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => (
              <Button
                key={role.id}
                variant="outline"
                className="h-auto p-8 flex flex-col items-center gap-4 bg-white dark:bg-slate-900 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all border-2"
                onClick={() => handleRoleNavigation(role.id, userData.session.user.id)}
              >
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                  {role.id === 'teacher' ? <BookOpen className="h-10 w-10 text-blue-600" /> : <ShieldAlert className="h-10 w-10 text-blue-600" />}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold capitalize">{role.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">Access the {role.name} features and dashboard</p>
                </div>
              </Button>
            ))}
          </div>

          <div className="text-center">
            <Button variant="ghost" className="text-slate-500" onClick={() => setShowRoleSelection(false)}>
              Back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 1: PORTAL CHOOSER (When visiting /login without a pre-selected role)
  if (!audience) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
        <div className="w-full max-w-5xl py-10">
          <header className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <GraduationCap size={34} strokeWidth={2.5} />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
              Secure education access
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Choose your sign-in portal
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
              Select the portal that matches your school account. You will be routed directly to your sign-in console.
            </p>
          </header>

          <section
            aria-label="Sign-in portal options"
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            {PORTAL_OPTIONS.map((option) => {
              const { audience: optAudience, eyebrow, title, description, Icon, accent } = option;
              return (
                <button
                  key={optAudience}
                  type="button"
                  onClick={() => handlePortalSelect(option)}
                  className="group flex min-h-[280px] flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 text-left shadow-[0_12px_40px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-[0_18px_50px_rgb(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
                >
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${accent}`}>
                    <Icon size={28} strokeWidth={2.2} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                  <span className="mt-6 flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400">
                    Continue to sign in
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </button>
              );
            })}
          </section>

          <footer className="mt-12 text-center text-xs font-medium text-slate-400 space-y-2">
            <p>Need access assistance? Contact your school administrator.</p>
            <p>
              System administrator?{" "}
              <Link to="/system-admin/login" className="text-blue-600 hover:underline font-semibold">
                System Console Login
              </Link>
            </p>
          </footer>
        </div>
      </main>
    );
  }

  // SCREEN 2: DEDICATED LOGIN FORM FOR CHOSEN AUDIENCE
  const currentConfig = AUDIENCE_CONFIG[audience];
  const AudienceIcon = currentConfig.Icon;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const identifier = values.identifier.trim();
      let emailToUse = identifier;
      let accountFound = false;

      // 1. Try unified RPC lookup (works for email, staff_number, student_number, username, phone)
      try {
        const { data: lookedUpEmail, error: lookupError } = await supabase.rpc('get_email_by_identifier', {
          p_identifier: identifier
        });
        if (!lookupError && lookedUpEmail) {
          emailToUse = lookedUpEmail;
          accountFound = true;
        }
      } catch (e) {
        console.warn("Unified lookup error:", e);
      }

      // 2. Fallback to specific staff number RPC lookup
      if (!accountFound) {
        try {
          const { data: staffEmail, error: staffError } = await supabase.rpc('get_email_by_staff_number', {
            p_staff_number: identifier
          });
          if (!staffError && staffEmail) {
            emailToUse = staffEmail;
            accountFound = true;
          }
        } catch (e) {
          console.warn("Staff number lookup error:", e);
        }
      }

      // 3. Fallback to server-side identifier resolver
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!accountFound) {
        try {
          const res = await fetch('/api/auth/resolve-identifier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.found && json.email) {
              emailToUse = json.email;
              accountFound = true;
            }
          }
        } catch (e) {
          console.warn("Server resolver fallback error:", e);
        }
      }

      // If it's an ID (not an email format) and was not found anywhere in the system
      if (!emailRegex.test(identifier) && !accountFound) {
        throw new Error(
          "User account not found for this identifier. Please check your " +
          (audience === 'student' ? "Student Number" : "Staff Number / Username") + "."
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: values.password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          if (!accountFound && emailRegex.test(identifier)) {
            throw new Error("No account found with this email address. Please check your spelling or register.");
          }
          throw new Error("Incorrect password. Please try again or reset your password.");
        }
        throw error;
      }

      if (data.session) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role, secondary_role, is_temp_password, temp_password_expires_at")
          .eq("id", data.session.user.id);

        if (profileError) {
          throw profileError;
        }

        const profile = profileData && profileData.length > 0 ? profileData[0] : null;

        if (!profile) {
          await supabase.auth.signOut();
          throw new Error("Your account profile is missing or was deleted. Please contact your system administrator.");
        }

        // Handle temporary password expiration
        if (profile.is_temp_password) {
          if (profile.temp_password_expires_at) {
            const expiresAt = new Date(profile.temp_password_expires_at);
            const now = new Date();

            if (now > expiresAt && profile.role !== 'teacher' && profile.role !== 'student') {
              await supabase.auth.signOut();
              throw new Error("Your temporary password has expired (72h limit). Please contact your administrator to reset it.");
            }
          }

          toast({
            title: "Password Reset Required",
            description: "You are using a temporary password. Please set a permanent password to continue.",
            variant: "default",
          });
          navigate("/force-password-reset");
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your account.",
        });

        // Handle dual role selection
        if (profile.secondary_role && profile.secondary_role !== 'none') {
          setUserData({ session: data.session, profile });
          setLoading(false);
          setShowRoleSelection(true);
          return;
        }

        // Redirect based on role
        handleRoleNavigation(profile.role, data.session.user.id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div className={`p-3.5 ${currentConfig.headerBg} rounded-2xl inline-flex text-white shadow-lg`}>
              <AudienceIcon className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
            {currentConfig.eyebrow}
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {currentConfig.title}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            {currentConfig.description}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 p-8 sm:p-9">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {currentConfig.identifierLabel}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                        <Input 
                          placeholder={currentConfig.identifierPlaceholder}
                          className="pl-11 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-medium focus-visible:ring-blue-500" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Password
                      </FormLabel>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-11 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-medium focus-visible:ring-blue-500" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between pt-1">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                        Remember me
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <Link 
                  to="/forgot-password" 
                  className="text-xs font-bold text-blue-600 hover:text-blue-500 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  type="submit" 
                  className={`w-full h-12 ${currentConfig.buttonBg} text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg`} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                {currentConfig.extraAction && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-12 rounded-2xl border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    onClick={() => navigate(currentConfig.extraAction!.to)}
                  >
                    {currentConfig.extraAction.label}
                  </Button>
                )}
              </div>
            </form>
          </Form>

          {/* Switch Portal Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Need a different sign-in?{" "}
              <Link 
                to="/login" 
                className="font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                Return to sign-in options
              </Link>
            </p>
          </div>
        </div>
        
        <div className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} MUCHI Systems. All rights reserved.
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, GraduationCap, Lock, Mail, ArrowRight, User, BookOpen, ShieldAlert, KeyRound } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  identifier: z.string().min(1, "Email, Username, Phone, or Student Number is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type UserRole = "student" | "teacher" | "school_admin" | "system_admin";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<UserRole>("student");
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userData, setUserData] = useState<{ session: any; profile: any } | null>(null);
  
  const navigate = useNavigate();

  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });

  const handleRoleNavigation = (role: string, userId: string) => {
    if (["school_admin", "bursar", "registrar", "exam_officer", "academic_auditor", "accounts", "content_manager"].includes(role)) {
      navigate("/school-admin");
    } else {
      switch (role) {
        case "system_admin":
          navigate("/system-admin");
          break;
        case "government":
          navigate("/gov");
          break;
        case "teacher":
          navigate("/teacher-portal");
          break;
        case "student":
          navigate(`/student-portal/${userId}`);
          break;
        default:
          navigate("/");
      }
    }
  };

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {

    setLoading(true);
    try {
      const identifier = values.identifier.trim();
      let emailToUse = identifier;
      
      // If it doesn't look like an email, try to look it up using the unified RPC
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        let { data: lookedUpEmail, error: lookupError } = await supabase.rpc('get_email_by_identifier', {
          p_identifier: identifier
        });
        
        if (lookupError) {
           console.error("Lookup error:", lookupError);
        }
        
        // Robust Fallback: If unified lookup fails, try specific staff number lookup
        // This handles cases where the unified migration might not have been applied yet.
        if (!lookedUpEmail) {
          const { data: staffEmail } = await supabase.rpc('get_email_by_staff_number', {
            p_staff_number: identifier
          });
          lookedUpEmail = staffEmail;
        }
        
        if (!lookedUpEmail) {
          throw new Error("User account not found for this identifier. Please check your " + 
            (activeTab === 'student' ? "Student Number" : "Staff Number/Username") + ".");
        }
        emailToUse = lookedUpEmail;
      } else {
        // If it's an email, check if it exists in profiles to provide specific error
        // Note: This relies on the profiles.email column being populated
        const { data: profileExists } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', identifier)
          .maybeSingle();
        
        if (!profileExists) {
          throw new Error("No account found with this email address. Please check your spelling or register.");
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: values.password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          // Since we already verified the account exists above, this must be a wrong password
          throw new Error("Incorrect password. Please try again or reset your password.");
        }
        throw error;
      }

      if (data.session) {
        // Check for temporary password
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, secondary_role, is_temp_password, temp_password_expires_at")
          .eq("id", data.session.user.id)
          .single();



        if (profileError) {
          throw profileError;
        }

        // Handle temporary password expiration
        if (profile.is_temp_password) {
          const expiresAt = new Date(profile.temp_password_expires_at);
          const now = new Date();

          if (now > expiresAt && profile.role !== 'teacher') {
            await supabase.auth.signOut();
            throw new Error("Your temporary password has expired (72h limit). Please contact your administrator to reset it.");
          }

          toast({
            title: "Password Reset Required",
            description: "You are using a temporary password. Please set a permanent password to continue.",
            variant: "default",
          });
          navigate("/force-password-reset");
          return;
        }

        // Welcome toast
        toast({
          title: "Welcome back!",
          description: "Successfully logged in back to your account.",
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-2 bg-blue-600 rounded-lg inline-flex">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Please enter your details to sign in
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Tabs defaultValue="student" value={activeTab} onValueChange={(val) => setActiveTab(val as UserRole)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 p-0 h-auto rounded-none">
                <TabsTrigger 
                  value="student" 
                  className="rounded-none py-3 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-all duration-200"
                >
                  Student
                </TabsTrigger>
                <TabsTrigger 
                  value="teacher" 
                  className="rounded-none py-3 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-all duration-200"
                >
                  Teacher
                </TabsTrigger>
                <TabsTrigger 
                  value="school_admin" 
                  className="rounded-none py-3 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-all duration-200"
                >
                  Admin
                </TabsTrigger>
              </TabsList>

              <div className="p-8">
                <div className="mb-6 text-center">
                   <h3 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                      {activeTab.replace('_', ' ')} Login
                   </h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                      Sign in to your {activeTab.replace('_', ' ')} account
                   </p>
                </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {activeTab === 'student' 
                            ? "Email or Student Number" 
                            : "Email, Staff Number, Username or Phone"}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            {activeTab === 'student' ? (
                               <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            ) : (
                               <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            )}
                            <Input 
                              placeholder={activeTab === 'student' 
                                ? "Student Number or Email" 
                                : "Email, Staff Number, Username, or Phone"}
                              className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500" 
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
                          <FormLabel>Password</FormLabel>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal text-slate-600 cursor-pointer">
                              Remember me
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <Link 
                      to="/forgot-password" 
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-md hover:shadow-lg" 
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

                    {activeTab === 'teacher' && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-11 border-blue-200 text-blue-600 hover:bg-blue-50"
                        onClick={() => navigate('/teacher/register')}
                      >
                        New Teacher? Register Here
                      </Button>
                    )}
                  </div>
                </form>
              </Form>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-500">
                  Don't have an account?{" "}
                  <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
                    Contact your administrator
                  </Link>
                </p>
              </div>
            </div>
          </Tabs>
          </div>
          
          <div className="text-center lg:hidden text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} MUCHI Systems
          </div>
      </div>
    </div>
  );
}

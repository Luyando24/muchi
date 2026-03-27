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
import { Loader2, GraduationCap, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export default function SystemAdminLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Fetch user profile to determine role
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .limit(1);

        if (profileError) {
          throw profileError;
        }

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (!profile) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Account profile not found.",
          });
          return;
        }

        // Strictly check for system_admin role
        if (profile.role !== "system_admin") {
          // If not system admin, sign out immediately and show error
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have permission to access the System Admin portal.",
          });
          return;
        }

        toast({
          title: "Welcome back, Admin!",
          description: "Successfully logged in to the System Admin portal.",
        });

        navigate("/system-admin");
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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Column - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-950 p-12 text-white relative overflow-hidden">
        {/* Abstract Background Shapes - Different colors for Admin */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-red-600 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-orange-600 blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-red-800 blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-red-600 rounded-lg">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">MUCHI System Admin</span>
          </div>
          
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              System Administration Console
            </h1>
            <p className="text-slate-400 text-lg">
              Secure access for system maintenance, user management, and platform configuration.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Restricted Access Area</span>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-slate-600">
          © {new Date().getFullYear()} MUCHI Systems. All rights reserved.
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-2 bg-red-600 rounded-lg inline-flex">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin Login
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Please enter your administrative credentials
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 border-t-4 border-t-red-600">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                          <Input 
                            placeholder="admin@muchi.com" 
                            className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-red-500" 
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
                            className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-red-500" 
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
                            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
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
                    className="text-sm font-medium text-red-600 hover:text-red-500 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium transition-all shadow-md hover:shadow-lg" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Access Console <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-500">
                Authorized personnel only.
              </p>
              <Link to="/login" className="mt-2 inline-block text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                Return to Main Login
              </Link>
            </div>
          </div>
          
          <div className="text-center lg:hidden text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} MUCHI Systems
          </div>
        </div>
      </div>
    </div>
  );
}

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
import { Loader2, GraduationCap, Lock, Mail, ArrowRight, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  identifier: z.string().min(1, "Email or Student Number is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type UserRole = "student" | "teacher" | "school_admin" | "system_admin";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<UserRole>("student");
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      let emailToUse = values.identifier;
      
      // If it doesn't look like an email, try to look it up as a student number
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.identifier)) {
        const { data: lookedUpEmail, error: lookupError } = await supabase.rpc('get_email_by_student_number', {
          p_student_number: values.identifier
        });
        
        if (lookupError) {
           throw new Error("Error verifying student number");
        }
        
        if (!lookedUpEmail) {
          throw new Error("Student number not found");
        }
        emailToUse = lookedUpEmail;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: values.password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Fetch user profile to determine role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        // Check if role matches selected tab
        if (profile.role !== activeTab) {
          toast({
            variant: "default",
            title: "Redirecting...",
            description: `You logged in as a ${profile.role.replace('_', ' ')} but selected the ${activeTab.replace('_', ' ')} tab. Redirecting to your correct portal.`,
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "Successfully logged in to your account.",
          });
        }

        // Redirect based on role
        switch (profile.role) {
          case "system_admin":
            navigate("/system-admin");
            break;
          case "school_admin":
            navigate("/school-admin");
            break;
          case "teacher":
            navigate("/teacher-portal");
            break;
          case "student":
            navigate("/student-portal");
            break;
          default:
            navigate("/");
        }
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
                        <FormLabel>{activeTab === 'student' ? "Email or Student Number" : "Email"}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            {activeTab === 'student' ? (
                               <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            ) : (
                               <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            )}
                            <Input 
                              placeholder={activeTab === 'student' ? "Student Number or Email" : "name@school.com"}
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

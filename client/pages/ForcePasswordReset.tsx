import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { syncFetch } from '@/lib/syncService';
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
import { Loader2, Lock, GraduationCap, ShieldCheck, ArrowRight } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ForcePasswordReset() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_temp_password")
        .eq("id", session.user.id)
        .single();

      if (!profile?.is_temp_password) {
        // Redirtect based on role if already reset
        // For simplicity, just go to root or login
        navigate("/");
      }
      setChecking(false);
    };

    checkUser();
  }, [navigate]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // 1. Update Auth Password
      const { error: authError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (authError) throw authError;

      // 2. Update Profile status via secure backend endpoint
      const headers = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : undefined;

      const updatedProfile = await syncFetch('/api/school/user/clear-temp-password', {
        method: 'POST',
        headers
      });

      if (!updatedProfile) {
         throw new Error("Profile update returned no data");
      }
      
      console.log("Profile successfully updated during password reset:", updatedProfile);

      // Force a session refresh so the JWT gets updated metadata (if any) and components detect the change
      await supabase.auth.refreshSession();
      
      toast({
        title: "Success",
        description: "Your password has been set successfully. You can now access your dashboard.",
      });
      
      // Delay navigation slightly to ensure the database update has fully committed and propagated
      // before the Login or Portal components re-fetch the profile data
      setTimeout(() => {
        // Redirect based on role instead of just going to root "/"
        const role = updatedProfile?.role || session.user.user_metadata?.role;
        if (role === 'teacher') {
          navigate("/teacher-portal");
        } else if (role === 'student') {
          navigate("/student-portal");
        } else {
          // Fallback for admins or others
          navigate("/school-admin");
        }
      }, 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-blue-600 rounded-xl inline-flex text-white">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Set Permanent Password
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            You must create a new secure password before continuing
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <Input 
                          type="password" 
                          placeholder="At least 8 characters" 
                          className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <Input 
                          type="password" 
                          placeholder="Re-enter password" 
                          className="pl-10 h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-200 dark:shadow-none" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Activate Account <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </div>

        <div className="text-center space-y-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
            Muchi Education Systems
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Globe,
  MapPin,
  School as SchoolIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

// Form Schemas
const schoolInfoSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  schoolSlug: z.string()
    .min(3, "URL Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  schoolType: z.enum(['Secondary', 'Basic'], {
    required_error: "Please select a school type",
  }),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

const adminAccountSchema = z.object({
  adminName: z.string().min(2, "Full name must be at least 2 characters"),
  adminEmail: z.string().email("Invalid email address"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function SchoolRegister() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Forms
  const schoolForm = useForm<z.infer<typeof schoolInfoSchema>>({
    resolver: zodResolver(schoolInfoSchema),
    defaultValues: {
      schoolName: '',
      schoolSlug: '',
      schoolType: 'Secondary',
      address: '',
    },
  });

  const adminForm = useForm<z.infer<typeof adminAccountSchema>>({
    resolver: zodResolver(adminAccountSchema),
    defaultValues: {
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
  });

  const nextStep = async () => {
    if (step === 1) {
      const isValid = await schoolForm.trigger();
      if (isValid) setStep(2);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const onSubmit = async () => {
    const isSchoolValid = await schoolForm.trigger();
    const isAdminValid = await adminForm.trigger();

    if (!isSchoolValid || !isAdminValid) return;

    setIsSubmitting(true);
    try {
      const schoolValues = schoolForm.getValues();
      const adminValues = adminForm.getValues();

      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schoolValues,
          ...adminValues,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      toast({
        title: "Registration Successful!",
        description: "Your school has been registered. You can now log in.",
      });

      setStep(3); // Success step
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to auto-generate slug from school name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    schoolForm.setValue('schoolName', name);
    
    // Only auto-generate if slug hasn't been manually edited or is empty
    const currentSlug = schoolForm.getValues('schoolSlug');
    const autoSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    if (!currentSlug || currentSlug === autoSlug.slice(0, -1)) {
      schoolForm.setValue('schoolSlug', autoSlug);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Muchi for Schools</h1>
          <p className="text-slate-600 mt-2">Register your institution on our platform</p>
        </div>

        {/* Progress Stepper */}
        {step < 3 && (
          <div className="flex items-center justify-center mb-8 gap-4">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
              step === 1 ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-500"
            )}>
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">1</span>
              School Info
            </div>
            <div className="h-px w-8 bg-slate-300" />
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
              step === 2 ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-500"
            )}>
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">2</span>
              Admin Account
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-none shadow-xl shadow-slate-200/50">
                <CardHeader>
                  <CardTitle>School Information</CardTitle>
                  <CardDescription>Enter the basic details of your school</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...schoolForm}>
                    <form className="space-y-6">
                      <FormField
                        control={schoolForm.control}
                        name="schoolName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <SchoolIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                  placeholder="e.g. Chongwe Secondary School" 
                                  className="pl-10 h-12" 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleNameChange(e);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={schoolForm.control}
                        name="schoolSlug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Slug (School Handle)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                  placeholder="e.g. chongwe-secondary" 
                                  className="pl-10 h-12" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              This will be your school's unique handle: muchi.com/school/<strong>{field.value || 'handle'}</strong>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={schoolForm.control}
                          name="schoolType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Secondary">Secondary School</SelectItem>
                                  <SelectItem value="Basic">Basic School</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={schoolForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address / Location</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input placeholder="Lusaka, Zambia" className="pl-10 h-12" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="button" 
                        onClick={nextStep} 
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Next Step <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-none shadow-xl shadow-slate-200/50">
                <CardHeader>
                  <CardTitle>Administrator Account</CardTitle>
                  <CardDescription>Create the main administrator account for this school</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...adminForm}>
                    <form className="space-y-6">
                      <FormField
                        control={adminForm.control}
                        name="adminName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Administrator Full Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input placeholder="John Doe" className="pl-10 h-12" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={adminForm.control}
                        name="adminEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Administrator Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input placeholder="admin@school.com" className="pl-10 h-12" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={adminForm.control}
                          name="adminPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input type="password" placeholder="••••••••" className="pl-10 h-12" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={adminForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input type="password" placeholder="••••••••" className="pl-10 h-12" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep} 
                          className="flex-1 h-12 font-semibold"
                          disabled={isSubmitting}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={onSubmit} 
                          className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...
                            </>
                          ) : (
                            <>
                              Complete Registration <CheckCircle2 className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="border-none shadow-xl shadow-slate-200/50 p-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl mb-2">Registration Complete!</CardTitle>
                <CardDescription className="text-lg">
                  Your school has been successfully registered on Muchi. 
                  An initial 30-day trial license has been activated for you.
                </CardDescription>
                <div className="mt-8 space-y-4">
                  <Button 
                    onClick={() => navigate('/login')} 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg"
                  >
                    Go to Login Portal
                  </Button>
                  <p className="text-sm text-slate-500">
                    Need help getting started? <Link to="/help" className="text-blue-600 hover:underline">View our guide</Link>
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center">
          <p className="text-slate-500">
            Already registered? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Log in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
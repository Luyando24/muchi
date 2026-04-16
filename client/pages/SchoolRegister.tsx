import React, { useState, useEffect } from 'react';
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
  Phone,
  ShieldCheck,
  Building,
  Sparkles,
  ExternalLink,
  ChevronRight
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
import { cn, generateSlug } from '@/lib/utils';
import { ZAMBIAN_REGIONS } from '@/lib/regions';
import { supabase } from '@/lib/supabase';


// Form Schemas
const adminAccountSchema = z.object({
  adminName: z.string().min(2, "Full name must be at least 2 characters"),
  adminEmail: z.string().email("Invalid email address"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const schoolDetailsSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  schoolSlug: z.string()
    .min(3, "URL Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  schoolType: z.string().min(1, "Please select a school type"),
  contactEmail: z.string().email("Invalid school contact email").optional().or(z.literal('')),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  website: z.string().url("Invalid website URL").optional().or(z.literal('')),
  plan: z.string().min(1, "Please select a plan"),
  category: z.string().min(1, "Please select a category"),
  country: z.string().min(1, "Please select a country"),
  licenseCode: z.string().optional().or(z.literal('')),
});

const locationSchema = z.object({
  province: z.string().min(1, "Please select a province"),
  district: z.string().min(1, "Please select a district"),
  address: z.string().min(5, "Physical address must be at least 5 characters"),
});

import { SchoolCategory, Country, SubscriptionPlan, SchoolType } from '@shared/api';


export default function SchoolRegister() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<SchoolCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [countdown, setCountdown] = useState(5);



  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async (countryId?: string) => {
    setIsLoadingMetadata(true);
    try {
      const planUrl = countryId ? `/api/schools/metadata/plans?country_id=${countryId}` : '/api/schools/metadata/plans';
      const [catRes, countRes, planRes, typeRes] = await Promise.all([
        fetch('/api/schools/metadata/categories'),
        fetch('/api/schools/metadata/countries'),
        fetch(planUrl),
        fetch('/api/schools/metadata/types')
      ]);


      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
      
      if (countRes.ok) {
        const countData = await countRes.json();
        setCountries(countData);
      }

      if (planRes.ok) {
        const planData = await planRes.json();
        setPlans(planData);
      }

      if (typeRes.ok) {
        const typeData = await typeRes.json();
        setSchoolTypes(typeData);
      }

    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Redirect effect
  useEffect(() => {
    if (step === 4 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 4 && countdown === 0) {
      navigate('/school-admin');
    }
  }, [step, countdown, navigate]);


  // Step 1: Admin Form
  const adminForm = useForm<z.infer<typeof adminAccountSchema>>({
    resolver: zodResolver(adminAccountSchema),
    defaultValues: {
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
  });

  // Step 2: School Details Form
  const schoolForm = useForm<z.infer<typeof schoolDetailsSchema>>({
    resolver: zodResolver(schoolDetailsSchema),
    defaultValues: {
      schoolName: '',
      schoolSlug: '',
      schoolType: undefined as any,
      contactEmail: '',
      phone: '',
      website: '',
      plan: undefined as any,
      category: undefined as any,
      country: 'Zambia',
      licenseCode: '',
    },
  });

  // Step 3: Location Form
  const locationForm = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      province: '',
      district: '',
      address: '',
    },
  });

  const selectedProvince = locationForm.watch('province');
  const availableDistricts = selectedProvince ? (ZAMBIAN_REGIONS as any)[selectedProvince] || [] : [];
  const selectedCountryName = schoolForm.watch('country');

  // Sync admin email to school contact email if empty
  useEffect(() => {
    const adminEmail = adminForm.getValues('adminEmail');
    const schoolEmail = schoolForm.getValues('contactEmail');
    if (adminEmail && !schoolEmail) {
      schoolForm.setValue('contactEmail', adminEmail);
    }
  }, [step]);

  // Trigger plan refetch when country changes
  useEffect(() => {
    if (selectedCountryName && countries.length > 0) {
      const selectedCountry = countries.find(c => c.name === selectedCountryName);
      if (selectedCountry) {
        fetchMetadata(selectedCountry.id);
      }
    }
  }, [selectedCountryName, countries.length]);

  // Handle step transitions
  const nextStep = async () => {
    if (step === 1) {
      const isValid = await adminForm.trigger();
      if (isValid) setStep(2);
    } else if (step === 2) {
      const isValid = await schoolForm.trigger();
      if (isValid) setStep(3);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const onSubmit = async () => {
    const isLocationValid = await locationForm.trigger();
    if (!isLocationValid) return;

    setIsSubmitting(true);
    try {
      const adminValues = adminForm.getValues();
      const schoolValues = schoolForm.getValues();
      const locationValues = locationForm.getValues();

      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adminValues,
          ...schoolValues,
          ...locationValues,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Perform Auto-Login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: adminValues.adminEmail,
        password: adminValues.adminPassword,
      });

      if (loginError) {
        console.error('Auto-login failed:', loginError);
        // We don't throw here so they still see the success screen, 
        // they just might have to log in manually later if the redirect fails.
      }

      toast({
        title: "Registration Success!",
        description: "Welcome to MUCHI! You are being redirected to your dashboard.",
      });

      setStep(4); // Success step
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


  // Auto-generate slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    schoolForm.setValue('schoolName', name);
    
    const currentSlug = schoolForm.getValues('schoolSlug');
    const autoSlug = generateSlug(name);
    
    if (!currentSlug || autoSlug.startsWith(currentSlug) || currentSlug === autoSlug.substring(0, autoSlug.length - 1)) {
      schoolForm.setValue('schoolSlug', autoSlug);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-500/20 mb-6"
          >
            <Building2 className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">MUCHI for Institutions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg font-medium">Empower your school with modern transparency</p>
        </div>

        {/* Progress Stepper */}
        {step < 4 && (
          <div className="relative flex items-center justify-between mb-12 px-6">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-500 -z-10" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full border-4 flex items-center justify-center text-sm font-bold transition-all duration-300",
                  step === s ? "bg-blue-600 border-blue-100 dark:border-blue-900/50 text-white scale-110 shadow-lg shadow-blue-500/30" : 
                  step > s ? "bg-blue-600 border-blue-600 text-white" : 
                  "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                )}>
                  {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  step === s ? "text-blue-600" : "text-slate-400"
                )}>
                  {s === 1 ? 'Admin' : s === 2 ? 'Details' : 'Location'}
                </span>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none dark:border dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Security Setup</CardTitle>
                  </div>
                  <CardDescription>Create the root administrator account. This user will have full control over the school portal.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...adminForm}>
                    <form className="space-y-5">
                      <FormField
                        control={adminForm.control}
                        name="adminName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-slate-700 dark:text-slate-300">Administrator Full Name</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                <Input placeholder="e.g. John Mwila" className="pl-10 h-12 border-slate-200 dark:border-slate-800 focus:ring-blue-600" {...field} />
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
                            <FormLabel className="font-semibold text-slate-700 dark:text-slate-300">Email Address</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                <Input placeholder="admin@school.com" className="pl-10 h-12 border-slate-200 dark:border-slate-800" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={adminForm.control}
                          name="adminPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold text-slate-700 dark:text-slate-300">Password</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                  <Input type="password" placeholder="••••••••" className="pl-10 h-12 border-slate-200 dark:border-slate-800" {...field} />
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
                              <FormLabel className="font-semibold text-slate-700 dark:text-slate-300">Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                  <Input type="password" placeholder="••••••••" className="pl-10 h-12 border-slate-200 dark:border-slate-800" {...field} />
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
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg shadow-lg shadow-blue-500/20 group"
                      >
                        Next Step <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
              <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-indigo-600 to-blue-600" />
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <Building className="h-5 w-5 text-indigo-600" />
                    </div>
                    <CardTitle className="text-2xl">Institution Profile</CardTitle>
                  </div>
                  <CardDescription>Tell us about your school to customize your experience.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...schoolForm}>
                    <form className="space-y-5">
                      <FormField
                        control={schoolForm.control}
                        name="schoolName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Institution Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                  placeholder="e.g. Margaret Mwachiyeya Secondary" 
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
                            <FormLabel className="font-semibold">URL Slug (School Handle)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input placeholder="e.g. margaret-secondary" className="pl-10 h-12" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              Public Address: muchi.io/<strong>{field.value || 'handle'}</strong>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={schoolForm.control}
                          name="schoolType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">School Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingMetadata ? (
                                    <div className="p-2 flex justify-center">
                                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    </div>
                                  ) : schoolTypes.length > 0 ? (
                                    schoolTypes.map(type => (
                                      <SelectItem key={type.id} value={type.name}>
                                        {type.name} {type.description && <span className="text-xs text-slate-500 ml-1">{type.description}</span>}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <>
                                      <SelectItem value="Primary School">Primary School (Grades 1-7)</SelectItem>
                                      <SelectItem value="Secondary School">Secondary School (Grades 8-12)</SelectItem>
                                      <SelectItem value="Basic School">Basic School (Grades 1-9)</SelectItem>
                                      <SelectItem value="Combined School">Combined School (Grades 1-12)</SelectItem>
                                    </>
                                  )}
                                </SelectContent>

                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={schoolForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">
                                School Category
                              </FormLabel>

                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingMetadata ? (
                                    <div className="p-2 flex justify-center">
                                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    </div>
                                  ) : categories.length > 0 ? (
                                    categories.map(cat => (
                                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))
                                  ) : (
                                    <>
                                      <SelectItem value="Government">Government / Public</SelectItem>
                                      <SelectItem value="Private">Private School</SelectItem>
                                      <SelectItem value="Mission">Mission School</SelectItem>
                                      <SelectItem value="Community">Community School</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={schoolForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold text-slate-700 dark:text-slate-300">Base Country</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20">
                                    <SelectValue placeholder="Select Country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingMetadata ? (
                                    <div className="p-2 flex justify-center">
                                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    </div>
                                  ) : countries.length > 0 ? (
                                    countries.map(country => (
                                      <SelectItem key={country.id} value={country.name}>{country.name}</SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="Zambia">Zambia</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={schoolForm.control}
                          name="plan"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Subscription Plan</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select plan" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingMetadata ? (
                                    <div className="p-2 flex justify-center">
                                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    </div>
                                  ) : plans.length > 0 ? (
                                    plans.map(plan => (
                                      <SelectItem key={plan.id} value={plan.name}>
                                        <div className="flex flex-col py-1">
                                          <span className="font-medium text-slate-900 dark:text-white">
                                            {plan.name} {plan.price > 0 && `(${plan.currency} ${plan.price.toLocaleString()})`}
                                          </span>
                                          {plan.description && (
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                              {plan.description}
                                            </span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="Standard">Default Standard</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {field.value && plans.find(p => p.name === field.value)?.description && (
                                <FormDescription className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                                  {plans.find(p => p.name === field.value)?.description}
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>


                      <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/20 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                          <ShieldCheck className="h-4 w-4" />
                          <h4 className="text-sm font-bold">Have a License Code?</h4>
                        </div>
                        <FormField
                          control={schoolForm.control}
                          name="licenseCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="MUCHI-XXXX-XXXX" 
                                  className="h-11 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 font-mono text-center tracking-widest" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                If you have a pre-paid license code, enter it here. This will override the selected plan.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={schoolForm.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Contact Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input placeholder="info@school.com" className="pl-10 h-12" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={schoolForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Phone Number</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input placeholder="+260..." className="pl-10 h-12" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-4 pt-2">
                        <Button type="button" variant="ghost" onClick={prevStep} className="h-12 font-bold px-8">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={nextStep} 
                          className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg group shadow-lg shadow-indigo-500/20"
                        >
                          Next Step <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Location & Verification</CardTitle>
                  </div>
                  <CardDescription>Specify where your institution is located.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...locationForm}>
                    <form className="space-y-6">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100/50 dark:border-blue-800/20 mb-6">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Institution: <span className="font-bold text-blue-900 dark:text-white">{schoolForm.getValues('schoolName')}</span>
                        </p>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400">
                          Region: {schoolForm.getValues('country')}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={locationForm.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Province</FormLabel>
                              <Select onValueChange={(val) => {
                                field.onChange(val);
                                locationForm.setValue('district', '');
                              }} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select Province" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.keys(ZAMBIAN_REGIONS).map(prov => (
                                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={locationForm.control}
                          name="district"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">District</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={!selectedProvince}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder={selectedProvince ? "Select District" : "Select Province first"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableDistricts.map((dist: string) => (
                                    <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={locationForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Physical Address / Street</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input placeholder="Plot number, Street name, Area" className="pl-10 h-12" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                        <Sparkles className="h-5 w-5 flex-shrink-0" />
                        <p>Note: Once submitted, your registration will be reviewed by our compliance team. You will be notified via email once your account is active.</p>
                      </div>

                      <div className="flex gap-4 pt-2">
                        <Button type="button" variant="ghost" onClick={prevStep} className="h-12 font-bold px-8">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={onSubmit} 
                          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/20"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                            </>
                          ) : (
                            <>
                              Finalise Registration <CheckCircle2 className="ml-2 h-5 w-5" />
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

          {step === 4 && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="border-none shadow-[0_30px_60px_rgba(0,0,0,0.1)] p-12 bg-white dark:bg-slate-900 overflow-hidden relative">
                {/* Floating particles effect */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 animate-gradient-x" />
                
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12 shadow-xl shadow-green-500/10">
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  >
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </motion.div>
                </div>
                
                <CardTitle className="text-4xl font-black mb-4 text-slate-900 dark:text-white tracking-tight">
                  Welcome to the Future!
                </CardTitle>
                
                <div className="space-y-6 text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  <p className="text-xl font-medium leading-relaxed">
                    Account created for <span className="font-bold text-blue-600">{schoolForm.getValues('schoolName')}</span>. You're all set to transform your institution.
                  </p>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4" /> Redirecting to your dashboard in {countdown}s...
                    </p>
                  </div>
                </div>
                
                <div className="mt-12 space-y-4">
                  <Button 
                    onClick={() => navigate('/school-admin')} 
                    className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-xl rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all group"
                  >
                    Proceed to Dashboard <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <div className="flex items-center justify-center gap-6 pt-6">
                    <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                      Manual Login
                    </button>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <button className="text-sm font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                      <ExternalLink className="h-4 w-4" /> Help Center
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>

        {step < 4 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 text-center"
          >
            <p className="text-slate-500 font-medium">
              Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline ml-1 inline-flex items-center">Log in to Portal <ChevronRight className="h-4 w-4" /></Link>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
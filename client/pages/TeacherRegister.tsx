import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  School, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Search,
  BookOpen,
  GraduationCap,
  Users,
  BookMarked
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form Schemas
const schoolSchema = z.object({
  schoolId: z.string().min(1, "Please select a school"),
});

const accountSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const classSchema = z.object({
  classId: z.string().optional(),
});

const subjectsSchema = z.object({
  subjects: z.array(z.string()).min(1, "Please select at least one subject"),
});

interface SchoolData {
  id: string;
  name: string;
  slug: string;
  address?: string;
  logo_url?: string;
}

interface ClassData {
  id: string;
  name: string;
}

interface SubjectData {
  id: string;
  name: string;
}

export default function TeacherRegister() {
  const [step, setStep] = useState(1);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<SchoolData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [isLoadingClassesSubjects, setIsLoadingClassesSubjects] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Step 1 Form
  const schoolForm = useForm<z.infer<typeof schoolSchema>>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { schoolId: "" },
  });

  // Step 2 Form
  const accountForm = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Step 3 Form
  const classForm = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { classId: "" },
  });

  // Step 4 Form
  const subjectsForm = useForm<z.infer<typeof subjectsSchema>>({
    resolver: zodResolver(subjectsSchema),
    defaultValues: { subjects: [] },
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchClassesAndSubjects(selectedSchool.id);
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSchools(schools);
    } else {
      const filtered = schools.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSchools(filtered);
    }
  }, [searchQuery, schools]);

  const fetchSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, slug, address, logo_url')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
      setFilteredSchools(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching schools",
        description: error.message,
      });
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const fetchClassesAndSubjects = async (schoolId: string) => {
    setIsLoadingClassesSubjects(true);
    try {
      // Fetch Classes
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      
      if (classError) throw classError;
      setClasses(classData || []);

      // Fetch Subjects
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      
      if (subjectError) throw subjectError;
      
      const subjectOptions = (subjectData || []).map(s => ({
        label: s.name,
        value: s.id
      }));
      setSubjects(subjectOptions);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching school details",
        description: error.message,
      });
    } finally {
      setIsLoadingClassesSubjects(false);
    }
  };

  const handleSchoolSelect = (school: SchoolData) => {
    setSelectedSchool(school);
    schoolForm.setValue('schoolId', school.id);
  };

  const onNextStep = async () => {
    if (step === 1) {
      const isValid = await schoolForm.trigger();
      if (isValid && selectedSchool) {
        setStep(2);
      }
    } else if (step === 2) {
      const isValid = await accountForm.trigger();
      if (isValid) {
        setStep(3);
      }
    } else if (step === 3) {
      const isValid = await classForm.trigger();
      if (isValid) {
        setStep(4);
      }
    }
  };

  const onPrevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const onSubmit = async () => {
    const accountValues = accountForm.getValues();
    const classValues = classForm.getValues();
    const subjectsValues = subjectsForm.getValues();

    if (!selectedSchool) return;
    
    setIsSubmitting(true);
    try {
      // 1. Sign up user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: accountValues.email,
        password: accountValues.password,
        options: {
          data: {
            full_name: accountValues.fullName,
            school_id: selectedSchool.id,
            role: 'teacher',
          }
        }
      });

      if (signUpError) throw signUpError;
      const userId = signUpData.user?.id;

      if (userId) {
        // 2. Update profile with subjects
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            subjects: subjectsValues.subjects 
          })
          .eq('id', userId);
        
        if (profileError) {
          console.error("Profile update error:", profileError);
        }

        // 3. Update class if selected
        if (classValues.classId) {
          const { error: classUpdateError } = await supabase
            .from('classes')
            .update({ class_teacher_id: userId })
            .eq('id', classValues.classId);
          
          if (classUpdateError) {
            console.error("Class update error:", classUpdateError);
          }
        }
      }

      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });
      
      setStep(5); // Success step
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Select School", icon: School },
    { id: 2, title: "Account Details", icon: User },
    { id: 3, title: "Assign Class", icon: Users },
    { id: 4, title: "Your Subjects", icon: BookMarked },
    { id: 5, title: "Complete", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl mb-4 text-white">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Teacher Registration</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Join your school's digital platform</p>
      </div>

      {/* Progress Indicator */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors border-2",
                  step >= s.id 
                    ? "bg-blue-600 border-blue-600 text-white" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                )}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium",
                step >= s.id ? "text-blue-600" : "text-slate-400"
              )}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-xl shadow-blue-500/5">
                <CardHeader>
                  <CardTitle>Find Your School</CardTitle>
                  <CardDescription>Search and select the school you are affiliated with.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search by school name or location..." 
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {isLoadingSchools ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p>Loading schools...</p>
                      </div>
                    ) : filteredSchools.length > 0 ? (
                      filteredSchools.map((school) => (
                        <div
                          key={school.id}
                          onClick={() => handleSchoolSelect(school)}
                          className={cn(
                            "group p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4",
                            selectedSchool?.id === school.id
                              ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10"
                              : "border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 bg-white dark:bg-slate-900"
                          )}
                        >
                          <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors overflow-hidden">
                            {school.logo_url ? (
                              <img src={school.logo_url} alt={school.name} className="h-full w-full object-cover" />
                            ) : (
                              <School className="h-6 w-6" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{school.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              {school.address || "Location not specified"}
                            </p>
                          </div>
                          {selectedSchool?.id === school.id && (
                            <div className="bg-blue-600 text-white rounded-full p-1">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <p>No schools found matching your search.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex justify-between items-center">
                    <Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 font-medium">
                      Already have an account? Login
                    </Link>
                    <Button 
                      onClick={onNextStep} 
                      disabled={!selectedSchool}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
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
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-xl shadow-blue-500/5">
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>
                    Registering for <span className="font-semibold text-blue-600">{selectedSchool?.name}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...accountForm}>
                    <form className="space-y-4">
                      <FormField
                        control={accountForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input {...field} placeholder="Enter your full name" className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={accountForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input {...field} type="email" placeholder="Enter your email" className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={accountForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input {...field} type="password" placeholder="••••••••" className="pl-10" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={accountForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input {...field} type="password" placeholder="••••••••" className="pl-10" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="pt-6 flex gap-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={onPrevStep}
                          className="flex-1"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button 
                          type="button" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={onNextStep}
                        >
                          Next Step <ArrowRight className="ml-2 h-4 w-4" />
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
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-xl shadow-blue-500/5">
                <CardHeader>
                  <CardTitle>Assign to Class</CardTitle>
                  <CardDescription>
                    Select the class you are the primary teacher for (optional).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...classForm}>
                    <form className="space-y-4">
                      <FormField
                        control={classForm.control}
                        name="classId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Class</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingClassesSubjects ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading classes...</span>
                                  </div>
                                ) : classes.length > 0 ? (
                                  classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                      {cls.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="py-2 px-4 text-slate-500">No classes found</div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="pt-6 flex gap-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={onPrevStep}
                          className="flex-1"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button 
                          type="button" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={onNextStep}
                        >
                          Next Step <ArrowRight className="ml-2 h-4 w-4" />
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
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-xl shadow-blue-500/5">
                <CardHeader>
                  <CardTitle>Select Your Subjects</CardTitle>
                  <CardDescription>
                    Choose the subjects you teach at this school.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...subjectsForm}>
                    <form onSubmit={subjectsForm.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={subjectsForm.control}
                        name="subjects"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subjects</FormLabel>
                            <FormControl>
                              <MultiSelect
                                options={subjects}
                                selected={field.value}
                                onChange={field.onChange}
                                placeholder="Select subjects..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="pt-6 flex gap-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={onPrevStep}
                          className="flex-1"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...
                            </>
                          ) : (
                            <>Complete Registration <ArrowRight className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-xl shadow-blue-500/5 text-center p-8">
                <CardContent className="space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full p-6">
                      <CheckCircle2 className="h-16 w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Registration Submitted!</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      We've sent a verification email to your address. Please verify your account before logging in.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm text-slate-500 dark:text-slate-400 text-left">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Next Steps:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Check your email inbox (and spam folder)</li>
                      <li>Click the verification link in the email</li>
                      <li>Wait for school admin approval (if required)</li>
                      <li>Log in to access your teacher portal</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={() => navigate('/login')} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Login Page
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

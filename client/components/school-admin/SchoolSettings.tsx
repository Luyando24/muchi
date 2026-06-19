import React, { useState, useEffect } from 'react';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Save,
  Shield,
  Bell,
  Palette,
  Loader2,
  X,
  Calendar,
  AlertCircle,
  School as SchoolIcon // imported School for the type
} from 'lucide-react';
import { ZAMBIAN_REGIONS } from '@/lib/regions';
import { standardizeSubjectName } from '@shared/name-standardization';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { School, SchoolCategory, Country } from '@shared/api';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { markSettingsCompletionPopupEligibleInOneMinute } from '@/lib/settingsCompletionPrompt';
import { processSchoolAsset } from '@/lib/uploadUtils';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminManagement from './AdminManagement';


interface SchoolSettingsProps {
  onSettingsSaved?: (settings: any) => void;
}

export default function SchoolSettings({ onSettingsSaved }: SchoolSettingsProps = {}) {
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [ministryCalendar, setMinistryCalendar] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    academic_year: '',
    current_term: '',
    exam_types: [] as string[],
    test_types: [] as string[],
    test_types_enabled: true,
    simplified_assessment_mode: true,
    email: '',
    phone: '',
    address: '',
    province: '',
    district: '',
    website: '',
    logo_url: '',
    signature_url: '',
    seal_url: '',
    coat_of_arms_url: '',
    headteacher_name: '',
    headteacher_title: 'Headteacher',
    school_type: 'Secondary School' as string,
    category: '',
    country: 'Zambia',
    location_type: 'Urban',
    boarding_status: '',
    gender_composition: '',
    compulsory_subjects_primary: [] as string[],
    compulsory_subjects_secondary: [] as string[],
    show_teacher_on_report_card: false,
    enable_tuckshop: true,
    ict_name: '',
    ict_email: '',
    ict_phone: ''
  });

  const [categories, setCategories] = useState<SchoolCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  const [newExamType, setNewExamType] = useState('');
  const [newTestType, setNewTestType] = useState('');
  const [newCompulsorySubjectPrimary, setNewCompulsorySubjectPrimary] = useState('');
  const [newCompulsorySubjectSecondary, setNewCompulsorySubjectSecondary] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([]);

  const mandatoryFields = [
    { key: "name", label: "School Name" },
    { key: "school_type", label: "School Type" },
    { key: "academic_year", label: "Academic Year" },
    { key: "current_term", label: "Current Term" },
    { key: "email", label: "Contact Email" },
    { key: "phone", label: "Phone Number" },
    { key: "province", label: "Province" },
    { key: "district", label: "District" },
    { key: "logo_url", label: "School Logo" },
    { key: "headteacher_name", label: "Headteacher Name" },
    { key: "signature_url", label: "Headteacher Signature" },
    { key: "ict_name", label: "ICT Support Name" },
    { key: "ict_email", label: "ICT Support Email" },
    { key: "ict_phone", label: "ICT Support Phone" },
    { key: "boarding_status", label: "Boarding Status" },
    { key: "gender_composition", label: "Gender Composition" }
  ];

  const missingFieldsOnClient = mandatoryFields.filter(
    field => !formData[field.key as keyof typeof formData] || 
             (typeof formData[field.key as keyof typeof formData] === 'string' && 
              (formData[field.key as keyof typeof formData] as string).trim() === '')
  );

  const completionPercentage = Math.round(
    ((mandatoryFields.length - missingFieldsOnClient.length) / mandatoryFields.length) * 100
  );

  const fetchMetadata = async () => {
    setIsLoadingMeta(true);
    try {
      const catData = await syncFetch('/api/admin/school-categories', { cacheKey: 'admin-school-categories' });
      const countData = await syncFetch('/api/admin/countries', { cacheKey: 'admin-countries' });
      
      if (catData) setCategories(catData);
      if (countData) setCountries(countData);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const data = await syncFetch('/api/school/settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        cacheKey: 'school-settings'
      });

      setSchool(data);
      setFormData({
        name: data.name || '',
        academic_year: data.academic_year || '',
        current_term: data.current_term || '',
        exam_types: data.exam_types || ['Mid Term', 'End of Term'],
        test_types: data.test_types || [],
        test_types_enabled: data.test_types_enabled ?? false,
        simplified_assessment_mode: data.simplified_assessment_mode ?? false,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        province: data.province || '',
        district: data.district || '',
        website: data.website || '',
        logo_url: data.logo_url || '',
        signature_url: data.signature_url || '',
        seal_url: data.seal_url || '',
        coat_of_arms_url: data.coat_of_arms_url || '',
        headteacher_name: data.headteacher_name || '',
        headteacher_title: data.headteacher_title || 'Headteacher',
        school_type: data.school_type || 'Secondary School',
        category: data.category || '',
        country: data.country || 'Zambia',
        location_type: data.location_type || 'Urban',
        boarding_status: data.boarding_status || '',
        gender_composition: data.gender_composition || '',
        compulsory_subjects_primary: data.compulsory_subjects_primary || ['Special Paper 1', 'Special Paper 2'],
        compulsory_subjects_secondary: data.compulsory_subjects_secondary || ['English'],
        show_teacher_on_report_card: data.show_teacher_on_report_card ?? false,
        enable_tuckshop: data.enable_tuckshop ?? true,
        ict_name: data.ict_name || '',
        ict_email: data.ict_email || '',
        ict_phone: data.ict_phone || ''
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      if (toast) {
        toast({
          title: "Error",
          description: "Failed to load school settings.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSubjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await syncFetch('/api/school/subjects', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: 'school-subjects-list'
      });
      setAvailableSubjects(data || []);
    } catch (err) {
      console.error('Error fetching available subjects:', err);
    }
  };

  const fetchMinistryCalendar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await syncFetch('/api/school/ministry-calendar', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: 'school-ministry-calendar'
      });
      setMinistryCalendar(data || []);
    } catch (err) {
      console.error('Error fetching ministry calendar:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchAvailableSubjects();
    fetchMinistryCalendar();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addExamType = () => {
    if (newExamType.trim() && !formData.exam_types.includes(newExamType.trim())) {
      setFormData(prev => ({
        ...prev,
        exam_types: [...prev.exam_types, newExamType.trim()]
      }));
      setNewExamType('');
    }
  };

  const removeExamType = (typeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      exam_types: prev.exam_types.filter(type => type !== typeToRemove)
    }));
  };

  const addTestType = () => {
    if (newTestType.trim() && !(formData.test_types || []).includes(newTestType.trim())) {
      setFormData(prev => ({
        ...prev,
        test_types: [...(prev.test_types || []), newTestType.trim()]
      }));
      setNewTestType('');
    }
  };

  const removeTestType = (typeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      test_types: (prev.test_types || []).filter(type => type !== typeToRemove)
    }));
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const result = await syncFetch('/api/school/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          exam_types: ['Mid Term', 'End of Term']
        })
      });

      if (result.offline) {
        toast({
          title: "Offline Mode",
          description: "School settings update queued and will sync when online.",
        });
      } else {
        setSchool(result);
        if (onSettingsSaved) {
          onSettingsSaved(result);
        }
        const wasIctIncomplete =
          !formData.ict_name.trim() || !formData.ict_email.trim() || !formData.ict_phone.trim();
        const isIctNowComplete =
          Boolean(result.ict_name?.trim()) &&
          Boolean(result.ict_email?.trim()) &&
          Boolean(result.ict_phone?.trim());
        if (wasIctIncomplete && isIctNowComplete) {
          markSettingsCompletionPopupEligibleInOneMinute();
        }
        toast({
          title: "Success",
          description: "Settings updated successfully"
        });
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleHeaderSaveClick = (e: React.MouseEvent) => {
    const formEl = document.getElementById('school-settings-form') as HTMLFormElement | null;
    if (formEl) {
      if (formEl.reportValidity()) {
        handleSave(e);
      }
    } else {
      handleSave(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-50 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 flex items-center justify-between transition-all">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Configure school parameters and preferences.</p>
        </div>
        <Button 
          onClick={handleHeaderSaveClick} 
          disabled={isSaving}
          className="shadow-sm"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Settings Completion Progress Tracker */}
      <Card className={cn(
        "border shadow-sm overflow-hidden",
        completionPercentage >= 90
          ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/5"
          : "border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/5"
      )}>
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className={cn(
                  "text-base font-black flex items-center gap-2",
                  completionPercentage >= 90
                    ? "text-emerald-800 dark:text-emerald-300"
                    : "text-amber-800 dark:text-amber-300"
                )}>
                  <span>Profile Completion</span>
                  <Badge variant="outline" className={cn(
                    "font-bold uppercase tracking-wider text-[10px]",
                    completionPercentage >= 90
                      ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30"
                      : "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30"
                  )}>
                    {completionPercentage >= 90 ? "Ready to Use" : "Action Required"}
                  </Badge>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Mandatory fields must be at least 90% complete to use all system features.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={cn(
                  "text-2xl font-black",
                  completionPercentage >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {completionPercentage}%
                </span>
              </div>
            </div>
            <Progress
              value={completionPercentage}
              className={cn(
                "h-2 bg-slate-100 dark:bg-slate-800",
                completionPercentage >= 90 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2 md:max-w-md">
            {mandatoryFields.map((field) => {
              const isFilled = formData[field.key as keyof typeof formData] &&
                (typeof formData[field.key as keyof typeof formData] !== 'string' ||
                 (formData[field.key as keyof typeof formData] as string).trim() !== '');
              return (
                <Badge
                  key={field.key}
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold transition-all duration-200",
                    isFilled
                      ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 dark:border-emerald-900 dark:text-emerald-400 dark:bg-emerald-950/20"
                      : "border-slate-200 text-slate-400 bg-slate-50 dark:border-slate-800 dark:text-slate-500 dark:bg-slate-900/50"
                  )}
                >
                  <span className="mr-1">{isFilled ? "✓" : "○"}</span>
                  {field.label}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <style dangerouslySetInnerHTML={{
        __html: `
        .asset-upload-card {
          transition: all 0.3s ease;
        }
        .asset-upload-card:hover {
          border-color: #4f46e5;
          background-color: rgba(79, 70, 229, 0.02);
        }
      `}} />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="certification">Official Certification</TabsTrigger>
          <TabsTrigger value="admins">Admin Access</TabsTrigger>
          <TabsTrigger value="calendar">Ministry Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <form id="school-settings-form" onSubmit={handleSave} className="space-y-6">
                
                {/* CARD 1: School Identity */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white">School Identity</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Official name, registration identifiers, and school type configuration.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Name <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="Enter school name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School ID</Label>
                      <Input value={school?.id || ''} disabled className="bg-slate-50 dark:bg-slate-900/50 font-mono text-sm border-slate-200 dark:border-slate-800" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="school_type" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Type <span className="text-rose-500">*</span></Label>
                      <Select
                        value={formData.school_type}
                        onValueChange={(value: 'Primary School' | 'Secondary School' | 'Basic School' | 'Combined School' | 'Preschool' | 'Lower Primary' | 'Upper Primary' | 'Combined Primary' | 'Combined Primary & Preschool') =>
                          setFormData(prev => ({ ...prev, school_type: value }))
                        }
                      >
                        <SelectTrigger id="school_type" className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Preschool">Preschool / ECD (Baby Class – KG)</SelectItem>
                          <SelectItem value="Lower Primary">Lower Primary (Grades 1-4)</SelectItem>
                          <SelectItem value="Upper Primary">Upper Primary (Grades 5-7)</SelectItem>
                          <SelectItem value="Combined Primary">Combined Primary (Grades 1-7)</SelectItem>
                          <SelectItem value="Combined Primary & Preschool">Combined Primary & Preschool (ECD - Grade 7)</SelectItem>
                          <SelectItem value="Primary School">Primary School (Legacy 1-7)</SelectItem>
                          <SelectItem value="Secondary School">Secondary School (Grades 8-12)</SelectItem>
                          <SelectItem value="Basic School">Basic School (Grades 1-9)</SelectItem>
                          <SelectItem value="Combined School">Combined School (Grades 1-12)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger id="category" className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingMeta ? (
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
                      <p className="text-[9px] text-slate-500 italic">* Collected for Ministry of Education statistical purposes.</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="location_type" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Location Type</Label>
                      <Select
                        value={formData.location_type}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, location_type: value }))
                        }
                      >
                        <SelectTrigger id="location_type" className="w-full">
                          <SelectValue placeholder="Select location type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Urban">Urban (Town / City)</SelectItem>
                          <SelectItem value="Rural">Rural (Village / Remote Area)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-slate-500 italic">* Used by the government to track teacher deployment and rural shortages.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="boarding_status" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Boarding Status</Label>
                      <Select
                        value={formData.boarding_status}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, boarding_status: value }))
                        }
                      >
                        <SelectTrigger id="boarding_status" className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Day">Day School Only</SelectItem>
                          <SelectItem value="Both">Day and Boarding</SelectItem>
                          <SelectItem value="Boarding">Boarding Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender_composition" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gender Composition</Label>
                      <Select
                        value={formData.gender_composition}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, gender_composition: value }))
                        }
                      >
                        <SelectTrigger id="gender_composition" className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Co-educational">Co-educational</SelectItem>
                          <SelectItem value="Girls only">Girls Only</SelectItem>
                          <SelectItem value="Boys only">Boys Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 2: Academic Period & Grading */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white">Academic Calendar & Grading</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Active calendar period, assessment types, and nested test structures.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="academic_year" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Academic Year <span className="text-rose-500">*</span></Label>
                        <Input
                          id="academic_year"
                          name="academic_year"
                          value={formData.academic_year}
                          disabled
                          placeholder="e.g. 2026"
                          className="bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="current_term" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Term <span className="text-rose-500">*</span></Label>
                        <Input
                          id="current_term"
                          name="current_term"
                          value={formData.current_term}
                          disabled
                          placeholder="e.g. Term 1"
                          className="bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-medium"
                        />
                      </div>

                      <div className="md:col-span-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-950 p-3 rounded-lg flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                          Active Term and Academic Year are managed automatically by the Ministry of Education School Calendar. School administrators cannot modify these values directly.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t pt-4 border-slate-100 dark:border-slate-800/50">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assessment/Exam Types</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 mb-1">
                          {['Mid Term', 'End of Term'].map((type, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">Assessment types are locked to the standard "Mid Term" and "End of Term" defaults.</p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-4 border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold text-slate-900 dark:text-white">Enable Nested Test Types</Label>
                          <p className="text-xs text-slate-500">Record individual test scores (e.g. Test 1, Test 2, Test 3) under Mid Term or End of Term assessments.</p>
                        </div>
                        <Switch
                          checked={formData.test_types_enabled}
                          onCheckedChange={(checked) =>
                            setFormData(prev => ({ ...prev, test_types_enabled: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between border-t pt-4 border-slate-100 dark:border-slate-800/50">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold text-slate-900 dark:text-white">Simplified Assessment Mode</Label>
                          <p className="text-xs text-slate-500">Hide Mid-Term and End-of-Term options. All entries are allocated directly into the active Term.</p>
                        </div>
                        <Switch
                          checked={formData.simplified_assessment_mode}
                          onCheckedChange={(checked) =>
                            setFormData(prev => ({ ...prev, simplified_assessment_mode: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between border-t pt-4 border-slate-100 dark:border-slate-800/50">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold text-slate-900 dark:text-white">Display Teacher Names on Report Card</Label>
                          <p className="text-xs text-slate-500">Show the class teacher in the header and each subject teacher under their subject, formatted as first initial and last name (e.g. J. Doe).</p>
                        </div>
                        <Switch
                          checked={formData.show_teacher_on_report_card}
                          onCheckedChange={(checked) =>
                            setFormData(prev => ({ ...prev, show_teacher_on_report_card: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between border-t pt-4 border-slate-100 dark:border-slate-800/50">
                        <div className="space-y-0.5">
                          <Label className="text-base font-bold text-slate-900 dark:text-white">Enable Tuckshop Management</Label>
                          <p className="text-xs text-slate-500">Allow tracking sales, managing inventory, and assigning personnel to run the school tuckshop.</p>
                        </div>
                        <Switch
                          checked={formData.enable_tuckshop}
                          onCheckedChange={(checked) =>
                            setFormData(prev => ({ ...prev, enable_tuckshop: checked }))
                          }
                        />
                      </div>
                    </div>

                    {formData.test_types_enabled && (
                      <div className="space-y-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Configure Active Test Types</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(formData.test_types || []).map((type, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              >
                                {type}
                                <button
                                  type="button"
                                  onClick={() => removeTestType(type)}
                                  className="text-blue-500 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))}
                            {(!formData.test_types || formData.test_types.length === 0) && (
                              <span className="text-sm text-slate-500 italic">No custom test types defined (defaulting to Test 1, Test 2, Test 3)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="e.g. Test 1, Test 2"
                              value={newTestType}
                              onChange={(e) => setNewTestType(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addTestType();
                                  }
                                }}
                              className="max-w-xs bg-white dark:bg-slate-950"
                            />
                            <Button type="button" onClick={addTestType} variant="secondary">Add</Button>
                          </div>
                          <p className="text-[11px] text-slate-500">Configure nested test types. These will appear as sub-selections in the Gradebook and render as columns on Report Cards.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* CARD 3: Compulsory Subjects */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white">Compulsory Subjects</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Required core subjects for overall averages and point calculations.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Compulsory Subjects (Senior Secondary Points Calculation)</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(formData.compulsory_subjects_secondary || []).map((subject, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            >
                              {subject}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    compulsory_subjects_secondary: prev.compulsory_subjects_secondary.filter(s => s !== subject)
                                  }));
                                }}
                                className="text-indigo-500 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                          {(!formData.compulsory_subjects_secondary || formData.compulsory_subjects_secondary.length === 0) && (
                            <span className="text-sm text-slate-500 italic">No secondary compulsory subjects configured (defaulting to English)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            onValueChange={(value) => {
                              if (value && !formData.compulsory_subjects_secondary.includes(value)) {
                                setFormData(prev => ({
                                  ...prev,
                                  compulsory_subjects_secondary: [...prev.compulsory_subjects_secondary, value]
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="max-w-xs bg-white dark:bg-slate-950">
                              <SelectValue placeholder="Select from school subjects..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSubjects.map(sub => (
                                <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-slate-400 text-xs px-1">or</span>
                          <Input
                            placeholder="Type custom subject name..."
                            value={newCompulsorySubjectSecondary}
                            onChange={(e) => setNewCompulsorySubjectSecondary(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const standardized = standardizeSubjectName(newCompulsorySubjectSecondary.trim());
                                if (standardized && !formData.compulsory_subjects_secondary.includes(standardized)) {
                                  setFormData(prev => ({
                                    ...prev,
                                    compulsory_subjects_secondary: [...prev.compulsory_subjects_secondary, standardized]
                                  }));
                                  setNewCompulsorySubjectSecondary('');
                                }
                              }
                            }}
                            className="max-w-xs"
                          />
                          <Button 
                            type="button" 
                            onClick={() => {
                              const standardized = standardizeSubjectName(newCompulsorySubjectSecondary.trim());
                              if (standardized && !formData.compulsory_subjects_secondary.includes(standardized)) {
                                setFormData(prev => ({
                                  ...prev,
                                  compulsory_subjects_secondary: [...prev.compulsory_subjects_secondary, standardized]
                                }));
                                setNewCompulsorySubjectSecondary('');
                              }
                            }} 
                            variant="secondary"
                          >
                            Add Custom
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">Configure secondary compulsory subjects. Default is English.</p>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-6 border-slate-100 dark:border-slate-800/50">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Compulsory Subjects (Primary Grade 5-7 Marks Calculation)</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(formData.compulsory_subjects_primary || []).map((subject, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            >
                              {subject}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    compulsory_subjects_primary: prev.compulsory_subjects_primary.filter(s => s !== subject)
                                  }));
                                }}
                                className="text-emerald-500 hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                          {(!formData.compulsory_subjects_primary || formData.compulsory_subjects_primary.length === 0) && (
                            <span className="text-sm text-slate-500 italic">No primary compulsory subjects configured (defaulting to Special Paper 1 & 2)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            onValueChange={(value) => {
                              if (value && !formData.compulsory_subjects_primary.includes(value)) {
                                setFormData(prev => ({
                                  ...prev,
                                  compulsory_subjects_primary: [...prev.compulsory_subjects_primary, value]
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="max-w-xs bg-white dark:bg-slate-950">
                              <SelectValue placeholder="Select from school subjects..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSubjects.map(sub => (
                                <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-slate-400 text-xs px-1">or</span>
                          <Input
                            placeholder="Type custom subject name..."
                            value={newCompulsorySubjectPrimary}
                            onChange={(e) => setNewCompulsorySubjectPrimary(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const standardized = standardizeSubjectName(newCompulsorySubjectPrimary.trim());
                                if (standardized && !formData.compulsory_subjects_primary.includes(standardized)) {
                                  setFormData(prev => ({
                                    ...prev,
                                    compulsory_subjects_primary: [...prev.compulsory_subjects_primary, standardized]
                                  }));
                                  setNewCompulsorySubjectPrimary('');
                                }
                              }
                            }}
                            className="max-w-xs"
                          />
                          <Button 
                            type="button" 
                            onClick={() => {
                              const standardized = standardizeSubjectName(newCompulsorySubjectPrimary.trim());
                              if (standardized && !formData.compulsory_subjects_primary.includes(standardized)) {
                                setFormData(prev => ({
                                  ...prev,
                                  compulsory_subjects_primary: [...prev.compulsory_subjects_primary, standardized]
                                }));
                                setNewCompulsorySubjectPrimary('');
                              }
                            }} 
                            variant="secondary"
                          >
                            Add Custom
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">Configure primary compulsory subjects. Default is Special Paper 1 & Special Paper 2.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 4: School Administration */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white">Administration</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Headteacher credentials appearing on official reports.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="headteacher_name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Headteacher Name <span className="text-rose-500">*</span></Label>
                      <Input
                        id="headteacher_name"
                        name="headteacher_name"
                        value={formData.headteacher_name}
                        onChange={handleInputChange}
                        placeholder="e.g. Mr. John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="headteacher_title" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Headteacher Qualifications (Title)</Label>
                      <Input
                        id="headteacher_title"
                        name="headteacher_title"
                        value={formData.headteacher_title}
                        onChange={handleInputChange}
                        placeholder="e.g. MA(Edn Mgt), BA(Edn)"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 5: Contact & Location */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white">Contact & Location</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Manage contact information and geographic region details.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact Email <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="info@school.edu"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone Number <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="+260..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Country</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, country: value }))
                        }
                      >
                        <SelectTrigger id="country" className="w-full">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingMeta ? (
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Province <span className="text-rose-500">*</span></Label>
                      <Select
                        value={formData.province}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, province: value, district: '' }))
                        }
                      >
                        <SelectTrigger id="province" className="w-full">
                          <SelectValue placeholder="Select Province" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(ZAMBIAN_REGIONS).map(province => (
                            <SelectItem key={province} value={province}>{province}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="district" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">District <span className="text-rose-500">*</span></Label>
                      <Select
                        value={formData.district}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, district: value }))
                        }
                        disabled={!formData.province}
                      >
                        <SelectTrigger id="district" className="w-full">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.province && ZAMBIAN_REGIONS[formData.province as keyof typeof ZAMBIAN_REGIONS]?.map(district => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="website"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="School physical address"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 6: ICT & Data Support Personnel */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="text-lg font-black text-slate-900 dark:text-white">Data / ICT Support Personnel</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Provide contact details for your school's designated Data or ICT Support Personnel. This information is mandatory before school features can be accessed, and will be displayed to teachers who need help with profile completeness.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ict_name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Names <span className="text-rose-500">*</span></Label>
                      <Input
                        id="ict_name"
                        name="ict_name"
                        value={formData.ict_name}
                        onChange={handleInputChange}
                        placeholder="e.g. Jane Mulenga"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ict_email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="ict_email"
                          name="ict_email"
                          type="email"
                          value={formData.ict_email}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="ict@school.edu"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ict_phone" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone Number (WhatsApp) <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="ict_phone"
                          name="ict_phone"
                          value={formData.ict_phone}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="+260..."
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>


              </form>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize interface theme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Theme Mode</Label>
                      <p className="text-sm text-slate-500">Switch between light and dark mode</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>System alerts and emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Alerts</Label>
                      <p className="text-sm text-slate-500">Receive daily summaries</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">System Notifications</Label>
                      <p className="text-sm text-slate-500">In-app alerts for critical events</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Access control settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Two-Factor Auth</Label>
                      <p className="text-sm text-slate-500">Secure your account</p>
                    </div>
                    <Switch />
                  </div>
                  <Button variant="outline" className="w-full">
                    <Shield className="mr-2 h-4 w-4" />
                    Manage Access Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="certification">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'logo_url', label: 'School Logo', required: true, description: 'Appears on headers and website' },
              { id: 'signature_url', label: 'Headteacher Signature', required: true, description: 'Official digitized signature' },
              { id: 'seal_url', label: 'Official School Seal', required: false, description: 'Used for report card authenticity' },
              { id: 'coat_of_arms_url', label: 'Coat of Arms Logo', required: false, description: 'Appears on top right of report card' }
            ].map((asset) => (
              <Card key={asset.id} className="asset-upload-card overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {asset.label} {asset.required && <span className="text-rose-500">*</span>}
                  </CardTitle>
                  <CardDescription className="text-xs">{asset.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-32 w-full bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center relative group">
                      {(formData as any)[asset.id] ? (
                        <img
                          src={(formData as any)[asset.id]}
                          alt={asset.label}
                          className="max-h-full max-w-full object-contain p-2"
                        />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center gap-2">
                          <Building2 className="h-8 w-8 opacity-20" />
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-[2px]">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs font-bold"
                          onClick={() => document.getElementById(`upload-${asset.id}`)?.click()}
                        >
                          Change Image
                        </Button>
                      </div>
                    </div>

                    <input
                      type="file"
                      id={`upload-${asset.id}`}
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setIsSaving(true);
                        try {
                          const schoolId = school?.id;
                          if (!schoolId) {
                            throw new Error("School details are not loaded yet. Please wait and try again.");
                          }

                          // Process file (convert to WebP and validate <= 5MB)
                          const processedFile = await processSchoolAsset(file);

                          const filePath = `${schoolId}/${asset.id}-${Date.now()}.webp`;

                          const { data, error } = await supabase.storage
                            .from('school-assets')
                            .upload(filePath, processedFile, {
                              cacheControl: '31536000, immutable',
                              upsert: true
                            });

                          if (error) throw error;

                          const { data: { publicUrl } } = supabase.storage
                            .from('school-assets')
                            .getPublicUrl(data.path);

                          setFormData(prev => ({ ...prev, [asset.id]: publicUrl }));
                          toast({ title: "Success", description: `${asset.label} uploaded temporarily. Save changes to finalise.` });
                        } catch (err: any) {
                          toast({ title: "Upload Error", description: err.message, variant: "destructive" });
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    />

                    {(formData as any)[asset.id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-7 text-[10px] font-bold uppercase"
                        onClick={() => setFormData(prev => ({ ...prev, [asset.id]: '' }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}


          </div>
        </TabsContent>

        <TabsContent value="admins">
          <AdminManagement />
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Ministry School Calendar (2026 - 2030)
              </CardTitle>
              <CardDescription>
                Official calendar issued by the Ministry of Education. Use this timeline to track term openings, closures, and holidays.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Terms Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Official Term Timelines</h3>
                {ministryCalendar.filter(item => item.type === 'Term').length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500 italic">No calendar terms seeded yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {ministryCalendar
                      .filter(item => item.type === 'Term')
                      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                      .map((term, idx) => {
                        const isCurrent = 
                          new Date(term.start_date).getTime() <= new Date().getTime() &&
                          new Date(term.end_date).getTime() >= new Date().getTime();

                        return (
                          <div 
                            key={term.id || idx} 
                            className={`p-5 rounded-xl border transition-all ${
                              isCurrent 
                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-sm' 
                                : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{term.name} ({term.year})</span>
                              {isCurrent && (
                                <Badge variant="default" className="bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">Active</Badge>
                              )}
                            </div>
                            <div className="space-y-2.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Opens</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {new Date(term.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Closes</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {new Date(term.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              {term.midterm_begin && (
                                <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5 mt-2.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Mid-Term Break</span>
                                  <div className="flex justify-between mt-1 text-[11px]">
                                    <span className="text-slate-400">Starts</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {new Date(term.midterm_begin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[11px] mt-0.5">
                                    <span className="text-slate-400">Ends</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {new Date(term.midterm_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Public Holidays */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/60 pt-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">National Public Holidays</h3>
                {ministryCalendar.filter(item => item.type === 'Holiday').length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500 italic">No public holidays seeded yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {ministryCalendar
                      .filter(item => item.type === 'Holiday')
                      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                      .map((holiday, idx) => (
                        <div key={holiday.id || idx} className="p-3.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40 rounded-xl text-center">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{holiday.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                            {new Date(holiday.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

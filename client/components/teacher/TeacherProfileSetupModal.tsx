import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/offline';
import {
  User,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Building2,
  Phone,
  MapPin,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherProfileSetupModalProps {
  isOpen: boolean;
  profile: any;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, label: 'Basic Info', icon: User },
  { id: 2, label: 'Personal Details', icon: UserCircle },
  { id: 3, label: 'Address & Status', icon: MapPin },
  { id: 4, label: 'Work Experience', icon: Briefcase },
  { id: 5, label: 'Qualifications', icon: GraduationCap },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

export default function TeacherProfileSetupModal({
  isOpen,
  profile,
  onComplete,
}: TeacherProfileSetupModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Personal Details
  const [personal, setPersonal] = useState(() => {
    const [firstName, ...lastNameParts] = (profile?.full_name || '').trim().split(/\s+/);
    const lastName = lastNameParts.join(' ');
    return {
      first_name: firstName || '',
      last_name: lastName || '',
      phone_number: profile?.phone_number || '',
      gender: profile?.gender || '',
      date_of_birth: profile?.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
      marital_status: profile?.marital_status || '',
      address: profile?.address || '',
      disability_status: profile?.disability_status || 'None',
    };
  });

  // Step 2: Work Experience
  const [work, setWork] = useState({
    employment_date: profile?.employment_date ? profile.employment_date.split('-')[0] : '',
    department: profile?.department || '',
    current_role: profile?.current_role || '',
    housing_status: profile?.housing_status || '',
  });

  // Step 3: Qualifications
  const [qualifications, setQualifications] = useState({
    highest_qualification: profile?.highest_qualification || '',
    institution_name: profile?.institution_name || '',
    field_of_study: profile?.field_of_study || '',
    completion_year: profile?.completion_year ? String(profile.completion_year) : '',
  });

  // Step validation
  const isStep1Valid = personal.first_name && personal.last_name && personal.phone_number;
  const isStep2Valid = personal.gender && personal.date_of_birth && personal.marital_status;
  const isStep3Valid = personal.address && personal.disability_status;
  const isStep4Valid = work.employment_date && work.department && work.current_role && work.housing_status;
  const isStep5Valid = qualifications.highest_qualification && qualifications.institution_name && qualifications.field_of_study && qualifications.completion_year;

  const handleNext = () => {
    if (step === 1 && !isStep1Valid) {
      toast({ title: 'Required fields missing', description: 'Please fill in all required basic info.', variant: 'destructive' });
      return;
    }
    if (step === 2 && !isStep2Valid) {
      toast({ title: 'Required fields missing', description: 'Please fill in all required personal details.', variant: 'destructive' });
      return;
    }
    if (step === 3 && !isStep3Valid) {
      toast({ title: 'Required fields missing', description: 'Please fill in all required address and status details.', variant: 'destructive' });
      return;
    }
    if (step === 4 && !isStep4Valid) {
      toast({ title: 'Required fields missing', description: 'Please fill in all required work experience details.', variant: 'destructive' });
      return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep5Valid) {
      toast({ title: 'Required fields missing', description: 'Please fill in all required qualification details.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const isProvided = work.housing_status === 'Government Housing' || work.housing_status === 'School Housing';

      const payload = {
        full_name: `${personal.first_name} ${personal.last_name}`.trim(),
        phone_number: personal.phone_number,
        gender: personal.gender,
        date_of_birth: personal.date_of_birth,
        marital_status: personal.marital_status,
        address: personal.address,
        disability_status: personal.disability_status,
        ...work,
        employment_date: work.employment_date ? `${work.employment_date}-01-01` : null,
        accommodation_provided: isProvided ? 'Yes' : 'No',
        ...qualifications,
        completion_year: qualifications.completion_year ? parseInt(qualifications.completion_year) : null,
      };

      const res = await fetch('/api/teacher/profile/setup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save profile');
      }

      // Invalidate offline query cache
      await db.cache.delete(`supabase:profile:${profile.id}`);

      toast({ title: 'Profile Complete!', description: 'Your profile has been saved. Refreshing the portal...' });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save profile.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-[560px] p-0 overflow-hidden bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 shadow-2xl [&>button.absolute]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Solid header */}
        <div className="bg-indigo-600 p-4 sm:p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-full">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-lg leading-tight">Complete Your Profile</h2>
              <p className="text-indigo-200 text-xs font-medium">Required for Government Reporting & Analytics</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200',
                    isActive ? 'bg-white text-indigo-700 shadow-lg' :
                    isDone ? 'bg-indigo-500/60 text-white' :
                    'bg-indigo-800/40 text-indigo-300'
                  )}>
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.id}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={cn('flex-1 h-[2px] mx-1 rounded-full', step > s.id ? 'bg-white/60' : 'bg-indigo-800/40')} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 max-h-[50vh] overflow-y-auto">
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" /> Basic Info
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Your name and contact information.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    First Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={personal.first_name}
                    onChange={e => setPersonal(p => ({ ...p, first_name: e.target.value }))}
                    placeholder="First Name"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Last Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={personal.last_name}
                    onChange={e => setPersonal(p => ({ ...p, last_name: e.target.value }))}
                    placeholder="Last Name"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={personal.phone_number}
                    onChange={e => setPersonal(p => ({ ...p, phone_number: e.target.value }))}
                    placeholder="+260..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Personal Details */}
          {step === 2 && (
            <div className="space-y-4">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-indigo-600" /> Personal Details
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Gender, date of birth, and marital status.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Gender <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={personal.gender} onValueChange={v => setPersonal(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Date of Birth <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={personal.date_of_birth}
                    onChange={e => setPersonal(p => ({ ...p, date_of_birth: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Marital Status <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={personal.marital_status} onValueChange={v => setPersonal(p => ({ ...p, marital_status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Address & Status */}
          {step === 3 && (
            <div className="space-y-4">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-600" /> Address & Status
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Residential address and disability status.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Residential Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={personal.address}
                    onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))}
                    placeholder="e.g. Lusaka, Zambia"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Disability Status <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={personal.disability_status} onValueChange={v => setPersonal(p => ({ ...p, disability_status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Visual">Visual Impairment</SelectItem>
                      <SelectItem value="Hearing">Hearing Impairment</SelectItem>
                      <SelectItem value="Physical">Physical Disability</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Work Experience */}
          {step === 4 && (
            <div className="space-y-4">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" /> Work Experience
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Employment history and current assignment details for HR records.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Year of First Deployment <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={work.employment_date} onValueChange={v => setWork(w => ({ ...w, employment_date: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {YEARS.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Department <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={work.department} onValueChange={v => setWork(w => ({ ...w, department: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sciences">Sciences</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Languages">Languages & Literature</SelectItem>
                      <SelectItem value="Humanities">Humanities & Social Sciences</SelectItem>
                      <SelectItem value="Arts">Arts & Creative</SelectItem>
                      <SelectItem value="Technical">Technical & Vocational</SelectItem>
                      <SelectItem value="Physical Education">Physical Education</SelectItem>
                      <SelectItem value="Special Education">Special Education</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Current Role / Title <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={work.current_role} onValueChange={v => setWork(w => ({ ...w, current_role: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Classroom Teacher">Classroom Teacher</SelectItem>
                      <SelectItem value="Head of Department">Head of Department</SelectItem>
                      <SelectItem value="Deputy Headteacher">Deputy Headteacher</SelectItem>
                      <SelectItem value="Headteacher">Headteacher</SelectItem>
                      <SelectItem value="Senior Teacher">Senior Teacher</SelectItem>
                      <SelectItem value="Special Needs Teacher">Special Needs Teacher</SelectItem>
                      <SelectItem value="Guidance Counselor">Guidance Counselor</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Housing Status <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={work.housing_status} onValueChange={v => setWork(w => ({ ...w, housing_status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Renting">Renting</SelectItem>
                      <SelectItem value="Personal House">Personal House</SelectItem>
                      <SelectItem value="Government Housing">Government Housing</SelectItem>
                      <SelectItem value="School Housing">School Housing</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Qualifications */}
          {step === 5 && (
            <form id="step5-form" onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" /> Qualifications
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Academic qualifications required for promotion criteria and workforce analytics.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Highest Qualification <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={qualifications.highest_qualification} onValueChange={v => setQualifications(q => ({ ...q, highest_qualification: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Qualification" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
                      <SelectItem value="Postgraduate Diploma">Postgraduate Diploma</SelectItem>
                      <SelectItem value="Master's Degree">Master's Degree</SelectItem>
                      <SelectItem value="Doctorate (PhD)">Doctorate (PhD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Institution Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={qualifications.institution_name}
                    onChange={e => setQualifications(q => ({ ...q, institution_name: e.target.value }))}
                    placeholder="e.g. University of Zambia"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Field of Study <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={qualifications.field_of_study}
                    onChange={e => setQualifications(q => ({ ...q, field_of_study: e.target.value }))}
                    placeholder="e.g. Mathematics Education"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Completion Year <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={qualifications.completion_year} onValueChange={v => setQualifications(q => ({ ...q, completion_year: v }))}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {YEARS.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5"
              disabled={isSaving}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div /> // Spacer
          )}

          {step < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 ml-auto"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <SubmitButton
              type="submit"
              form="step5-form"
              className="bg-indigo-600 hover:bg-indigo-700 text-white ml-auto"
              loading={isSaving}
              loadingText="Saving..."
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Save & Continue
            </SubmitButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

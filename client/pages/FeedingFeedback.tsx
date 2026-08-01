import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  GraduationCap,
  HeartHandshake,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  Star,
  UsersRound,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

type ReporterType = 'Parent' | 'Pupil' | 'Community';

interface SchoolOption {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  school_type: string | null;
}

const ISSUE_OPTIONS = [
  'No meal served',
  'Late meal',
  'Small portion',
  'Poor quality',
  'Food safety or hygiene',
  'Missing programme days',
  'Other'
] as const;

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function RatingField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className="text-xs font-semibold text-slate-400">{value ? `${value} / 5` : 'Choose'}</span>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} out of 5`}
            onClick={() => onChange(rating)}
            className="rounded-lg p-1.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Star
              className={cn(
                'h-7 w-7',
                value && rating <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-slate-100 text-slate-300'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedingFeedback() {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const earliestDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);
    return date;
  }, [today]);

  const [reporterType, setReporterType] = useState<ReporterType | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [serviceDate, setServiceDate] = useState(formatLocalDate(today));
  const [mealServed, setMealServed] = useState<boolean | null>(null);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [portionRating, setPortionRating] = useState<number | null>(null);
  const [qualityRating, setQualityRating] = useState<number | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSchool && schoolSearch === selectedSchool.name) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSchoolsLoading(true);
      try {
        const query = schoolSearch.trim().length >= 2
          ? `?search=${encodeURIComponent(schoolSearch.trim())}`
          : '';
        const response = await fetch(`/api/public/feeding-feedback/schools${query}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Unable to load schools.');
        setSchools(await response.json());
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setSchools([]);
          toast({ title: 'School list unavailable', description: error.message, variant: 'destructive' });
        }
      } finally {
        setSchoolsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [schoolSearch, selectedSchool, toast]);

  const selectMealServed = (served: boolean) => {
    setMealServed(served);
    if (!served) {
      setOverallRating(null);
      setPortionRating(null);
      setQualityRating(null);
      setIssues(current => current.includes('No meal served') ? current : [...current, 'No meal served']);
    } else {
      setIssues(current => current.filter(issue => issue !== 'No meal served'));
    }
  };

  const toggleIssue = (issue: string) => {
    setIssues(current => current.includes(issue)
      ? current.filter(item => item !== issue)
      : [...current, issue]);
  };

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();

    if (!reporterType || !selectedSchool || mealServed == null || (mealServed && overallRating == null)) {
      toast({
        title: 'A few answers are missing',
        description: 'Choose who you are, the school, whether a meal was served, and an overall rating when applicable.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/feeding-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          serviceDate,
          reporterType,
          mealServed,
          overallRating,
          portionRating,
          qualityRating,
          issueCategories: issues,
          comments,
          website
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Your report could not be submitted.');
      setReferenceCode(result.referenceCode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      toast({ title: 'Report not submitted', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (referenceCode) {
    return (
      <main className="min-h-screen bg-[#f3f7f2] px-4 py-10 text-slate-900 sm:py-16">
        <div className="mx-auto max-w-xl">
          <Card className="overflow-hidden rounded-[2rem] border-0 shadow-2xl shadow-emerald-950/10">
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-400" />
            <CardContent className="p-8 text-center sm:p-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Report received</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Thank you for speaking up.</h1>
              <p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">
                Your anonymous confirmation is now available to authorised Ministry of Education reviewers.
              </p>
              <div className="mt-8 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Keep this reference</p>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <code className="text-lg font-black tracking-wide text-slate-900">{referenceCode}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(referenceCode);
                      toast({ title: 'Reference copied' });
                    }}
                    aria-label="Copy report reference"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button className="mt-8 h-12 rounded-xl bg-emerald-700 px-8 hover:bg-emerald-800" onClick={() => window.location.reload()}>
                Submit another confirmation
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const reporterOptions = [
    { value: 'Parent' as const, label: 'Parent / guardian', icon: UsersRound },
    { value: 'Pupil' as const, label: 'Pupil', icon: GraduationCap },
    { value: 'Community' as const, label: 'Community member', icon: HeartHandshake }
  ];

  return (
    <main className="min-h-screen bg-[#f3f7f2] text-slate-900">
      <header className="border-b border-emerald-900/10 bg-[#153f2e] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Utensils className="h-6 w-6 text-lime-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">MUCHI · Public service</p>
              <p className="font-black">School Meals Check-in</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-emerald-100 sm:flex">
            <ShieldCheck className="h-4 w-4 text-lime-300" />
            Anonymous by design
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#153f2e] px-4 pb-28 pt-14 text-white sm:px-6 sm:pb-36 sm:pt-20">
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="absolute -bottom-44 -left-28 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            <MessageSquareWarning className="h-4 w-4 text-lime-300" />
            Independent community confirmation
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl">
            Did learners receive<br className="hidden sm:block" /> the meal promised today?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-emerald-100 sm:text-lg">
            Confirm delivery, rate the meal, or flag a concern. Your feedback helps government compare community experience with official programme records.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-20 max-w-4xl px-4 pb-20 sm:-mt-24 sm:px-6">
        <form onSubmit={submitReport}>
          <Card className="overflow-visible rounded-[2rem] border-0 bg-white shadow-2xl shadow-emerald-950/10">
            <CardContent className="space-y-10 p-6 sm:p-10">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['No login', 'We do not ask for an account'],
                  ['No identity fields', 'No name, phone or email'],
                  ['Ministry review', 'School staff cannot approve reports']
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-2xl bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
                      <Check className="h-4 w-4" /> {title}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-emerald-700/80">{detail}</p>
                  </div>
                ))}
              </div>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">1</span>
                  <div>
                    <h2 className="text-lg font-black">Tell us your perspective</h2>
                    <p className="text-sm text-slate-500">No personal details are required.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {reporterOptions.map(option => {
                    const Icon = option.icon;
                    const selected = reporterType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setReporterType(option.value)}
                        className={cn(
                          'flex min-h-24 items-center gap-3 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                          selected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                        )}
                      >
                        <span className={cn('rounded-xl p-2.5', selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-black">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">2</span>
                  <div>
                    <h2 className="text-lg font-black">Choose the school and date</h2>
                    <p className="text-sm text-slate-500">Reports are limited to meals expected in the past seven days.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
                  <div className="relative">
                    <label htmlFor="school-search" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">School</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="school-search"
                        value={schoolSearch}
                        onChange={event => {
                          setSchoolSearch(event.target.value);
                          setSelectedSchool(null);
                          setSchoolMenuOpen(true);
                        }}
                        onFocus={() => setSchoolMenuOpen(true)}
                        placeholder="Search for a school"
                        autoComplete="off"
                        className="h-12 rounded-xl border-slate-200 pl-11 pr-10"
                      />
                      {schoolsLoading ? (
                        <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-600" />
                      ) : (
                        <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      )}
                    </div>
                    {schoolMenuOpen && !selectedSchool && (
                      <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                        {schools.length ? schools.map(school => (
                          <button
                            key={school.id}
                            type="button"
                            onClick={() => {
                              setSelectedSchool(school);
                              setSchoolSearch(school.name);
                              setSchoolMenuOpen(false);
                            }}
                            className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          >
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>
                              <span className="block text-sm font-bold text-slate-800">{school.name}</span>
                              <span className="text-xs text-slate-500">{[school.district, school.province].filter(Boolean).join(', ') || 'Location not listed'}</span>
                            </span>
                          </button>
                        )) : (
                          <p className="p-5 text-center text-sm text-slate-500">No matching school found.</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="service-date" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Meal date</label>
                    <Input
                      id="service-date"
                      type="date"
                      min={formatLocalDate(earliestDate)}
                      max={formatLocalDate(today)}
                      value={serviceDate}
                      onChange={event => setServiceDate(event.target.value)}
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">3</span>
                  <div>
                    <h2 className="text-lg font-black">Was a meal served?</h2>
                    <p className="text-sm text-slate-500">Choose what you personally observed or confirmed.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => selectMealServed(true)}
                    className={cn(
                      'rounded-2xl border-2 p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                      mealServed === true ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                    )}
                  >
                    <span className="block text-lg font-black text-emerald-800">Yes, a meal was served</span>
                    <span className="mt-1 block text-sm text-slate-500">Continue to rate the meal.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectMealServed(false)}
                    className={cn(
                      'rounded-2xl border-2 p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                      mealServed === false ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'
                    )}
                  >
                    <span className="block text-lg font-black text-red-800">No meal was served</span>
                    <span className="mt-1 block text-sm text-slate-500">This is flagged for priority review.</span>
                  </button>
                </div>

                {mealServed === true && (
                  <div className="mt-5 grid gap-3 bg-slate-50 p-4 sm:grid-cols-3 sm:rounded-2xl">
                    <RatingField label="Overall meal" value={overallRating} onChange={setOverallRating} />
                    <RatingField label="Portion size" value={portionRating} onChange={setPortionRating} />
                    <RatingField label="Food quality" value={qualityRating} onChange={setQualityRating} />
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">4</span>
                  <div>
                    <h2 className="text-lg font-black">Flag any concerns</h2>
                    <p className="text-sm text-slate-500">Select all that apply, or leave blank if everything was satisfactory.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ISSUE_OPTIONS.map(issue => {
                    const checked = issues.includes(issue);
                    const disabled = issue === 'No meal served' && mealServed === true;
                    return (
                      <label
                        key={issue}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-bold transition',
                          checked ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 hover:border-slate-300',
                          disabled && 'cursor-not-allowed opacity-40'
                        )}
                      >
                        <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggleIssue(issue)} />
                        {issue}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-5">
                  <label htmlFor="comments" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Anonymous comment (optional)</label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={event => setComments(event.target.value)}
                    maxLength={1000}
                    rows={5}
                    placeholder="Describe what happened. Please do not include any person's name, phone number or email address."
                    className="rounded-xl border-slate-200 p-4"
                  />
                  <div className="mt-2 flex justify-between gap-4 text-xs text-slate-400">
                    <span>Contact details are rejected to protect anonymity.</span>
                    <span>{comments.length}/1000</span>
                  </div>
                </div>
              </section>

              <div className="sr-only" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
              </div>

              <div className="rounded-2xl bg-slate-900 p-5 text-slate-200 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-lime-300" />
                  <p className="text-sm leading-6">
                    A one-way technical fingerprint prevents duplicate abuse. Raw IP addresses and identity details are not stored with the report.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-5 h-12 w-full shrink-0 rounded-xl bg-lime-300 px-7 font-black text-emerald-950 hover:bg-lime-200 sm:mt-0 sm:w-auto"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit anonymously
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </main>
  );
}

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  Star,
  UtensilsCrossed
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type FeedbackStatus = 'New' | 'Under Review' | 'Resolved' | 'Dismissed';

interface FeedbackReport {
  id: string;
  reference_code: string;
  service_date: string;
  reporter_type: 'Parent' | 'Pupil' | 'Community';
  meal_served: boolean;
  overall_rating: number | null;
  portion_rating: number | null;
  quality_rating: number | null;
  issue_categories: string[];
  comments: string | null;
  status: FeedbackStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  school: { name: string; province: string | null; district: string | null } | Array<{ name: string; province: string | null; district: string | null }> | null;
}

interface FeedbackData {
  summary: {
    totalReports: number;
    mealConfirmations: number;
    missedMealSignals: number;
    averageRating: number;
    unresolvedReports: number;
    criticalReports: number;
    servedRate: number;
  };
  ratingDistribution: Array<{ rating: number; count: number }>;
  issueDistribution: Array<{ category: string; count: number }>;
  reports: FeedbackReport[];
}

const EMPTY_DATA: FeedbackData = {
  summary: {
    totalReports: 0,
    mealConfirmations: 0,
    missedMealSignals: 0,
    averageRating: 0,
    unresolvedReports: 0,
    criticalReports: 0,
    servedRate: 0
  },
  ratingDistribution: [1, 2, 3, 4, 5].map(rating => ({ rating, count: 0 })),
  issueDistribution: [],
  reports: []
};

const priorityStyles: Record<FeedbackReport['priority'], string> = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Critical: 'bg-red-50 text-red-700 border-red-200'
};

const statusStyles: Record<FeedbackStatus, string> = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dismissed: 'bg-slate-100 text-slate-600 border-slate-200'
};

const getSchool = (report: FeedbackReport) => Array.isArray(report.school) ? report.school[0] : report.school;

export default function FeedingFeedbackInsights({
  filters
}: {
  filters: { province: string; district: string };
}) {
  const { toast } = useToast();
  const [data, setData] = useState<FeedbackData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState<FeedbackStatus>('Under Review');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadFeedback = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (filters.province !== 'All') params.set('province', filters.province);
      if (filters.district !== 'All') params.set('district', filters.district);
      if (statusFilter !== 'All') params.set('status', statusFilter);

      const response = await fetch(`/api/government/feeding-program/feedback?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Unable to load independent feedback.');
      setData(result);
    } catch (error: any) {
      toast({ title: 'Independent feedback unavailable', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [filters.district, filters.province, statusFilter, toast]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const openReview = (report: FeedbackReport) => {
    setSelectedReport(report);
    setReviewStatus(report.status === 'New' ? 'Under Review' : report.status);
    setReviewNotes(report.review_notes || '');
  };

  const saveReview = async () => {
    if (!selectedReport) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/government/feeding-program/feedback/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: reviewStatus, reviewNotes })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Unable to save the review.');
      setSelectedReport(null);
      await loadFeedback(true);
      toast({ title: 'Review updated', description: `${selectedReport.reference_code} is now ${reviewStatus.toLowerCase()}.` });
    } catch (error: any) {
      toast({ title: 'Review not saved', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const maxIssueCount = Math.max(1, ...data.issueDistribution.map(issue => issue.count));
  const maxRatingCount = Math.max(1, ...data.ratingDistribution.map(rating => rating.count));

  return (
    <section className="space-y-6 rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/60 p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-700 p-3 text-white shadow-lg shadow-emerald-700/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Independent meal confirmations</h3>
              <Badge className="border-0 bg-lime-100 text-lime-800 hover:bg-lime-100">Anonymous channel</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Parent, pupil and community evidence shown separately from school-entered feeding records.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['All', 'New', 'Under Review', 'Resolved', 'Dismissed'].map(status => (
                <SelectItem key={status} value={status}>{status === 'All' ? 'All statuses' : status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-10 rounded-xl bg-white"
            onClick={() => window.open('/feeding-feedback', '_blank', 'noopener,noreferrer')}
          >
            Open public form <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Community reports',
            value: data.summary.totalReports,
            detail: `${data.summary.mealConfirmations} meals confirmed`,
            icon: MessageSquareText,
            style: 'bg-blue-50 text-blue-700'
          },
          {
            label: 'Average meal rating',
            value: data.summary.averageRating ? `${data.summary.averageRating}/5` : '—',
            detail: `${data.summary.servedRate}% reported served`,
            icon: Star,
            style: 'bg-amber-50 text-amber-700'
          },
          {
            label: 'Missed-meal signals',
            value: data.summary.missedMealSignals,
            detail: 'Independent non-delivery reports',
            icon: UtensilsCrossed,
            style: 'bg-red-50 text-red-700'
          },
          {
            label: 'Awaiting action',
            value: data.summary.unresolvedReports,
            detail: `${data.summary.criticalReports} critical food-safety flags`,
            icon: AlertTriangle,
            style: 'bg-violet-50 text-violet-700'
          }
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-slate-100 bg-white shadow-none">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn('rounded-xl p-3', metric.style)}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-100 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most reported concerns</CardTitle>
            <CardDescription>Signals to compare with delivery, stock and expenditure records</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-36 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
            ) : data.issueDistribution.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center text-center text-sm text-slate-400">
                <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-400" />
                No concerns in this view.
              </div>
            ) : (
              <div className="space-y-4">
                {data.issueDistribution.slice(0, 6).map(issue => (
                  <div key={issue.category}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{issue.category}</span>
                      <span className="font-black text-slate-500">{issue.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(issue.count / maxIssueCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall rating spread</CardTitle>
            <CardDescription>Ratings from confirmed meal deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end justify-around gap-3 pt-4">
              {data.ratingDistribution.map(item => (
                <div key={item.rating} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs font-black text-slate-500">{item.count}</span>
                  <div
                    className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-300 transition-all"
                    style={{ height: `${Math.max(5, (item.count / maxRatingCount) * 105)}px` }}
                  />
                  <span className="flex items-center gap-0.5 text-xs font-bold text-slate-600">{item.rating}<Star className="h-3 w-3 fill-amber-400 text-amber-400" /></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-100 shadow-none">
        <CardHeader className="border-b border-slate-100 bg-white pb-4">
          <CardTitle className="text-base">Recent anonymous reports</CardTitle>
          <CardDescription>Open a case to record ministry review notes and resolution status.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : data.reports.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No anonymous reports match the selected filters.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.reports.slice(0, 20).map(report => {
                const school = getSchool(report);
                return (
                  <div key={report.id} className="grid gap-4 p-5 transition hover:bg-slate-50/70 lg:grid-cols-[1.2fr_0.7fr_0.8fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900">{school?.name || 'Unknown school'}</span>
                        <Badge variant="outline" className={priorityStyles[report.priority]}>{report.priority}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{school?.district || 'District not listed'} · {report.reporter_type} · {report.reference_code}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Meal date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{new Date(`${report.service_date}T00:00:00`).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className={cn('text-sm font-black', report.meal_served ? 'text-emerald-700' : 'text-red-700')}>
                        {report.meal_served ? `Served · ${report.overall_rating || '—'}/5` : 'Not served'}
                      </p>
                      <Badge variant="outline" className={cn('mt-1', statusStyles[report.status])}>{report.status}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openReview(report)}>
                      <Eye className="mr-2 h-4 w-4" /> Review
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedReport)} onOpenChange={open => !open && setSelectedReport(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedReport && (() => {
            const school = getSchool(selectedReport);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">Review {selectedReport.reference_code}</DialogTitle>
                  <DialogDescription>
                    Anonymous {selectedReport.reporter_type.toLowerCase()} report for {school?.name || 'an unknown school'}.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Meal date</p>
                    <p className="mt-1 font-black">{new Date(`${selectedReport.service_date}T00:00:00`).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Delivery</p>
                    <p className={cn('mt-1 font-black', selectedReport.meal_served ? 'text-emerald-700' : 'text-red-700')}>
                      {selectedReport.meal_served ? 'Meal served' : 'Meal not served'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Rating</p>
                    <p className="mt-1 font-black">{selectedReport.overall_rating ? `${selectedReport.overall_rating} / 5` : 'Not applicable'}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Reported concerns</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.issue_categories.length
                      ? selectedReport.issue_categories.map(issue => <Badge key={issue} variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{issue}</Badge>)
                      : <span className="text-sm text-slate-500">No concern categories selected.</span>}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Anonymous comment</p>
                  <div className="min-h-20 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedReport.comments || 'No comment provided.'}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[0.75fr_1.25fr]">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Case status</label>
                    <Select value={reviewStatus} onValueChange={value => setReviewStatus(value as FeedbackStatus)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['New', 'Under Review', 'Resolved', 'Dismissed'].map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="review-notes" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Ministry review notes</label>
                    <Textarea
                      id="review-notes"
                      value={reviewNotes}
                      onChange={event => setReviewNotes(event.target.value)}
                      maxLength={2000}
                      placeholder="Record verification steps, evidence checked and action taken."
                      className="min-h-28 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedReport(null)}>Cancel</Button>
                  <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={isSaving} onClick={saveReview}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save review
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
}

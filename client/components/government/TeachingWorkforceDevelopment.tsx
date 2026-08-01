import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Filter,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Target,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { syncFetch } from "@/lib/syncService";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type WorkforceTab = "overview" | "reviews" | "training" | "promotions";

interface WorkforceProps {
  filters: { province: string; district: string };
  setFilters: React.Dispatch<
    React.SetStateAction<{ province: string; district: string }>
  >;
  regions: { province: string; districts: string[] }[];
}

const scoreFields = [
  ["lessonPlanning", "Lesson planning"],
  ["pedagogy", "Pedagogy"],
  ["subjectKnowledge", "Subject knowledge"],
  ["assessment", "Assessment"],
  ["classroomManagement", "Classroom management"],
  ["learnerSupport", "Learner support"],
  ["professionalism", "Professionalism"],
] as const;

const trainingCategories = [
  "Pedagogy",
  "Subject Matter",
  "Assessment",
  "Classroom Management",
  "Learner Support",
  "Professionalism",
  "Leadership",
  "ICT",
  "Special Needs",
  "Other",
];

const defaultImprovementDeadline = () => {
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 3);
  return deadline.toISOString().split("T")[0];
};

const initialReviewForm = () => ({
  reviewCycle: `${new Date().getFullYear()} Annual Review`,
  reviewDate: new Date().toISOString().split("T")[0],
  status: "Finalised",
  scores: {
    lessonPlanning: 3,
    pedagogy: 3,
    subjectKnowledge: 3,
    assessment: 3,
    classroomManagement: 3,
    learnerSupport: 3,
    professionalism: 3,
  },
  strengths: "",
  developmentNotes: "",
  improvementPlanRequired: false,
  improvementDeadline: defaultImprovementDeadline(),
  recommendation: "",
});

const initialTrainingForm = () => ({
  title: "",
  provider: "Ministry of Education",
  category: "Pedagogy",
  deliveryMode: "In-person",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
  hours: 8,
  capacity: 50,
  status: "Open",
  targetWeakness: "Pedagogy",
  description: "",
});

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const statusBadgeClass = (status: string) => {
  if (["Completed", "Approved", "Finalised"].includes(status))
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (["Open", "In Progress", "Enrolled"].includes(status))
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (["Declined", "Cancelled", "No Show", "Overdue"].includes(status))
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
};

export default function TeachingWorkforceDevelopment({
  filters,
  setFilters,
  regions,
}: WorkforceProps) {
  const [activeTab, setActiveTab] = useState<WorkforceTab>("overview");
  const [data, setData] = useState<any>({
    summary: {
      totalTeachers: 0,
      reviewedTeachers: 0,
      teachersNeedingSupport: 0,
      activeTrainings: 0,
      promotionReady: 0,
    },
    weaknessDistribution: [],
    teachers: [],
    trainingPrograms: [],
    recentReviews: [],
    promotionCases: [],
    settings: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [reviewTeacher, setReviewTeacher] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState(initialReviewForm());
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [trainingForm, setTrainingForm] = useState(initialTrainingForm());
  const [assignmentProgram, setAssignmentProgram] = useState<any>(null);
  const [manageProgram, setManageProgram] = useState<any>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [promotionTeacher, setPromotionTeacher] = useState<any>(null);
  const [promotionForm, setPromotionForm] = useState({
    targetRole: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    decisionNotes: "",
  });
  const { toast } = useToast();

  const loadData = async (forceSync = false) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session)
        throw new Error("Your session has expired. Please sign in again.");
      const params = new URLSearchParams();
      if (filters.province !== "All") params.set("province", filters.province);
      if (filters.district !== "All") params.set("district", filters.district);
      const result = await syncFetch(
        `/api/government/workforce-development?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cacheKey: `gov-workforce-development-${filters.province}-${filters.district}`,
          forceSync,
        },
      );
      if (result) setData(result);
      return result;
    } catch (error: any) {
      toast({
        title: "Unable to load workforce data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.province, filters.district]);

  const mutate = async (
    url: string,
    method: "POST" | "PATCH",
    body: unknown,
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      throw new Error("Your session has expired. Please sign in again.");
    return syncFetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
      forceSync: true,
    });
  };

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.teachers || [];
    return (data.teachers || []).filter((teacher: any) =>
      [
        teacher.fullName,
        teacher.staffNumber,
        teacher.schoolName,
        teacher.district,
        teacher.currentRole,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [data.teachers, search]);

  const priorityTeachers = useMemo(
    () =>
      [...(data.teachers || [])]
        .filter(
          (teacher: any) =>
            teacher.weaknessAreas?.length > 0 || teacher.activeImprovementPlan,
        )
        .sort(
          (a: any, b: any) =>
            (a.latestReview?.overall_score || 0) -
            (b.latestReview?.overall_score || 0),
        )
        .slice(0, 8),
    [data.teachers],
  );

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewTeacher) return;
    setSaving(true);
    try {
      const weaknessThreshold = Number(
        data.settings.gov_performance_weakness_score || 60,
      );
      const automaticallyRequiresPlan = Object.values(reviewForm.scores).some(
        (score) => Number(score) * 20 < weaknessThreshold,
      );
      const improvementPlanRequired =
        reviewForm.improvementPlanRequired || automaticallyRequiresPlan;
      const result = await mutate(
        "/api/government/workforce-development/reviews",
        "POST",
        {
          teacherId: reviewTeacher.id,
          ...reviewForm,
          improvementPlanRequired,
          improvementDeadline: improvementPlanRequired
            ? reviewForm.improvementDeadline
            : null,
        },
      );
      toast({
        title: result.offline ? "Review queued" : "Performance review recorded",
        description: result.offline
          ? "The review will sync when connectivity returns."
          : `${result.overallScore}% overall score · ${result.weaknessAreas.length} weakness area(s) identified.`,
      });
      setReviewTeacher(null);
      setReviewForm(initialReviewForm());
      await loadData(true);
    } catch (error: any) {
      toast({
        title: "Review not saved",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createTraining = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await mutate(
        "/api/government/workforce-development/training-programs",
        "POST",
        {
          ...trainingForm,
          capacity: trainingForm.capacity || null,
          targetWeaknesses: trainingForm.targetWeakness
            ? [trainingForm.targetWeakness]
            : [],
        },
      );
      toast({
        title: result.offline
          ? "Programme queued"
          : "Training programme created",
      });
      setTrainingDialogOpen(false);
      setTrainingForm(initialTrainingForm());
      await loadData(true);
    } catch (error: any) {
      toast({
        title: "Programme not created",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const assignTeachers = async () => {
    if (!assignmentProgram || selectedTeacherIds.length === 0) return;
    setSaving(true);
    try {
      const result = await mutate(
        `/api/government/workforce-development/training-programs/${assignmentProgram.id}/assignments`,
        "POST",
        { teacherIds: selectedTeacherIds },
      );
      toast({
        title: "Teachers assigned",
        description: `${result.assigned || selectedTeacherIds.length} teacher(s) added to the programme.`,
      });
      setAssignmentProgram(null);
      setSelectedTeacherIds([]);
      setAssignmentSearch("");
      await loadData(true);
    } catch (error: any) {
      toast({
        title: "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAssignmentStatus = async (
    assignmentId: string,
    status: string,
  ) => {
    try {
      await mutate(
        `/api/government/workforce-development/training-assignments/${assignmentId}`,
        "PATCH",
        { status },
      );
      toast({ title: "Training progress updated" });
      const refreshedData = await loadData(true);
      const refreshedProgramme = (refreshedData?.trainingPrograms || []).find(
        (program: any) => program.id === manageProgram?.id,
      );
      if (refreshedProgramme) setManageProgram(refreshedProgramme);
    } catch (error: any) {
      toast({
        title: "Progress not updated",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTrainingStatus = async (programId: string, status: string) => {
    try {
      await mutate(
        `/api/government/workforce-development/training-programs/${programId}`,
        "PATCH",
        { status },
      );
      toast({ title: "Programme status updated" });
      const refreshedData = await loadData(true);
      const refreshedProgramme = (refreshedData?.trainingPrograms || []).find(
        (program: any) => program.id === programId,
      );
      if (refreshedProgramme) setManageProgram(refreshedProgramme);
    } catch (error: any) {
      toast({
        title: "Programme not updated",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateImprovementStatus = async (
    reviewId: string,
    improvementStatus: string,
  ) => {
    try {
      await mutate(
        `/api/government/workforce-development/reviews/${reviewId}`,
        "PATCH",
        { improvementStatus },
      );
      toast({ title: "Improvement plan updated" });
      await loadData(true);
    } catch (error: any) {
      toast({
        title: "Plan not updated",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const approvePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!promotionTeacher) return;
    setSaving(true);
    try {
      await mutate("/api/government/workforce-development/promotions", "POST", {
        teacherId: promotionTeacher.id,
        targetRole: promotionForm.targetRole,
        effectiveDate: promotionForm.effectiveDate,
        decisionNotes: promotionForm.decisionNotes,
        decision: "Approved",
      });
      toast({
        title: "Promotion approved",
        description: `${promotionTeacher.fullName} is now recorded as ${promotionForm.targetRole}.`,
      });
      setPromotionTeacher(null);
      setPromotionForm({
        targetRole: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        decisionNotes: "",
      });
      await loadData(true);
    } catch (error: any) {
      toast({
        title: "Promotion not approved",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && data.summary.totalTeachers === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Loading workforce evidence...
        </p>
      </div>
    );
  }

  const selectedProvince = regions.find(
    (region) => region.province === filters.province,
  );
  const reviewCompletion =
    data.summary.totalTeachers > 0
      ? Math.round(
          (data.summary.reviewedTeachers / data.summary.totalTeachers) * 100,
        )
      : 0;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px] font-black uppercase tracking-wider">
              Human Capital
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Evidence-led workforce decisions
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Teaching Workforce Development
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Identify competency gaps, coordinate targeted training, and approve
            promotions against ministry criteria.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Filter className="h-4 w-4 text-slate-400 ml-1" />
            <Select
              value={filters.province}
              onValueChange={(province) =>
                setFilters({ province, district: "All" })
              }
            >
              <SelectTrigger className="w-[145px] h-9 border-none shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Provinces</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.province} value={region.province}>
                    {region.province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <Select
              value={filters.district}
              onValueChange={(district) =>
                setFilters((current) => ({ ...current, district }))
              }
              disabled={filters.province === "All"}
            >
              <SelectTrigger className="w-[140px] h-9 border-none shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Districts</SelectItem>
                {selectedProvince?.districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl"
            onClick={() => loadData(true)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          {
            label: "Teachers in scope",
            value: data.summary.totalTeachers,
            note: `${filters.district !== "All" ? filters.district : filters.province !== "All" ? filters.province : "National"} workforce`,
            icon: Users,
            tone: "blue",
          },
          {
            label: "Review coverage",
            value: `${reviewCompletion}%`,
            note: `${data.summary.reviewedTeachers} finalised reviews`,
            icon: ClipboardCheck,
            tone: "indigo",
          },
          {
            label: "Need support",
            value: data.summary.teachersNeedingSupport,
            note: "Weakness or active plan",
            icon: AlertTriangle,
            tone: "rose",
          },
          {
            label: "Active training",
            value: data.summary.activeTrainings,
            note: "Open or in progress",
            icon: BookOpenCheck,
            tone: "amber",
          },
          {
            label: "Promotion ready",
            value: data.summary.promotionReady,
            note: "All criteria satisfied",
            icon: Award,
            tone: "emerald",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-800"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {item.label}
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {item.value}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">
                      {item.note}
                    </p>
                  </div>
                  <div
                    className={cn("p-2.5 rounded-xl", {
                      "bg-blue-50 text-blue-600 dark:bg-blue-900/20":
                        item.tone === "blue",
                      "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20":
                        item.tone === "indigo",
                      "bg-rose-50 text-rose-600 dark:bg-rose-900/20":
                        item.tone === "rose",
                      "bg-amber-50 text-amber-600 dark:bg-amber-900/20":
                        item.tone === "amber",
                      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20":
                        item.tone === "emerald",
                    })}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit max-w-full overflow-x-auto">
        {[
          ["overview", "Workforce insights", BarChart3],
          ["reviews", "Performance reviews", ClipboardCheck],
          ["training", "Training tracker", BookOpenCheck],
          ["promotions", "Promotion board", Award],
        ].map(([id, label, Icon]: any) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
              activeTab === id
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1 border-none shadow-sm rounded-2xl bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-black uppercase tracking-tight">
                Workforce weakness map
              </CardTitle>
              <CardDescription>
                Latest review gaps below the ministry threshold of{" "}
                {data.settings.gov_performance_weakness_score || 60}%.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[330px]">
              {data.weaknessDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.weaknessDistribution}
                    layout="vertical"
                    margin={{ top: 0, right: 12, left: 22, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={112}
                      tick={{ fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#f43f5e"
                      radius={[0, 5, 5, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <Target className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-bold">No weakness evidence yet</p>
                  <p className="text-xs mt-1">
                    Record finalised performance reviews to build the national
                    map.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2 border-none shadow-sm rounded-2xl bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-700/50">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight">
                  Priority development register
                </CardTitle>
                <CardDescription>
                  Teachers needing targeted support based on their latest
                  review.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("reviews")}
              >
                Open register <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Teacher</th>
                    <th className="px-5 py-3">Latest score</th>
                    <th className="px-5 py-3">Identified weaknesses</th>
                    <th className="px-5 py-3">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {priorityTeachers.map((teacher: any) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/20"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {teacher.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {teacher.schoolName} · {teacher.district}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-lg font-black text-rose-600">
                          {teacher.latestReview?.overall_score || 0}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {teacher.weaknessAreas.map((weakness: string) => (
                            <Badge
                              key={weakness}
                              variant="outline"
                              className="text-[9px] border-rose-200 text-rose-600"
                            >
                              {weakness}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          className={cn(
                            "border-none text-[9px]",
                            statusBadgeClass(
                              teacher.latestReview?.improvement_status ||
                                "Not Required",
                            ),
                          )}
                        >
                          {teacher.latestReview?.improvement_status ||
                            "Not Required"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {priorityTeachers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-14 text-center text-slate-400"
                      >
                        No priority development cases in this region.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "reviews" && (
        <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-800 overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight">
                  Teacher performance register
                </CardTitle>
                <CardDescription>
                  Review the latest evidence, manage improvement plans, or
                  record a new review.
                </CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 h-9 rounded-xl"
                  placeholder="Search teacher, school or staff number..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Teacher</th>
                  <th className="px-5 py-4">Role / tenure</th>
                  <th className="px-5 py-4">Latest review</th>
                  <th className="px-5 py-4">Development needs</th>
                  <th className="px-5 py-4">Improvement plan</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {filteredTeachers.map((teacher: any) => (
                  <tr
                    key={teacher.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-900/20"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {teacher.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {teacher.staffNumber || "No staff number"} ·{" "}
                        {teacher.schoolName}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {teacher.currentRole}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {teacher.tenureYears} years service
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {teacher.latestReview ? (
                        <>
                          <p
                            className={cn(
                              "text-lg font-black",
                              Number(teacher.latestReview.overall_score) >=
                                Number(
                                  data.settings
                                    .gov_promotion_min_performance_score || 70,
                                )
                                ? "text-emerald-600"
                                : "text-rose-600",
                            )}
                          >
                            {teacher.latestReview.overall_score}%
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {teacher.latestReview.review_cycle}
                          </p>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">
                          Not reviewed
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {teacher.weaknessAreas?.map((weakness: string) => (
                          <Badge
                            key={weakness}
                            variant="outline"
                            className="text-[9px] border-rose-200 text-rose-600"
                          >
                            {weakness}
                          </Badge>
                        ))}
                        {teacher.weaknessAreas?.length === 0 && (
                          <span className="text-slate-400">
                            No flagged gaps
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {teacher.latestReview?.improvement_plan_required ? (
                        <Select
                          value={teacher.latestReview.improvement_status}
                          onValueChange={(value) =>
                            updateImprovementStatus(
                              teacher.latestReview.id,
                              value,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px] text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-slate-400">Not required</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg"
                        onClick={() => {
                          setReviewTeacher(teacher);
                          setReviewForm(initialReviewForm());
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-16 text-center text-slate-400"
                    >
                      No teachers match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === "training" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Ministry training programmes
              </h3>
              <p className="text-xs text-slate-500">
                Target development gaps, assign teachers, and track
                participation through completion.
              </p>
            </div>
            <Button
              onClick={() => setTrainingDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" /> Create programme
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(data.trainingPrograms || []).map((program: any) => (
              <Card
                key={program.id}
                className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-800 overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex gap-2 mb-2">
                        <Badge
                          className={cn(
                            "border-none text-[9px]",
                            statusBadgeClass(program.status),
                          )}
                        >
                          {program.status}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">
                          {program.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">
                        {program.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {program.provider} · {program.delivery_mode}
                      </CardDescription>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3">
                      <p className="text-lg font-black">{program.hours}</p>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">
                        Hours
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3">
                      <p className="text-lg font-black">
                        {program.assignedCount}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">
                        Assigned
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3">
                      <p className="text-lg font-black text-emerald-600">
                        {program.completionRate}%
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">
                        Complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />{" "}
                      {formatDate(program.start_date)} –{" "}
                      {formatDate(program.end_date)}
                    </span>
                    <span>
                      {program.capacity
                        ? `${program.capacity} places`
                        : "Open capacity"}
                    </span>
                  </div>
                  {program.target_weaknesses?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">
                        Targets:
                      </span>
                      {program.target_weaknesses.map((weakness: string) => (
                        <Badge
                          key={weakness}
                          variant="outline"
                          className="text-[9px] border-amber-200 text-amber-700"
                        >
                          {weakness}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={() => {
                        setManageProgram(program);
                      }}
                    >
                      Manage participants
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg bg-blue-600"
                      disabled={["Completed", "Cancelled"].includes(
                        program.status,
                      )}
                      onClick={() => {
                        setAssignmentProgram(program);
                        setSelectedTeacherIds([]);
                      }}
                    >
                      Assign teachers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {data.trainingPrograms.length === 0 && (
            <Card className="border-2 border-dashed shadow-none rounded-2xl bg-transparent">
              <CardContent className="py-20 text-center">
                <BookOpenCheck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h4 className="font-bold text-slate-700 dark:text-slate-200">
                  No ministry training programmes yet
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Create the first programme and map it to a workforce weakness.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="space-y-5">
          <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                Active promotion policy
              </p>
              <h3 className="text-xl font-black mt-1">
                Evidence must satisfy every criterion
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Approvals are blocked when any requirement is outstanding; the
                applied criteria are preserved with the decision.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="bg-white/10 rounded-lg px-3 py-2">
                {data.settings.gov_promotion_min_tenure || 3}+ years
              </span>
              <span className="bg-white/10 rounded-lg px-3 py-2">
                {data.settings.gov_promotion_min_qualification ||
                  "Bachelor's Degree"}
              </span>
              <span className="bg-white/10 rounded-lg px-3 py-2">
                {data.settings.gov_promotion_min_performance_score || 70}%
                performance
              </span>
              <span className="bg-white/10 rounded-lg px-3 py-2">
                {data.settings.gov_promotion_min_cpd_hours || 40} development
                hours
              </span>
              <span className="bg-white/10 rounded-lg px-3 py-2">
                No active improvement plan
              </span>
            </div>
          </div>
          <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-tight">
                    Promotion readiness board
                  </CardTitle>
                  <CardDescription>
                    Transparent pass/fail evidence for every teacher in scope.
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 h-9 rounded-xl"
                    placeholder="Search teacher or school..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Teacher</th>
                    <th className="px-5 py-4">Readiness</th>
                    <th className="px-5 py-4">Tenure</th>
                    <th className="px-5 py-4">Qualification</th>
                    <th className="px-5 py-4">Performance</th>
                    <th className="px-5 py-4">Development</th>
                    <th className="px-5 py-4">Improvement plan</th>
                    <th className="px-5 py-4 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {filteredTeachers.map((teacher: any) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/20"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {teacher.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {teacher.currentRole} · {teacher.schoolName}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          className={cn(
                            "border-none font-black",
                            teacher.promotionEligible
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {teacher.readinessScore}%
                        </Badge>
                      </td>
                      {[
                        "tenure",
                        "qualification",
                        "performance",
                        "development",
                        "improvementPlan",
                      ].map((key) => {
                        const criterion = teacher.criteria[key];
                        return (
                          <td key={key} className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {criterion.met ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-rose-500" />
                              )}
                              <span
                                className={
                                  criterion.met
                                    ? "text-slate-700 dark:text-slate-200"
                                    : "text-rose-600"
                                }
                              >
                                {criterion.actual ?? "Missing"}
                                {criterion.unit === "%"
                                  ? "%"
                                  : criterion.unit === "hours"
                                    ? "h"
                                    : criterion.unit === "years"
                                      ? "y"
                                      : ""}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700"
                          disabled={!teacher.promotionEligible}
                          onClick={() => {
                            setPromotionTeacher(teacher);
                            setPromotionForm((current) => ({
                              ...current,
                              targetRole: "",
                            }));
                          }}
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" /> Promote
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {data.promotionCases.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-800 overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-700/50">
                <CardTitle className="text-base font-black uppercase tracking-tight">
                  Recent promotion decisions
                </CardTitle>
                <CardDescription>
                  An audit trail of the criteria-based decisions recorded by the
                  ministry.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Teacher</th>
                      <th className="px-5 py-3">Career change</th>
                      <th className="px-5 py-3">Readiness</th>
                      <th className="px-5 py-3">Decision</th>
                      <th className="px-5 py-3">Effective date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {data.promotionCases
                      .slice(0, 10)
                      .map((promotionCase: any) => (
                        <tr key={promotionCase.id}>
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            {promotionCase.teacherName}
                          </td>
                          <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                            {promotionCase.previous_role || "Teacher"}{" "}
                            <span className="text-slate-300 mx-1">→</span>{" "}
                            {promotionCase.target_role}
                          </td>
                          <td className="px-5 py-4 font-black">
                            {promotionCase.readiness_score}%
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              className={cn(
                                "border-none text-[9px]",
                                statusBadgeClass(promotionCase.status),
                              )}
                            >
                              {promotionCase.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {formatDate(promotionCase.effective_date)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={Boolean(reviewTeacher)}
        onOpenChange={(open) => !open && setReviewTeacher(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record performance review</DialogTitle>
          </DialogHeader>
          {reviewTeacher && (
            <form onSubmit={submitReview} className="space-y-6">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4">
                <p className="font-bold text-slate-900 dark:text-white">
                  {reviewTeacher.fullName}
                </p>
                <p className="text-xs text-slate-500">
                  {reviewTeacher.currentRole} · {reviewTeacher.schoolName}
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Review cycle</Label>
                  <Input
                    value={reviewForm.reviewCycle}
                    onChange={(event) =>
                      setReviewForm({
                        ...reviewForm,
                        reviewCycle: event.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Review date</Label>
                  <Input
                    type="date"
                    value={reviewForm.reviewDate}
                    onChange={(event) =>
                      setReviewForm({
                        ...reviewForm,
                        reviewDate: event.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={reviewForm.status}
                    onValueChange={(status) =>
                      setReviewForm({ ...reviewForm, status })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Finalised">Finalised</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-black">
                      Competency scores
                    </Label>
                    <p className="text-[10px] text-slate-400">
                      1 = urgent development, 5 = exemplary practice
                    </p>
                  </div>
                  <Badge variant="outline">
                    Weakness below{" "}
                    {data.settings.gov_performance_weakness_score || 60}%
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {scoreFields.map(([key, label]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {label}
                      </span>
                      <Select
                        value={String(reviewForm.scores[key])}
                        onValueChange={(value) =>
                          setReviewForm({
                            ...reviewForm,
                            scores: {
                              ...reviewForm.scores,
                              [key]: Number(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <SelectItem key={score} value={String(score)}>
                              {score} / 5
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Strengths</Label>
                  <Textarea
                    value={reviewForm.strengths}
                    onChange={(event) =>
                      setReviewForm({
                        ...reviewForm,
                        strengths: event.target.value,
                      })
                    }
                    placeholder="Observed strengths and positive impact..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Development notes</Label>
                  <Textarea
                    value={reviewForm.developmentNotes}
                    onChange={(event) =>
                      setReviewForm({
                        ...reviewForm,
                        developmentNotes: event.target.value,
                      })
                    }
                    placeholder="Specific coaching and support required..."
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-blue-600"
                    checked={reviewForm.improvementPlanRequired}
                    onChange={(event) =>
                      setReviewForm({
                        ...reviewForm,
                        improvementPlanRequired: event.target.checked,
                      })
                    }
                  />
                  <span>
                    <span className="block text-sm font-bold">
                      Open a formal improvement plan
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      A plan is also opened automatically when one or more
                      competency scores fall below the weakness threshold.
                    </span>
                  </span>
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Improvement deadline</Label>
                    <Input
                      type="date"
                      value={reviewForm.improvementDeadline}
                      onChange={(event) =>
                        setReviewForm({
                          ...reviewForm,
                          improvementDeadline: event.target.value,
                        })
                      }
                      required={
                        reviewForm.improvementPlanRequired ||
                        Object.values(reviewForm.scores).some(
                          (score) =>
                            Number(score) * 20 <
                            Number(
                              data.settings.gov_performance_weakness_score ||
                                60,
                            ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Review recommendation</Label>
                    <Input
                      value={reviewForm.recommendation}
                      onChange={(event) =>
                        setReviewForm({
                          ...reviewForm,
                          recommendation: event.target.value,
                        })
                      }
                      placeholder="e.g. Assign assessment literacy training"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewTeacher(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{" "}
                  Save review
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create ministry training programme</DialogTitle>
          </DialogHeader>
          <form onSubmit={createTraining} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Programme title</Label>
                <Input
                  value={trainingForm.title}
                  onChange={(event) =>
                    setTrainingForm({
                      ...trainingForm,
                      title: event.target.value,
                    })
                  }
                  required
                  placeholder="e.g. Formative Assessment Masterclass"
                />
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input
                  value={trainingForm.provider}
                  onChange={(event) =>
                    setTrainingForm({
                      ...trainingForm,
                      provider: event.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={trainingForm.category}
                  onValueChange={(category) =>
                    setTrainingForm({ ...trainingForm, category })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trainingCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery mode</Label>
                <Select
                  value={trainingForm.deliveryMode}
                  onValueChange={(deliveryMode) =>
                    setTrainingForm({ ...trainingForm, deliveryMode })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In-person">In-person</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Blended">Blended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={trainingForm.startDate}
                  onChange={(event) =>
                    setTrainingForm({
                      ...trainingForm,
                      startDate: event.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={trainingForm.endDate}
                  onChange={(event) =>
                    setTrainingForm({
                      ...trainingForm,
                      endDate: event.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Development hours</Label>
                <Input
                  type="number"
                  min={1}
                  value={trainingForm.hours}
                  onChange={(event) =>
                    setTrainingForm({
                      ...trainingForm,
                      hours: Number(event.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  value={trainingForm.capacity}
                  onChange={(event) =>
                    setTrainingForm({
                      ...trainingForm,
                      capacity: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Programme status</Label>
                <Select
                  value={trainingForm.status}
                  onValueChange={(status) =>
                    setTrainingForm({ ...trainingForm, status })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary weakness targeted</Label>
                <Select
                  value={trainingForm.targetWeakness}
                  onValueChange={(targetWeakness) =>
                    setTrainingForm({ ...trainingForm, targetWeakness })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Lesson Planning",
                      "Pedagogy",
                      "Subject Knowledge",
                      "Assessment",
                      "Classroom Management",
                      "Learner Support",
                      "Professionalism",
                    ].map((weakness) => (
                      <SelectItem key={weakness} value={weakness}>
                        {weakness}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={trainingForm.description}
                onChange={(event) =>
                  setTrainingForm({
                    ...trainingForm,
                    description: event.target.value,
                  })
                }
                placeholder="Learning outcomes, target cohort and expected evidence..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTrainingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{" "}
                Create programme
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(assignmentProgram)}
        onOpenChange={(open) => !open && setAssignmentProgram(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign teachers · {assignmentProgram?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search teachers or schools..."
                value={assignmentSearch}
                onChange={(event) => setAssignmentSearch(event.target.value)}
              />
            </div>
            <div className="max-h-[430px] overflow-y-auto divide-y border rounded-xl">
              {(data.teachers || [])
                .filter(
                  (teacher: any) =>
                    !assignmentProgram?.assignments?.some(
                      (assignment: any) => assignment.teacher_id === teacher.id,
                    ),
                )
                .filter((teacher: any) =>
                  `${teacher.fullName} ${teacher.schoolName}`
                    .toLowerCase()
                    .includes(assignmentSearch.toLowerCase()),
                )
                .map((teacher: any) => (
                  <label
                    key={teacher.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={selectedTeacherIds.includes(teacher.id)}
                      onChange={(event) =>
                        setSelectedTeacherIds((current) =>
                          event.target.checked
                            ? [...current, teacher.id]
                            : current.filter((id) => id !== teacher.id),
                        )
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{teacher.fullName}</p>
                      <p className="text-[10px] text-slate-400">
                        {teacher.schoolName} ·{" "}
                        {teacher.weaknessAreas?.join(", ") ||
                          "No flagged weakness"}
                      </p>
                    </div>
                    {teacher.weaknessAreas?.some((weakness: string) =>
                      assignmentProgram?.target_weaknesses?.includes(weakness),
                    ) && (
                      <Badge className="bg-amber-100 text-amber-700 border-none text-[9px]">
                        Priority match
                      </Badge>
                    )}
                  </label>
                ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {selectedTeacherIds.length} teacher(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAssignmentProgram(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={assignTeachers}
                  disabled={saving || selectedTeacherIds.length === 0}
                  className="bg-blue-600"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{" "}
                  Assign selected
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(manageProgram)}
        onOpenChange={(open) => !open && setManageProgram(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Training participation · {manageProgram?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3">
            <div>
              <p className="text-xs font-bold">Programme lifecycle</p>
              <p className="text-[10px] text-slate-400">
                Advance the programme as delivery progresses.
              </p>
            </div>
            <Select
              value={manageProgram?.status}
              onValueChange={(status) =>
                updateTrainingStatus(manageProgram.id, status)
              }
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[460px] overflow-y-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {manageProgram?.assignments?.map((assignment: any) => (
                  <tr key={assignment.id}>
                    <td className="px-4 py-3 font-bold">
                      {assignment.teacherName}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={assignment.status}
                        onValueChange={(status) =>
                          updateAssignmentStatus(assignment.id, status)
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Assigned">Assigned</SelectItem>
                          <SelectItem value="Enrolled">Enrolled</SelectItem>
                          <SelectItem value="In Progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                          <SelectItem value="No Show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(assignment.completion_date)}
                    </td>
                  </tr>
                ))}
                {manageProgram?.assignments?.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-12 text-center text-slate-400"
                    >
                      No teachers assigned to this programme.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageProgram(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(promotionTeacher)}
        onOpenChange={(open) => !open && setPromotionTeacher(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Approve teacher promotion</DialogTitle>
          </DialogHeader>
          {promotionTeacher && (
            <form onSubmit={approvePromotion} className="space-y-5">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">{promotionTeacher.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {promotionTeacher.currentRole} ·{" "}
                    {promotionTeacher.readinessScore}% readiness
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New role / position</Label>
                  <Input
                    value={promotionForm.targetRole}
                    onChange={(event) =>
                      setPromotionForm({
                        ...promotionForm,
                        targetRole: event.target.value,
                      })
                    }
                    placeholder="e.g. Senior Teacher"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective date</Label>
                  <Input
                    type="date"
                    value={promotionForm.effectiveDate}
                    onChange={(event) =>
                      setPromotionForm({
                        ...promotionForm,
                        effectiveDate: event.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Decision notes</Label>
                <Textarea
                  value={promotionForm.decisionNotes}
                  onChange={(event) =>
                    setPromotionForm({
                      ...promotionForm,
                      decisionNotes: event.target.value,
                    })
                  }
                  placeholder="Promotion board minute, appointment conditions or supporting rationale..."
                />
              </div>
              <div className="rounded-xl border p-3 text-[10px] text-slate-500">
                <strong className="text-slate-700 dark:text-slate-200">
                  Audit note:
                </strong>{" "}
                Approval updates the teacher's current role and adds a dated
                promotion event to career history. The criteria snapshot remains
                attached to the decision.
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPromotionTeacher(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{" "}
                  Approve promotion
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

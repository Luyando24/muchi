import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Building2, 
  Plus, 
  Edit, 
  Copy, 
  Check, 
  Loader2, 
  Calendar, 
  RefreshCw,
  TrendingDown,
  Trash2,
  ListFilter,
  FileText,
  Sparkles,
  AlertTriangle,
  Percent,
  Sliders,
  HelpCircle,
  Activity
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
  min_students: number;
  max_students: number | null;
  duration_value?: number;
  duration_unit?: 'months' | 'days';
}

interface LicenseData {
  id: string;
  schoolName: string;
  schoolSlug: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  price: number;
  totalCost: number;
  currency: string;
  licenseKey: string;
}

interface FinanceStats {
  summary: {
    totalRevenue: number;
    mrr: number;
    activeSubscriptions: number;
    arpu: number;
    totalSchools: number;
  };
  licenses: LicenseData[];
  planDistribution: { name: string; value: number }[];
  revenueTrends: { month: string; revenue: number }[];
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  created_at: string;
}

interface Prospect {
  id: string;
  school_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'New' | 'Contacted' | 'Demo Scheduled' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SchoolStudentCount {
  school_id: string;
  student_count: number;
  teacher_count: number;
}

interface RegisteredSchool {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

const renderMarkdown = (text: string) => {
  return text.split('\n').map((line, idx) => {
    let trimmed = line.trim();
    if (trimmed.startsWith('###')) {
      return <h4 key={idx} className="text-base font-black text-slate-900 dark:text-white mt-4 mb-2 flex items-center gap-1.5">{trimmed.replace('###', '').trim()}</h4>;
    }
    if (trimmed.startsWith('##')) {
      return <h3 key={idx} className="text-lg font-black text-slate-900 dark:text-white mt-5 mb-3">{trimmed.replace('##', '').trim()}</h3>;
    }
    if (trimmed.startsWith('#')) {
      return <h2 key={idx} className="text-xl font-black text-slate-900 dark:text-white mt-6 mb-4">{trimmed.replace('#', '').trim()}</h2>;
    }
    if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
      const rawText = trimmed.substring(1).trim();
      const parts = rawText.split('**');
      return (
        <li key={idx} className="ml-4 list-disc text-sm text-slate-700 dark:text-slate-355 my-1.5 leading-relaxed">
          {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-slate-900 dark:text-white">{part}</strong> : part)}
        </li>
      );
    }
    if (trimmed.startsWith('---')) {
      return <hr key={idx} className="my-4 border-slate-200 dark:border-slate-800" />;
    }
    if (trimmed.startsWith('•')) {
      const rawText = trimmed.substring(1).trim();
      const parts = rawText.split('**');
      return (
        <li key={idx} className="ml-4 list-disc text-sm text-slate-700 dark:text-slate-355 my-1.5 leading-relaxed">
          {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-slate-900 dark:text-white">{part}</strong> : part)}
        </li>
      );
    }
    if (trimmed.length === 0) return <div key={idx} className="h-2" />;
    
    const parts = line.split('**');
    return (
      <p key={idx} className="text-sm text-slate-750 dark:text-slate-300 my-1.5 leading-relaxed">
        {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-slate-900 dark:text-white">{part}</strong> : part)}
      </p>
    );
  });
};

export default function BusinessFinances({ sharedData }: { sharedData?: any }) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const { toast } = useToast();

  // Dialog states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'ZMW',
    billing_cycle: 'monthly',
    is_active: true,
    min_students: 0,
    max_students: '' as string | number,
    duration_value: 1,
    duration_unit: 'months'
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // Transaction form states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'Server Hosting',
    amount: 0,
    currency: 'ZMW',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [savingTx, setSavingTx] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'all' | '30days' | 'thisMonth' | 'lastMonth' | 'thisYear'>('all');

  // Export Modal states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'all' | '30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Analytics & Prospects states
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [schoolStudentCounts, setSchoolStudentCounts] = useState<SchoolStudentCount[]>([]);
  const [registeredSchools, setRegisteredSchools] = useState<RegisteredSchool[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Pricing & Marketing simulation states
  const [simPriceChange, setSimPriceChange] = useState<number>(0); // percent
  const [simConversionChange, setSimConversionChange] = useState<number>(0); // percent
  const [simMarketingChange, setSimMarketingChange] = useState<number>(0); // percent

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const response = await fetch('/api/admin/finances/stats', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch finance statistics');

      const result = await response.json();
      setStats(result);
    } catch (err: any) {
      console.error('Error fetching finance stats:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to load finance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/configurations/plans', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (err: any) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/finances/transactions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoadingAnalytics(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch prospects
      const prospectsResponse = await fetch('/api/admin/prospects', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (prospectsResponse.ok) {
        const prospectsData = await prospectsResponse.json();
        setProspects(prospectsData);
      }

      // 2. Fetch school profile counts
      if (sharedData?.schoolsWithStats) {
        const counts = sharedData.schoolsWithStats.map((s: any) => ({
          school_id: s.id,
          student_count: s.student_count || 0,
          teacher_count: s.teacher_count || 0
        }));
        setSchoolStudentCounts(counts);
      } else {
        const { data: countsData, error: countsError } = await supabase
          .from('school_profile_counts')
          .select('*');
        if (countsError) {
          console.error('Error fetching profile counts:', countsError);
        } else if (countsData) {
          setSchoolStudentCounts(countsData);
        }
      }

      // 3. Fetch registered schools
      if (sharedData?.schoolsWithStats) {
        const schools = sharedData.schoolsWithStats.map((s: any) => ({
          id: s.id,
          name: s.name,
          plan: s.plan || 'Free',
          created_at: s.created_at
        }));
        setRegisteredSchools(schools);
      } else {
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id, name, plan, created_at');
        if (schoolsError) {
          console.error('Error fetching schools:', schoolsError);
        } else if (schoolsData) {
          setRegisteredSchools(schoolsData);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchAiInsights = async (payload: any) => {
    try {
      setLoadingAi(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch('/api/admin/finances/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch AI insights');
      }

      const result = await response.json();
      setAiInsights(result.insights);
      toast({
        title: "AI Analysis Complete",
        description: "Pricing and marketing recommendations loaded successfully."
      });
    } catch (err: any) {
      console.error('AI Insights Error:', err);
      toast({
        title: "AI Analysis Failed",
        description: err.message || "Failed to generate AI insights",
        variant: "destructive"
      });
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
    fetchPlans();
    fetchTransactions();
    fetchAnalyticsData();
  }, [sharedData]);

  const refreshAll = () => {
    fetchFinanceData();
    fetchPlans();
    fetchTransactions();
    fetchAnalyticsData();
    toast({ title: "Refreshing", description: "Updating ledger registry, analytics data, and subscription details." });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast({
      title: "Key Copied",
      description: "License key copied to clipboard."
    });
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleOpenPlanModal = (plan?: Plan) => {
    if (plan) {
      setSelectedPlan(plan);
      setPlanForm({
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        currency: plan.currency || 'ZMW',
        billing_cycle: plan.billing_cycle || 'monthly',
        is_active: plan.is_active,
        min_students: plan.min_students || 0,
        max_students: plan.max_students !== null ? plan.max_students : '',
        duration_value: plan.duration_value || 1,
        duration_unit: plan.duration_unit || 'months'
      });
    } else {
      setSelectedPlan(null);
      setPlanForm({
        name: '',
        description: '',
        price: 0,
        currency: 'ZMW',
        billing_cycle: 'monthly',
        is_active: true,
        min_students: 0,
        max_students: '',
        duration_value: 1,
        duration_unit: 'months'
      });
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const bodyData = {
        ...planForm,
        max_students: planForm.max_students === '' ? null : Number(planForm.max_students)
      };

      const url = selectedPlan 
        ? `/api/admin/configurations/plans/${selectedPlan.id}` 
        : `/api/admin/configurations/plans`;
      
      const method = selectedPlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save plan');
      }

      toast({
        title: "Success",
        description: `Subscription plan ${selectedPlan ? 'updated' : 'created'} successfully.`
      });
      setIsPlanModalOpen(false);
      fetchPlans();
      fetchFinanceData();
    } catch (err: any) {
      console.error('Error saving plan:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to save subscription plan",
        variant: "destructive"
      });
    } finally {
      setSavingPlan(false);
    }
  };

  // Transaction Actions
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTx(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch('/api/admin/finances/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(txForm)
      });

      if (!response.ok) throw new Error('Failed to record transaction');

      toast({
        title: "Success",
        description: "Transaction recorded successfully."
      });
      setIsTxModalOpen(false);
      setTxForm({
        type: 'expense',
        category: 'Server Hosting',
        amount: 0,
        currency: 'ZMW',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to record transaction",
        variant: "destructive"
      });
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/finances/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        toast({ title: "Deleted", description: "Transaction removed successfully." });
        fetchTransactions();
        fetchFinanceData();
      } else {
        throw new Error('Failed to delete transaction');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription plan? Existing schools on this plan will remain mapped to it, but it will no longer be available for new selections.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/configurations/plans/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        toast({ title: "Deleted", description: "Subscription plan removed successfully" });
        fetchPlans();
        fetchFinanceData();
      } else {
        throw new Error('Failed to delete subscription plan');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteLicense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school subscription license? This will permanently remove the license and any auto-recorded transaction from the LIFETIME REVENUE calculations.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/licenses/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        toast({ title: "Deleted", description: "Subscription license and associated revenue transaction removed successfully." });
        fetchFinanceData();
        fetchTransactions();
      } else {
        throw new Error('Failed to delete subscription license');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ZMW') => {
    return new Intl.NumberFormat('en-ZM', { style: 'currency', currency }).format(amount);
  };

  const handleExportPDF = () => {
    if (!stats) {
      toast({
        title: "Export Failed",
        description: "Financial statistics are still loading. Please try again in a moment.",
        variant: "destructive"
      });
      return;
    }

    try {
      // 1. Calculate Date Boundaries
      let startDateBoundary: Date | null = null;
      let endDateBoundary: Date | null = null;

      const now = new Date();
      const startOfDay = (d: Date | string | number): Date => {
        const res = new Date(d);
        res.setHours(0, 0, 0, 0);
        return res;
      };
      const endOfDay = (d: Date | string | number): Date => {
        const res = new Date(d);
        res.setHours(23, 59, 59, 999);
        return res;
      };

      let filterLabel = "All Time";

      if (exportPeriod === '30days') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        startDateBoundary = startOfDay(d);
        endDateBoundary = endOfDay(now);
        filterLabel = "Last 30 Days";
      } else if (exportPeriod === 'thisMonth') {
        startDateBoundary = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        endDateBoundary = endOfDay(now);
        filterLabel = "This Month";
      } else if (exportPeriod === 'lastMonth') {
        startDateBoundary = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        endDateBoundary = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
        filterLabel = "Last Month";
      } else if (exportPeriod === 'thisYear') {
        startDateBoundary = startOfDay(new Date(now.getFullYear(), 0, 1));
        endDateBoundary = endOfDay(now);
        filterLabel = "This Year";
      } else if (exportPeriod === 'custom') {
        if (!exportStartDate || !exportEndDate) {
          toast({
            title: "Export Failed",
            description: "Please select both start and end dates for custom date range.",
            variant: "destructive"
          });
          return;
        }
        startDateBoundary = startOfDay(new Date(exportStartDate));
        endDateBoundary = endOfDay(new Date(exportEndDate));
        filterLabel = `${new Date(exportStartDate).toLocaleDateString()} - ${new Date(exportEndDate).toLocaleDateString()}`;
      }

      // Helper to match dates within boundaries
      const isWithinBoundaries = (dateStr: string): boolean => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (startDateBoundary && d < startDateBoundary) return false;
        if (endDateBoundary && d > endDateBoundary) return false;
        return true;
      };

      // 2. Filter data
      const filteredLicenses = stats.licenses.filter(l => isWithinBoundaries(l.startDate));
      const filteredLedger = transactions.filter(t => isWithinBoundaries(t.date));

      // 3. Recalculate metrics for the selected period
      const periodSubscriptionRevenue = filteredLicenses.reduce((sum, l) => sum + Number(l.totalCost), 0);
      const periodOpIncome = filteredLedger.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const periodOpExpense = filteredLedger.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const periodNetBalance = periodOpIncome - periodOpExpense;

      // Count active licenses in the period
      const periodActiveLicensesCount = filteredLicenses.filter(l => l.status === 'active').length;

      // PDF Generation
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 14;

      // Branded Header Block
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, pageWidth, 42, 'F');

      // Muchi logo
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text("MUCHI", margin, 18);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(59, 130, 246); // Accent blue
      doc.text("PLATFORM FINANCIAL REPORT", margin, 26);

      // Meta info
      doc.setFontSize(8.5);
      doc.setTextColor(241, 245, 249);
      const dateStr = `Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`;
      doc.text(dateStr, margin, 34);

      // Filter Badge text
      doc.setFont('helvetica', 'bold');
      doc.text(`PERIOD: ${filterLabel.toUpperCase()}`, pageWidth - margin - 80, 18, { align: 'left' });

      // Clean divider
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.8);
      doc.line(0, 42, pageWidth, 42);

      let currentY = 52;

      // Section Title: Metrics Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("1. Financial Summary (Selected Period)", margin, currentY);
      currentY += 6;

      // Draw Summary Cards 2x2 grid
      const cardW = (pageWidth - (margin * 2) - 6) / 2;
      const cardH = 22;

      const drawMetricCard = (x: number, y: number, label: string, value: string, accentColor: [number, number, number]) => {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

        doc.setFillColor(...accentColor);
        doc.rect(x, y, 1.5, cardH, 'F');

        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(label.toUpperCase(), x + 4, y + 6);

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(value, x + 4, y + 15);
      };

      // Row 1 Cards
      drawMetricCard(
        margin, 
        currentY, 
        "Subscription Revenue", 
        formatCurrency(periodSubscriptionRevenue), 
        [59, 130, 246]
      );
      
      drawMetricCard(
        margin + cardW + 6, 
        currentY, 
        "Active / Matching Licenses", 
        `${periodActiveLicensesCount} Active / ${filteredLicenses.length} Total`, 
        [16, 185, 129]
      );

      currentY += cardH + 4;

      // Row 2 Cards
      drawMetricCard(
        margin, 
        currentY, 
        "Operational Ledger (Net Balance)", 
        formatCurrency(periodNetBalance), 
        periodNetBalance >= 0 ? [59, 130, 246] : [239, 68, 68]
      );
      
      drawMetricCard(
        margin + cardW + 6, 
        currentY, 
        "Operational Incomes vs Expenses", 
        `In: ${formatCurrency(periodOpIncome)} | Out: ${formatCurrency(periodOpExpense)}`, 
        [245, 158, 11]
      );

      currentY += cardH + 12;

      const drawSectionHeader = (title: string, yPos: number): number => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(title, margin, yPos);
        return yPos + 4;
      };

      // Table 1: Subscription Tiers (Configs are period-independent)
      currentY = drawSectionHeader("2. Platform Subscription Tiers", currentY);
      autoTable(doc, {
        head: [["Plan Name", "Billing Cycle", "Price", "Capacity Limits", "Status"]],
        body: plans.map(p => [
          p.name,
          p.billing_cycle,
          formatCurrency(p.price, p.currency),
          p.max_students ? `${p.min_students} - ${p.max_students} students` : `${p.min_students}+ students (Unlimited)`,
          p.is_active ? "Active" : "Disabled"
        ]),
        startY: currentY,
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 2: { fontStyle: 'bold' } }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;

      // Table 2: School Subscription Registry
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }
      currentY = drawSectionHeader("3. School Subscription Registry (Period Filtered)", currentY);

      if (filteredLicenses.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("No licenses generated during this period.", margin, currentY + 4);
        currentY += 12;
      } else {
        autoTable(doc, {
          head: [["School Name", "Plan Tier", "End Date", "Contract Value", "Status"]],
          body: filteredLicenses.map(l => [
            l.schoolName,
            l.plan,
            new Date(l.endDate).toLocaleDateString(),
            formatCurrency(l.totalCost, l.currency),
            l.status.toUpperCase()
          ]),
          startY: currentY,
          theme: 'striped',
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 3: { fontStyle: 'bold' } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              if (data.cell.text[0] === 'ACTIVE') {
                data.cell.styles.textColor = [16, 185, 129];
              } else {
                data.cell.styles.textColor = [239, 68, 68];
              }
            }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      // Table 3: Operational Ledger
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }
      currentY = drawSectionHeader("4. Operational Ledger (Period Filtered)", currentY);

      if (filteredLedger.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("No operational transactions recorded during this period.", margin, currentY + 4);
      } else {
        autoTable(doc, {
          head: [["Type", "Category", "Date", "Amount", "Description"]],
          body: filteredLedger.map(t => [
            t.type.toUpperCase(),
            t.category,
            new Date(t.date).toLocaleDateString(),
            `${t.type === 'expense' ? '-' : '+'}${formatCurrency(t.amount, t.currency)}`,
            t.description || '-'
          ]),
          startY: currentY,
          theme: 'striped',
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 3: { fontStyle: 'bold' } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
              if (data.cell.text[0].startsWith('+')) {
                data.cell.styles.textColor = [16, 185, 129];
              } else {
                data.cell.styles.textColor = [239, 68, 68];
              }
            }
          }
        });
      }

      // Page numbers and footers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.setFont('helvetica', 'normal');
        doc.text("MUCHI Platform Finance Report - Confidential", margin, pageHeight - 7);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 15, pageHeight - 7);
      }

      const safePeriodName = exportPeriod === 'custom' ? 'Custom' : exportPeriod;
      doc.save(`MUCHI_Financial_Report_${safePeriodName}.pdf`);

      toast({
        title: "Success",
        description: `Financial report PDF for period (${filterLabel}) downloaded successfully.`
      });
      setIsExportModalOpen(false);
    } catch (err: any) {
      console.error("PDF Export Error:", err);
      toast({
        title: "Error",
        description: "Failed to generate financial PDF report: " + err.message,
        variant: "destructive"
      });
    }
  };

  // Compute Ledger details
  const getFilteredTransactions = () => {
    if (periodFilter === 'all') return transactions;
    const now = new Date();
    const startOfDay = (d: Date) => {
      const res = new Date(d);
      res.setHours(0, 0, 0, 0);
      return res;
    };

    return transactions.filter(t => {
      if (!t.date) return false;
      const txDate = new Date(t.date);
      if (periodFilter === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return txDate >= startOfDay(thirtyDaysAgo);
      }
      if (periodFilter === 'thisMonth') {
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return txDate >= startOfDay(firstDayThisMonth);
      }
      if (periodFilter === 'lastMonth') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return txDate >= startOfDay(firstDayLastMonth) && txDate <= lastDayLastMonth;
      }
      if (periodFilter === 'thisYear') {
        const firstDayThisYear = new Date(now.getFullYear(), 0, 1);
        return txDate >= startOfDay(firstDayThisYear);
      }
      return true;
    });
  };

  const filteredTxs = getFilteredTransactions();

  const totalOpIncome = filteredTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalOpExpense = filteredTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netBalance = totalOpIncome - totalOpExpense;

  // Analytics & BI computations
  const totalProspects = prospects.length;
  
  const funnelCounts = {
    'New': prospects.filter(p => p.status === 'New').length,
    'Contacted': prospects.filter(p => p.status === 'Contacted').length,
    'Demo Scheduled': prospects.filter(p => p.status === 'Demo Scheduled').length,
    'Negotiation': prospects.filter(p => p.status === 'Negotiation').length,
    'Closed Won': prospects.filter(p => p.status === 'Closed Won').length,
    'Closed Lost': prospects.filter(p => p.status === 'Closed Lost').length,
  };
  
  const contactedCount = prospects.filter(p => p.status !== 'New').length;
  const demoCount = prospects.filter(p => !['New', 'Contacted'].includes(p.status)).length;
  const negotiationCount = prospects.filter(p => ['Negotiation', 'Closed Won', 'Closed Lost'].includes(p.status)).length;
  const convertedLeads = funnelCounts['Closed Won'];
  
  const leadToContactRate = totalProspects > 0 ? Math.round((contactedCount / totalProspects) * 100) : 0;
  const contactToDemoRate = contactedCount > 0 ? Math.round((demoCount / contactedCount) * 100) : 0;
  const demoToNegotiationRate = demoCount > 0 ? Math.round((negotiationCount / demoCount) * 100) : 0;
  const winRate = totalProspects > 0 ? Math.round((convertedLeads / totalProspects) * 100) : 0;

  const marketingSpend = transactions
    .filter(t => t.type === 'expense' && t.category.toLowerCase() === 'marketing')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const customersAcquired = convertedLeads || stats?.summary.activeSubscriptions || 0;
  const cac = customersAcquired > 0 ? Math.round(marketingSpend / customersAcquired) : 0;

  const totalLicenses = stats?.licenses.length || 0;
  const expiredLicenses = stats?.licenses.filter(l => l.status === 'expired' || l.status === 'suspended').length || 0;
  const churnRate = totalLicenses > 0 ? (expiredLicenses / totalLicenses) : 0;

  const totalContractValue = stats?.licenses.reduce((sum, l) => sum + Number(l.totalCost), 0) || 0;
  const acv = totalLicenses > 0 ? totalContractValue / totalLicenses : 0;

  const arpu = stats?.summary.arpu || 500;
  const ltv = churnRate > 0 ? Math.round(arpu / churnRate) : Math.round(arpu * 36);
  const ltvToCacRatio = cac > 0 ? Number((ltv / cac).toFixed(1)) : 0;

  // Platform Fixed Expenses Context
  const fixedExpenses = 2420;
  const nowForBurn = new Date();
  const travelSpendThisMonth = transactions
    .filter(t => {
      const isTravel = t.type === 'expense' && t.category.toLowerCase().includes('travel');
      if (!isTravel) return false;
      const txDate = new Date(t.date);
      return txDate.getMonth() === nowForBurn.getMonth() && txDate.getFullYear() === nowForBurn.getFullYear();
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const netMonthlyPosition = (stats?.summary.mrr || 0) - fixedExpenses - travelSpendThisMonth;

  const capacityWarnings = registeredSchools
    .map(school => {
      const planObj = plans.find(p => p.name.toLowerCase() === school.plan.toLowerCase());
      const countObj = schoolStudentCounts.find(c => c.school_id === school.id);
      const studentCount = countObj?.student_count || 0;
      
      if (planObj && planObj.max_students) {
        const limit = planObj.max_students;
        const utilization = (studentCount / limit) * 100;
        return {
          schoolId: school.id,
          schoolName: school.name,
          planName: school.plan,
          studentCount,
          limit,
          utilization: Math.round(utilization)
        };
      }
      return null;
    })
    .filter((warning): warning is NonNullable<typeof warning> => warning !== null && warning.utilization >= 80);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium animate-pulse">Loading platform financial dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Business Finances</h2>
          <p className="text-slate-600 dark:text-slate-400">Track subscriptions revenue, trends, active licenses and manage plans.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-center">
          <Button onClick={() => setIsExportModalOpen(true)} className="h-10 font-bold bg-blue-600 hover:bg-blue-700 text-white">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={refreshAll} variant="outline" className="h-10 font-bold">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </Button>
        </div>
      </div>

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="flex overflow-x-auto w-full max-w-full h-auto gap-1 bg-slate-100 p-1 dark:bg-slate-850 rounded-lg border scrollbar-none mb-4">
          <TabsTrigger value="subscriptions" className="font-bold text-sm py-2.5 px-4 shrink-0">
            <span className="hidden sm:inline">Subscription Revenue</span>
            <span className="sm:hidden">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="font-bold text-sm py-2.5 px-4 shrink-0">
            <span className="hidden sm:inline">Operational Ledger (Incomes & Expenses)</span>
            <span className="sm:hidden">Operational Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="font-bold text-sm py-2.5 px-4 shrink-0">
            <span className="hidden sm:inline">Conversion & BI Analytics</span>
            <span className="sm:hidden">BI Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          {/* Metrics Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Platform Lifetime Revenue</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {formatCurrency(stats?.summary.totalRevenue || 0)}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900 dark:text-white">{stats?.summary.totalSchools}</span>
                  <span>schools registered overall</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Recurring Revenue (MRR)</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {formatCurrency(stats?.summary.mrr || 0)}
                    </h3>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-600">Active</span>
                  <span>subscriptions current month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Net Profit / Burn Rate</p>
                    <h3 className={`text-2xl font-black mt-1 ${netMonthlyPosition >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(netMonthlyPosition)}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl ${netMonthlyPosition >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                    {netMonthlyPosition >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-0.5 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-900 dark:text-white">Fixed Overhead: ZMW 2,420.00</span>
                  <span>Travel variable: ZMW {travelSpendThisMonth.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Subscriptions</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {stats?.summary.activeSubscriptions}
                    </h3>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
                    <CreditCard className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {Math.round(((stats?.summary.activeSubscriptions || 0) / (stats?.summary.totalSchools || 1)) * 100)}%
                  </span>
                  <span>conversion rate from trials</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Average Revenue / School (ARPU)</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {formatCurrency(stats?.summary.arpu || 0)}
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                  <span>Weighted across all active tiers</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visualizations Charts & Overheads */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Subscription Sales Volume</CardTitle>
                <CardDescription>Generated license revenue over the past 6 months (ZMW)</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {stats?.revenueTrends && stats.revenueTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.revenueTrends}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        formatter={(value) => [`K${value}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic text-sm">
                    No financial trends available yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Plan Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Plan Distribution</CardTitle>
                  <CardDescription>Breakdown of active subscriber tiers</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] flex flex-col justify-center">
                  {stats?.planDistribution && stats.planDistribution.length > 0 ? (
                    <div className="h-full flex flex-col justify-center">
                      <ResponsiveContainer width="100%" height="75%">
                        <PieChart>
                          <Pie
                            data={stats.planDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {stats.planDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} active`, 'Tiers']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] mt-1 font-medium">
                        {stats.planDistribution.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                            <span className="text-slate-600 dark:text-slate-300">{entry.name}: {entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 italic text-sm text-center">
                      No active subscriptions to display distribution.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fixed Monthly Overheads Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Fixed Monthly Overheads</CardTitle>
                  <CardDescription className="text-xs">Operational expenses (1 USD = 26 ZMW)</CardDescription>
                </CardHeader>
                <CardContent className="p-0 px-4 pb-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="[&_tr]:border-b-0">
                        <TableRow className="hover:bg-transparent border-b-0">
                          <TableHead className="h-7 text-[10px] font-bold uppercase py-0">Item</TableHead>
                          <TableHead className="h-7 text-right text-[10px] font-bold uppercase py-0">USD</TableHead>
                          <TableHead className="h-7 text-right text-[10px] font-bold uppercase py-0">ZMW</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-transparent h-7 border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="py-1 text-xs font-medium">Vercel Hosting</TableCell>
                          <TableCell className="py-1 text-right text-xs font-mono">$20.00</TableCell>
                          <TableCell className="py-1 text-right text-xs font-semibold font-mono">K520.00</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent h-7 border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="py-1 text-xs font-medium">Supabase Database</TableCell>
                          <TableCell className="py-1 text-right text-xs font-mono">$25.00</TableCell>
                          <TableCell className="py-1 text-right text-xs font-semibold font-mono">K650.00</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent h-7 border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="py-1 text-xs font-medium">AI Subscription</TableCell>
                          <TableCell className="py-1 text-right text-xs font-mono">$25.00</TableCell>
                          <TableCell className="py-1 text-right text-xs font-semibold font-mono">K650.00</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent h-7 border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="py-1 text-xs font-medium">Internet Service</TableCell>
                          <TableCell className="py-1 text-right text-xs font-mono">-</TableCell>
                          <TableCell className="py-1 text-right text-xs font-semibold font-mono">K500.00</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent h-7 border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="py-1 text-xs font-medium">Bank Account Fee</TableCell>
                          <TableCell className="py-1 text-right text-xs font-mono">-</TableCell>
                          <TableCell className="py-1 text-right text-xs font-semibold font-mono">K100.00</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent h-7 border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="py-1 text-xs font-medium text-slate-400">Salaries</TableCell>
                          <TableCell className="py-1 text-right text-xs font-mono text-slate-400">-</TableCell>
                          <TableCell className="py-1 text-right text-xs font-semibold font-mono text-slate-400">K0.00</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent h-7 font-black border-t-2 border-slate-200 dark:border-slate-700">
                          <TableCell className="py-2 text-xs text-slate-900 dark:text-white">Total Overhead</TableCell>
                          <TableCell className="py-2 text-right text-xs font-mono font-bold">$70.00</TableCell>
                          <TableCell className="py-2 text-right text-xs font-mono font-bold text-blue-600 dark:text-blue-400">K2,420.00</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Subscription Pricing Manager & Tier Controller */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Platform Subscription Tiers</CardTitle>
                <CardDescription>Configure package descriptions, student capacities, and billing prices.</CardDescription>
              </div>
              <Button onClick={() => handleOpenPlanModal()} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Plan
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPlans ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-6 italic text-slate-500 text-sm">
                  No subscription plans defined. Add your first plan tier above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Capacity Limits</TableHead>
                        <TableHead>Cycle</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-bold text-slate-900 dark:text-white">{plan.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-500" title={plan.description}>{plan.description}</TableCell>
                          <TableCell className="text-xs font-medium">
                            {plan.max_students 
                              ? `${plan.min_students} - ${plan.max_students} students` 
                              : `${plan.min_students}+ students (Unlimited)`
                            }
                          </TableCell>
                          <TableCell className="capitalize text-xs font-semibold">{plan.billing_cycle}</TableCell>
                          <TableCell className="font-black text-slate-900 dark:text-white">
                            {formatCurrency(plan.price, plan.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={plan.is_active ? 'bg-green-50 text-green-700 border-green-200 font-bold' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                              {plan.is_active ? 'Active' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button onClick={() => handleOpenPlanModal(plan)} variant="ghost" size="sm" className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                onClick={() => handleDeletePlan(plan.id)} 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* School Subscription Log Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">School Subscription Registry</CardTitle>
              <CardDescription>Track all generated software licenses, expirations, and financial contracts.</CardDescription>
            </CardHeader>
            <CardContent>
              {!stats?.licenses || stats.licenses.length === 0 ? (
                <div className="text-center py-10 italic text-slate-500 text-sm">
                  No school licenses found in the system registry.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School</TableHead>
                        <TableHead>Plan Tier</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Contract Value</TableHead>
                        <TableHead>License Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.licenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{license.schoolName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">slug: {license.schoolSlug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">
                              {license.plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {new Date(license.startDate).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {new Date(license.endDate).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="font-black text-slate-900 dark:text-white text-sm">
                            {formatCurrency(license.totalCost, license.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span>{license.licenseKey.substring(0, 8)}...</span>
                              <button 
                                onClick={() => copyToClipboard(license.licenseKey, license.id)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors"
                                title="Copy full key"
                              >
                                {copiedKeyId === license.id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              license.status === 'active' 
                                ? 'bg-green-100 text-green-800 border-green-200 font-bold uppercase text-[10px]' 
                                : 'bg-red-100 text-red-800 border-red-200 font-bold uppercase text-[10px]'
                            }>
                              {license.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              onClick={() => handleDeleteLicense(license.id)} 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete License"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-6">
          {/* Filter Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter Period</span>
            </div>
            <select
              className="flex h-9 w-full sm:w-44 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
            >
              <option value="all">All Time</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>

          {/* Ledger Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Operational Income</p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">
                      {formatCurrency(totalOpIncome)}
                    </h3>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">From custom setup & consultations</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Platform Expenses</p>
                    <h3 className="text-2xl font-black text-rose-600 mt-1">
                      {formatCurrency(totalOpExpense)}
                    </h3>
                  </div>
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">Servers, ad costs, and software assets</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Net Operating Balance</p>
                    <h3 className={`text-2xl font-black mt-1 ${netBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                      {formatCurrency(netBalance)}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">Operational income minus expenditures</p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Ledger Table Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Operational Transactions Ledger</CardTitle>
                <CardDescription>A comprehensive record of custom incomes and platform expenses.</CardDescription>
              </div>
              <Button onClick={() => setIsTxModalOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1.5" />
                Record Transaction
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500 italic text-sm">
                  No operational transactions recorded yet. Click "Record Transaction" above.
                </div>
              ) : filteredTxs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 italic text-sm">
                  No transactions found for the selected period filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTxs.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <Badge className={
                              tx.type === 'income' 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold uppercase text-[10px]' 
                                : 'bg-rose-100 text-rose-800 border-rose-200 font-bold uppercase text-[10px]'
                            }>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-white">{tx.category}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(tx.date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate text-slate-500" title={tx.description}>
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell className={`font-black text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              onClick={() => handleDeleteTransaction(tx.id)} 
                              variant="ghost" 
                              size="sm" 
                              className="hover:bg-rose-50 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Automated Onboarding Reminders Info banner */}
          {sharedData?.lastOnboardingReminder && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-950/10 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-350 shadow-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <div className="flex-1">
                <p className="font-bold text-blue-900 dark:text-blue-400">Automated Setup Auditing Active</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  Last bi-weekly onboarding activity email dispatched to admins: <strong className="font-semibold">{new Date(sharedData.lastOnboardingReminder.sent_at).toLocaleDateString()} at {new Date(sharedData.lastOnboardingReminder.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> (Recipient: {sharedData.lastOnboardingReminder.recipient}, Status: {sharedData.lastOnboardingReminder.status}).
                </p>
              </div>
            </div>
          )}

          {/* Analytics Summary Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Funnel Leads</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {prospects.length}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-905 dark:text-white">{funnelCounts['Closed Won']}</span>
                  <span>won /</span>
                  <span className="font-semibold text-slate-905 dark:text-white">{funnelCounts['Closed Lost']}</span>
                  <span>lost leads</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pipeline Win Rate</p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">
                      {winRate}%
                    </h3>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Percent className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  <span>Lead-to-paying conversion efficiency</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer Churn Rate</p>
                    <h3 className="text-2xl font-black text-rose-600 mt-1">
                      {Math.round(churnRate * 100)}%
                    </h3>
                  </div>
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-550">
                  <span>Based on expired vs total licenses</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Avg Contract Value (ACV)</p>
                    <h3 className="text-2xl font-black text-purple-600 mt-1">
                      {formatCurrency(acv)}
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-550">
                  <span>Average value per license generated</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Pipeline Funnel chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Sales Funnel Conversion Path
                </CardTitle>
                <CardDescription>Visualizing stage drop-off and conversion rates across the leads lifecycle.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {prospects.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 italic text-sm">
                    No prospects in CRM pipeline to visualize funnel.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Funnel Stage 1: New Leads */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>1. New Leads (Total Prospects)</span>
                        <span>{totalProspects} Schools (100%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-md overflow-hidden relative">
                        <div className="bg-blue-600 h-full rounded-md transition-all duration-500" style={{ width: '100%' }}></div>
                      </div>
                    </div>

                    {/* Funnel Stage 2: Contacted */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>2. Contacted & Engaged</span>
                        <span>{contactedCount} Schools ({leadToContactRate}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-md overflow-hidden relative">
                        <div className="bg-blue-500 h-full rounded-md transition-all duration-500" style={{ width: `${leadToContactRate}%` }}></div>
                        {leadToContactRate > 0 && (
                          <span className="absolute right-2.5 top-1 text-[10px] text-slate-500 font-bold">
                            Dropoff: {100 - leadToContactRate}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Funnel Stage 3: Demo Scheduled */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>3. Demos Completed</span>
                        <span>{demoCount} Schools ({totalProspects > 0 ? Math.round((demoCount / totalProspects) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-md overflow-hidden relative">
                        <div className="bg-indigo-500 h-full rounded-md transition-all duration-500" style={{ width: `${totalProspects > 0 ? (demoCount / totalProspects) * 100 : 0}%` }}></div>
                        {contactedCount > 0 && (
                          <span className="absolute right-2.5 top-1 text-[10px] text-slate-500 font-bold">
                            Contact-to-Demo Conversion: {contactToDemoRate}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Funnel Stage 4: Negotiation */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>4. Negotiation & Pricing Review</span>
                        <span>{negotiationCount} Schools ({totalProspects > 0 ? Math.round((negotiationCount / totalProspects) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-md overflow-hidden relative">
                        <div className="bg-purple-500 h-full rounded-md transition-all duration-500" style={{ width: `${totalProspects > 0 ? (negotiationCount / totalProspects) * 100 : 0}%` }}></div>
                        {demoCount > 0 && (
                          <span className="absolute right-2.5 top-1 text-[10px] text-slate-500 font-bold">
                            Demo-to-Negotiation: {demoToNegotiationRate}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Funnel Stage 5: Won (Registered) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>5. Converted (Closed Won)</span>
                        <span className="text-emerald-600 font-black">{convertedLeads} Schools ({winRate}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-md overflow-hidden relative">
                        <div className="bg-emerald-500 h-full rounded-md transition-all duration-500" style={{ width: `${winRate}%` }}></div>
                        <span className="absolute right-2.5 top-1 text-[10px] text-slate-550 font-bold">
                          Overall Win Rate: {winRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Lifetime Value (LTV) vs Customer Acquisition Cost (CAC) Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  LTV : CAC Economics
                </CardTitle>
                <CardDescription>Measure business sustainability and marketing spend ROI.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-550 dark:text-slate-400 font-medium">Marketing Spend:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(marketingSpend)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-550 dark:text-slate-400 font-medium">Customer Acquisition Cost:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(cac)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-550 dark:text-slate-400 font-medium">Estimated LTV:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(ltv)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-slate-550 dark:text-slate-400 font-bold">LTV to CAC Ratio:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-900 dark:text-white">{ltvToCacRatio}x</span>
                      {(() => {
                        if (cac === 0) return <Badge className="bg-slate-500 text-white font-bold border-none">Organic</Badge>;
                        if (ltvToCacRatio >= 3.0) return <Badge className="bg-emerald-500 text-white font-bold border-none">Healthy</Badge>;
                        if (ltvToCacRatio >= 1.0) return <Badge className="bg-amber-500 text-white font-bold border-none">Warning</Badge>;
                        return <Badge className="bg-rose-500 text-white font-bold border-none">Critical</Badge>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Health Meter Visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Critical (&lt;1x)</span>
                    <span>Target (3x)</span>
                    <span>Scale (&gt;5x)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        cac === 0 ? 'bg-slate-400' :
                        ltvToCacRatio >= 3.0 ? 'bg-emerald-500' :
                        ltvToCacRatio >= 1.0 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, cac === 0 ? 100 : (ltvToCacRatio / 6) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Strategic Commentary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border rounded-lg text-xs leading-relaxed text-slate-655 dark:text-slate-400">
                  {cac === 0 ? (
                    <p>• **Organic Growth:** Your marketing spend is ZMW 0.00, meaning CAC is technically zero. While highly efficient, this limits your growth ceiling. Consider deploying a budget on local search/social ads to test if paid customer acquisition can scale lead volume.</p>
                  ) : ltvToCacRatio >= 3.0 ? (
                    <p>• **Scalable Efficiency:** Your LTV is over 3x higher than your CAC. This indicates a highly profitable acquisition engine. You can aggressively increase marketing budgets on high-converting channels to acquire more schools.</p>
                  ) : ltvToCacRatio >= 1.0 ? (
                    <p>• **Low Efficiency:** Your customer acquisition cost is close to the lifetime revenue they generate. Focus on increasing subscription prices, reducing churn, or targeting high-value private schools to increase your ARPU.</p>
                  ) : (
                    <p>• **Critical Loss:** You are spending more to acquire a customer than they generate in their lifetime. Immediately optimize marketing spend, eliminate low-performing ad channels, and increase plans' subscription fees.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Groq AI Strategic Advisory Panel */}
          <Card className="border-blue-200 dark:border-blue-900/30 shadow-md bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-950 dark:to-blue-950/5">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                  Groq AI Pricing & Marketing Strategy Advisor
                </CardTitle>
                <CardDescription>
                  Uses Llama 3 via Groq to analyze your platform metrics, pipeline conversion funnel, and financial ledger to generate custom, actionable growth strategies.
                </CardDescription>
              </div>
              <Button 
                onClick={() => {
                  const schoolsList = registeredSchools.map(s => {
                    const countObj = schoolStudentCounts.find(c => c.school_id === s.id);
                    const sharedSchool = sharedData?.schoolsWithStats?.find((sh: any) => sh.id === s.id);
                    return {
                      name: s.name,
                      plan: s.plan,
                      students: countObj?.student_count || 0,
                      onboarding_status: sharedSchool?.onboarding_status || 'Pending',
                      profile_completion: sharedSchool?.profile_completion || 0,
                      classes_count: sharedSchool?.classes_count || 0,
                      subjects_count: sharedSchool?.subjects_count || 0,
                      active7d: sharedSchool?.sign_ins_7d || 0,
                      active30d: sharedSchool?.sign_ins_30d || 0
                    };
                  });
                  fetchAiInsights({
                    summary: stats?.summary,
                    funnel: funnelCounts,
                    marketingSpend,
                    cac,
                    ltv,
                    ltvToCacRatio,
                    plans: stats?.planDistribution,
                    schools: schoolsList,
                    fixedExpenses: 2420,
                    travelExpenses: travelSpendThisMonth
                  });
                }} 
                disabled={loadingAi || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 self-start sm:self-center"
              >
                {loadingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 text-white" />
                    Generate AI Insights
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {aiInsights ? (
                <div className="p-5 bg-white dark:bg-slate-900/50 rounded-xl border border-blue-100 dark:border-blue-950 text-slate-850 dark:text-slate-300 max-h-[450px] overflow-y-auto scrollbar-thin">
                  {renderMarkdown(aiInsights)}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                  <Sparkles className="h-10 w-10 text-blue-300 dark:text-blue-700 mx-auto mb-3 animate-pulse" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350">No Strategy Logged</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    Click the "Generate AI Insights" button above to dynamically consult Groq AI based on your live financial and pipeline status.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning Capacity Alert section */}
          {capacityWarnings.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Pricing Capacity Alerts
                </CardTitle>
                <CardDescription>
                  The following schools are approaching or have exceeded their current subscription plan student capacity limits. Use this to contact them for an upgrade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {capacityWarnings.map((warning, index) => (
                    <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border bg-white dark:bg-slate-900 gap-4 shadow-sm">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{warning.schoolName}</h4>
                        <p className="text-xs text-slate-505">
                          Current Tier: <strong className="font-semibold text-slate-800 dark:text-slate-350">{warning.planName}</strong>
                        </p>
                      </div>
                      <div className="flex flex-col sm:items-end w-full sm:w-auto gap-1">
                        <div className="flex justify-between w-full text-xs font-semibold text-slate-655 dark:text-slate-400">
                          <span>Capacity Utilization:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{warning.studentCount} / {warning.limit} students ({warning.utilization}%)</span>
                        </div>
                        <div className="w-full sm:w-48 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, warning.utilization)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interactive Pricing and Marketing Decision Simulator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sliders className="h-5 w-5 text-blue-650" />
                Strategic Growth Simulator
              </CardTitle>
              <CardDescription>
                Simulate changes in pricing model, conversion improvement, and marketing budgets to preview projected outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Sliders Control Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Price Change slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="price-sim" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subscription Price Adjust</Label>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">{simPriceChange >= 0 ? `+${simPriceChange}` : simPriceChange}%</span>
                  </div>
                  <input 
                    id="price-sim"
                    type="range"
                    min="-50"
                    max="100"
                    value={simPriceChange}
                    onChange={(e) => setSimPriceChange(Number(e.target.value))}
                    className="w-full h-1.5 cursor-pointer bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none accent-blue-650"
                  />
                  <p className="text-[10px] text-slate-505 leading-normal">
                    Adjust subscription fees across all plans. Affects ARPU and Lifetime Value.
                  </p>
                </div>

                {/* Conversion Rate slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="conv-sim" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Funnel Conversion Adjust</Label>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{simConversionChange >= 0 ? `+${simConversionChange}` : simConversionChange}%</span>
                  </div>
                  <input 
                    id="conv-sim"
                    type="range"
                    min="-50"
                    max="100"
                    value={simConversionChange}
                    onChange={(e) => setSimConversionChange(Number(e.target.value))}
                    className="w-full h-1.5 cursor-pointer bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none accent-emerald-500"
                  />
                  <p className="text-[10px] text-slate-505 leading-normal">
                    Improve sales outreach or demo success. Affects lead win rate and customer count.
                  </p>
                </div>

                {/* Marketing Spend slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="marketing-sim" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marketing Budget Adjust</Label>
                    <span className="text-sm font-black text-purple-600 dark:text-purple-400">{simMarketingChange >= 0 ? `+${simMarketingChange}` : simMarketingChange}%</span>
                  </div>
                  <input 
                    id="marketing-sim"
                    type="range"
                    min="-100"
                    max="200"
                    value={simMarketingChange}
                    onChange={(e) => setSimMarketingChange(Number(e.target.value))}
                    className="w-full h-1.5 cursor-pointer bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none accent-purple-500"
                  />
                  <p className="text-[10px] text-slate-550 leading-normal">
                    Adjust marketing and advertising spend. Affects marketing cost basis and CAC.
                  </p>
                </div>
              </div>

              {/* Simulation Results Section */}
              {(() => {
                const simulatedArpu = arpu * (1 + simPriceChange / 100);
                const simulatedSpend = marketingSpend * (1 + simMarketingChange / 100);
                const simulatedWinRate = Math.min(100, winRate * (1 + simConversionChange / 100));
                
                const simulatedCustomers = totalProspects > 0 ? Math.round(totalProspects * (simulatedWinRate / 100)) : (stats?.summary.activeSubscriptions || 0);
                const simulatedCac = simulatedCustomers > 0 ? Math.round(simulatedSpend / simulatedCustomers) : 0;
                
                const simulatedLtv = churnRate > 0 ? Math.round(simulatedArpu / churnRate) : Math.round(simulatedArpu * 36);
                const simulatedRatio = simulatedCac > 0 ? Number((simulatedLtv / simulatedCac).toFixed(1)) : 0;

                const arpuDiff = simulatedArpu - arpu;
                const spendDiff = simulatedSpend - marketingSpend;
                const winRateDiff = simulatedWinRate - winRate;
                const cacDiff = simulatedCac - cac;
                const ltvDiff = simulatedLtv - ltv;

                return (
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-6">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b pb-2">Projected Simulation Outcomes</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Sim Output 1: Win Rate */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projected Win Rate</span>
                        <h5 className="text-xl font-black text-slate-900 dark:text-white">
                          {simulatedWinRate.toFixed(0)}%
                        </h5>
                        {winRateDiff !== 0 && (
                          <p className={`text-[10px] font-bold ${winRateDiff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {winRateDiff > 0 ? `+${winRateDiff.toFixed(0)}%` : `${winRateDiff.toFixed(0)}%`} vs current
                          </p>
                        )}
                      </div>

                      {/* Sim Output 2: Projected CAC */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projected CAC</span>
                        <h5 className="text-xl font-black text-slate-900 dark:text-white">
                          {formatCurrency(simulatedCac)}
                        </h5>
                        {cacDiff !== 0 && (
                          <p className={`text-[10px] font-bold ${cacDiff < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {cacDiff > 0 ? `+${formatCurrency(cacDiff)}` : `${formatCurrency(cacDiff)}`} vs current
                          </p>
                        )}
                      </div>

                      {/* Sim Output 3: Projected LTV */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projected LTV</span>
                        <h5 className="text-xl font-black text-slate-900 dark:text-white">
                          {formatCurrency(simulatedLtv)}
                        </h5>
                        {ltvDiff !== 0 && (
                          <p className={`text-[10px] font-bold ${ltvDiff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {ltvDiff > 0 ? `+${formatCurrency(ltvDiff)}` : `${formatCurrency(ltvDiff)}`} vs current
                          </p>
                        )}
                      </div>

                      {/* Sim Output 4: Simulated Ratio */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projected LTV:CAC</span>
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-xl font-black text-slate-900 dark:text-white">
                            {simulatedCac > 0 ? `${simulatedRatio}x` : 'N/A'}
                          </h5>
                          {simulatedCac > 0 && (
                            <Badge className={
                              simulatedRatio >= 3.0 ? 'bg-emerald-500 text-white font-bold border-none' :
                              simulatedRatio >= 1.0 ? 'bg-amber-500 text-white font-bold border-none' :
                              'bg-rose-500 text-white font-bold border-none'
                            }>
                              {simulatedRatio >= 3.0 ? 'Healthy' : simulatedRatio >= 1.0 ? 'Warning' : 'Critical'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Target baseline: 3.0x or higher
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Details Dialog */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{selectedPlan ? 'Edit Pricing Plan' : 'Create Pricing Plan'}</DialogTitle>
            <DialogDescription>
              Modify pricing parameters for the Muchi application. These govern the reminder alerts and billing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePlan}>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="plan_name">Plan Name</Label>
                <Input 
                  id="plan_name" 
                  value={planForm.name} 
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  required 
                  placeholder="e.g. Premium Plan"
                  disabled={!!selectedPlan}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="plan_description">Description</Label>
                <Input 
                  id="plan_description" 
                  value={planForm.description} 
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Essential features for standard schools"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="plan_price">
                    {planForm.billing_cycle === 'monthly' && 'Monthly Price'}
                    {planForm.billing_cycle === 'termly' && 'Price per Term'}
                    {planForm.billing_cycle === 'yearly' && 'Price per Year'}
                    {planForm.billing_cycle === 'custom' && 'Price per Period'}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">K</span>
                    <Input 
                      id="plan_price" 
                      type="number"
                      value={planForm.price} 
                      onChange={(e) => setPlanForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      required 
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="plan_cycle">Billing Cycle / Period</Label>
                  <Select 
                    value={planForm.billing_cycle} 
                    onValueChange={(val) => {
                      let durVal = planForm.duration_value;
                      let durUnit = planForm.duration_unit;
                      if (val === 'monthly') {
                        durVal = 1;
                        durUnit = 'months';
                      } else if (val === 'termly') {
                        durVal = 4;
                        durUnit = 'months';
                      } else if (val === 'yearly') {
                        durVal = 12;
                        durUnit = 'months';
                      }
                      setPlanForm(prev => ({ 
                        ...prev, 
                        billing_cycle: val,
                        duration_value: durVal,
                        duration_unit: durUnit as any
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Select cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="termly">Termly (per Term)</SelectItem>
                      <SelectItem value="yearly">Yearly (for 1 Year)</SelectItem>
                      <SelectItem value="custom">Custom Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {planForm.billing_cycle === 'custom' && (
                <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-blue-50/20 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30">
                  <div className="space-y-1">
                    <Label className="text-blue-700 dark:text-blue-400 font-semibold">Custom Duration Value</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={planForm.duration_value} 
                      onChange={(e) => setPlanForm(prev => ({ ...prev, duration_value: Number(e.target.value) || 1 }))} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-blue-700 dark:text-blue-400 font-semibold">Duration Unit</Label>
                    <Select 
                      value={planForm.duration_unit} 
                      onValueChange={(val: any) => setPlanForm(prev => ({ ...prev, duration_unit: val }))}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="plan_min_students">Min Students</Label>
                  <Input 
                    id="plan_min_students" 
                    type="number"
                    value={planForm.min_students} 
                    onChange={(e) => setPlanForm(prev => ({ ...prev, min_students: Number(e.target.value) }))}
                    required 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="plan_max_students">Max Students (Blank = Unlimited)</Label>
                  <Input 
                    id="plan_max_students" 
                    type="number"
                    value={planForm.max_students} 
                    onChange={(e) => setPlanForm(prev => ({ ...prev, max_students: e.target.value }))}
                    placeholder="Leave blank for unlimited"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Active Status</Label>
                  <p className="text-xs text-slate-500">Allow schools to select or redeem this tier.</p>
                </div>
                <Switch 
                  checked={planForm.is_active} 
                  onCheckedChange={(checked) => setPlanForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingPlan} className="bg-blue-600 hover:bg-blue-700">
                {savingPlan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Pricing Plan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Transaction Dialog */}
      <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Record Business Transaction</DialogTitle>
            <DialogDescription>
              Add a custom platform-level operational income or expense ledger item.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="tx_type">Transaction Type</Label>
                  <select 
                    id="tx_type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={txForm.type}
                    onChange={(e) => setTxForm(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tx_date">Transaction Date</Label>
                  <Input 
                    id="tx_date" 
                    type="date"
                    value={txForm.date} 
                    onChange={(e) => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tx_category">Category</Label>
                {txForm.type === 'expense' ? (
                  <select 
                    id="tx_category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={txForm.category}
                    onChange={(e) => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Server Hosting">Server Hosting</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Software Licenses">Software Licenses</option>
                    <option value="Salaries & Wages">Salaries & Wages</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <select 
                    id="tx_category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={txForm.category}
                    onChange={(e) => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Setup Assistance">Setup Assistance</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Offline License Payment">Offline License Payment</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="tx_amount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">K</span>
                    <Input 
                      id="tx_amount" 
                      type="number"
                      min="0"
                      step="0.01"
                      value={txForm.amount} 
                      onChange={(e) => setTxForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      required 
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tx_currency">Currency</Label>
                  <Input 
                    id="tx_currency" 
                    value={txForm.currency} 
                    required 
                    disabled
                    className="bg-slate-50 text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tx_desc">Description</Label>
                <Input 
                  id="tx_desc" 
                  value={txForm.description} 
                  onChange={(e) => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Details of the payment..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTxModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingTx} className="bg-blue-600 hover:bg-blue-700">
                {savingTx ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Transaction"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Report Dialog */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Export Financial Report</DialogTitle>
            <DialogDescription>
              Select a period filter or define a custom date range for the generated MUCHI financial PDF report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="export_period">Report Period</Label>
              <select
                id="export_period"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={exportPeriod}
                onChange={(e) => setExportPeriod(e.target.value as any)}
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {exportPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-blue-50/20 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30">
                <div className="space-y-1">
                  <Label htmlFor="export_start_date" className="text-blue-700 dark:text-blue-400 font-semibold">Start Date</Label>
                  <Input
                    id="export_start_date"
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="export_end_date" className="text-blue-700 dark:text-blue-400 font-semibold">End Date</Label>
                  <Input
                    id="export_end_date"
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="h-4 w-4 mr-1.5" />
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

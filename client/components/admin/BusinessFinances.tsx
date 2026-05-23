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
  ListFilter
} from 'lucide-react';
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

export default function BusinessFinances() {
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
    max_students: '' as string | number
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

  useEffect(() => {
    fetchFinanceData();
    fetchPlans();
    fetchTransactions();
  }, []);

  const refreshAll = () => {
    fetchFinanceData();
    fetchPlans();
    fetchTransactions();
    toast({ title: "Refreshing", description: "Updating ledger registry and subscription details." });
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
        max_students: plan.max_students !== null ? plan.max_students : ''
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
        max_students: ''
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
      } else {
        throw new Error('Failed to delete transaction');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ZMW') => {
    return new Intl.NumberFormat('en-ZM', { style: 'currency', currency }).format(amount);
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
        <Button onClick={refreshAll} variant="outline" className="h-10 font-bold self-start sm:self-center">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="flex overflow-x-auto w-full max-w-full h-auto gap-1 bg-slate-100 p-1 dark:bg-slate-800 rounded-lg border scrollbar-none mb-4">
          <TabsTrigger value="subscriptions" className="font-bold text-sm py-2.5 px-4 shrink-0">
            <span className="hidden sm:inline">Subscription Revenue</span>
            <span className="sm:hidden">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="font-bold text-sm py-2.5 px-4 shrink-0">
            <span className="hidden sm:inline">Operational Ledger (Incomes & Expenses)</span>
            <span className="sm:hidden">Operational Ledger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          {/* Metrics Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

          {/* Visualizations Charts */}
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

            {/* Plan Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Plan Distribution</CardTitle>
                <CardDescription>Breakdown of active subscriber tiers</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col justify-center">
                {stats?.planDistribution && stats.planDistribution.length > 0 ? (
                  <div className="h-full flex flex-col justify-center">
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={stats.planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
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
                    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs mt-2 font-medium">
                      {stats.planDistribution.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
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
                            <Button onClick={() => handleOpenPlanModal(plan)} variant="ghost" size="sm" className="hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Edit className="h-4 w-4 text-blue-600" />
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
                  <Label htmlFor="plan_price">Monthly Price</Label>
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
                  <Label htmlFor="plan_cycle">Billing Cycle</Label>
                  <Input 
                    id="plan_cycle" 
                    value={planForm.billing_cycle} 
                    onChange={(e) => setPlanForm(prev => ({ ...prev, billing_cycle: e.target.value }))}
                    required 
                    placeholder="monthly"
                    disabled
                    className="bg-slate-50 text-slate-500"
                  />
                </div>
              </div>

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
    </div>
  );
}

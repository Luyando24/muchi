import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Award, Filter, Briefcase, GraduationCap, Search, 
  AlertCircle, Building2, TrendingUp, CheckCircle, HelpCircle, 
  AlertTriangle, ArrowUpRight, CheckCircle2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { syncFetch } from '@/lib/syncService';

const QUAL_ORDER = ["Certificate", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD"];

export default function QualificationsPromotion() {
  const [data, setData] = useState({
    qualifications: [] as any[],
    distribution: {} as Record<string, number>,
    upgradesRate: [] as { year: number, count: number }[],
    schoolStats: [] as any[],
    alerts: [] as any[],
    settings: {
      gov_promotion_min_tenure: '3',
      gov_promotion_min_qualification: "Bachelor's Degree",
      gov_diploma_upgrade_years_threshold: '5'
    } as any
  });
  
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });
  const [regions, setRegions] = useState<{ province: string, districts: string[] }[]>([]);
  const [activeTab, setActiveTab] = useState<'tracker' | 'analytics' | 'schools' | 'alerts'>('tracker');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');

  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const regionsData = await syncFetch('/api/government/regions', { 
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: 'gov-regions'
        });
        if (regionsData) setRegions(regionsData);
      } catch (err) {
        console.error("Failed to load regions:", err);
      }
    }
    fetchRegions();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        let url = '/api/government/qualifications?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const result = await syncFetch(url, { 
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: `gov-qualifications-${filters.province}-${filters.district}`
        });
        if (result) {
          setData({
            qualifications: result.qualifications || [],
            distribution: result.distribution || {},
            upgradesRate: result.upgradesRate || [],
            schoolStats: result.schoolStats || [],
            alerts: result.alerts || [],
            settings: result.settings || {
              gov_promotion_min_tenure: '3',
              gov_promotion_min_qualification: "Bachelor's Degree",
              gov_diploma_upgrade_years_threshold: '5'
            }
          });
        }
      } catch (err) {
        console.error("Failed to load qualifications data:", err);
      } finally { 
        setLoading(false); 
      }
    }
    load();
  }, [filters]);

  const minTenure = parseInt(data.settings.gov_promotion_min_tenure, 10) || 3;
  const minQualification = data.settings.gov_promotion_min_qualification || "Bachelor's Degree";
  const upgradeAlertLimit = parseInt(data.settings.gov_diploma_upgrade_years_threshold, 10) || 5;

  const getQualIndex = (q: string) => {
    const idx = QUAL_ORDER.indexOf(q);
    return idx === -1 ? 0 : idx;
  };

  const getEligibility = (tenure: number, qual: string) => {
    const targetIdx = getQualIndex(minQualification);
    const currentIdx = getQualIndex(qual);
    const isQualMet = currentIdx >= targetIdx;

    if (tenure >= minTenure && isQualMet) {
      return { status: 'Eligible', reason: 'Meets tenure & qualification criteria' };
    } else if (tenure >= Math.max(1, minTenure - 1) && currentIdx >= Math.max(0, targetIdx - 1)) {
      let explanation = '';
      if (tenure < minTenure && !isQualMet) {
        explanation = `Needs ${minTenure} yrs service & ${minQualification}`;
      } else if (tenure < minTenure) {
        explanation = `Needs 1 more year of tenure`;
      } else {
        explanation = `Needs ${minQualification}`;
      }
      return { status: 'Approaching', reason: explanation };
    } else {
      let explanation = '';
      if (!isQualMet) {
        explanation = `Requires minimum ${minQualification}`;
      } else {
        explanation = `Requires ${minTenure} years of service`;
      }
      return { status: 'Not Eligible', reason: explanation };
    }
  };

  // Filtered qualifications for search
  const filteredQualifications = data.qualifications.filter(t => 
    t.full_name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.schools?.name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.highest_qualification?.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  // Filtered school breakdown
  const filteredSchoolStats = data.schoolStats.filter(s => 
    s.name?.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.district?.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.schoolType?.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const totalTeachers = data.qualifications.length;
  const totalBachelorsAndAbove = data.qualifications.filter(t => 
    ["Bachelor's Degree", "Master's Degree", "PhD"].includes(t.highest_qualification)
  ).length;
  const overallCompliancePct = totalTeachers > 0 ? Math.round((totalBachelorsAndAbove / totalTeachers) * 100) : 0;

  const chartData = Object.entries(data.distribution).map(([name, count]) => ({ 
    name, 
    count 
  })).sort((a, b) => b.count - a.count);

  if (loading && data.qualifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Qualifications Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Qualifications & Promotion Registry</h2>
          <p className="text-slate-600 dark:text-slate-400">Track qualifications, map upgrade rates, review secondary degree mandates, and evaluate promotion eligibility.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={filters.province} onValueChange={(val) => setFilters({ ...filters, province: val, district: 'All' })}>
            <SelectTrigger className="w-[145px] h-9 border-none focus:ring-0 shadow-none"><SelectValue placeholder="Province" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Provinces</SelectItem>
              {regions.map(r => <SelectItem key={r.province} value={r.province}>{r.province}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
          <Select value={filters.district} onValueChange={(val) => setFilters({ ...filters, district: val })} disabled={filters.province === 'All'}>
            <SelectTrigger className="w-[135px] h-9 border-none focus:ring-0 shadow-none"><SelectValue placeholder="District" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Districts</SelectItem>
              {regions.find(r => r.province === filters.province)?.districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Teachers Listed</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalTeachers}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Degree Holders Rate</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{overallCompliancePct}%</h3>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${overallCompliancePct}%` }}></div>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Diploma Alerts</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{data.alerts.length}</h3>
              <span className="text-[10px] text-rose-500 font-bold block">Secondary school mandate breach</span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-450 rounded-2xl">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Min promotion service</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{minTenure} yrs</h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">Requirement: {minQualification}</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Control Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700/60 pb-px gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
            activeTab === 'tracker' 
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Overview & Promotion Tracker
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
            activeTab === 'analytics' 
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Upgrade Analytics
        </button>
        <button
          onClick={() => setActiveTab('schools')}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
            activeTab === 'schools' 
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          School Breakdown
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 relative ${
            activeTab === 'alerts' 
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Upgrade Alerts
          {data.alerts.length > 0 && (
            <span className="absolute -top-1.5 -right-3.5 bg-rose-500 text-white rounded-full text-[9px] font-black w-4 h-4 flex items-center justify-center animate-pulse">
              {data.alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Settings Parameters Banner */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                Active Promotion Criteria Configurations
              </h4>
              <p className="text-xs text-blue-800/80 dark:text-blue-450">These criteria are dynamically configured by the ministry and applied programmatically across all teachers.</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-xl">
                <span className="text-slate-400">Min Tenure:</span> <strong className="text-slate-800 dark:text-slate-200">{minTenure} Years</strong>
              </div>
              <div className="bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-xl">
                <span className="text-slate-400">Min Qualification:</span> <strong className="text-slate-800 dark:text-slate-200">{minQualification}</strong>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-tight">Promotion Readiness Registry</CardTitle>
                  <CardDescription className="text-xs">Evaluates teachers against the active settings: {minTenure} years tenure and {minQualification} degree level.</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search teacher, school, or qualification..." 
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className="pl-9 rounded-xl text-xs h-9 border-slate-200 dark:border-slate-750"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700/50 text-[10px] font-black uppercase tracking-wider text-slate-450">
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">School</th>
                      <th className="px-6 py-4">Current Role</th>
                      <th className="px-6 py-4">Highest Qual.</th>
                      <th className="px-6 py-4">First Deployment</th>
                      <th className="px-6 py-4">Years in Service</th>
                      <th className="px-6 py-4">Status & Next Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                    {filteredQualifications.map((t, i) => {
                      const tenure = t.tenureYears || 0;
                      const { status, reason } = getEligibility(tenure, t.highest_qualification || '');

                      return (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">{t.full_name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{t.id.slice(0, 8)}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            <div className="flex flex-col">
                              <span className="font-medium">{t.schools?.name || 'Unknown'}</span>
                              <span className="text-[9px] text-slate-400">{t.schools?.school_type || 'Unknown'} • {t.schools?.district}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4"><Badge variant="outline" className="rounded-md font-bold px-2 py-0.5">{t.current_role || 'Subject Teacher'}</Badge></td>
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{t.highest_qualification || 'Unknown'}</td>
                          <td className="px-6 py-4 text-slate-550 font-bold">
                            {t.employment_date 
                              ? String(t.employment_date).split('-')[0] 
                              : (t.join_date ? String(t.join_date).split('-')[0] : 'N/A')}
                          </td>
                          <td className="px-6 py-4 text-slate-900 dark:text-white font-bold">{tenure} yrs</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {status === 'Eligible' && (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white w-fit border-0 font-black px-2.5 py-0.5 text-[10px] uppercase rounded-full">
                                  Eligible
                                </Badge>
                              )}
                              {status === 'Approaching' && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white w-fit border-0 font-black px-2.5 py-0.5 text-[10px] uppercase rounded-full">
                                  Approaching
                                </Badge>
                              )}
                              {status === 'Not Eligible' && (
                                <Badge className="bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-350 w-fit border-0 font-black px-2.5 py-0.5 text-[10px] uppercase rounded-full">
                                  Not Eligible
                                </Badge>
                              )}
                              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium leading-tight">{reason}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredQualifications.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-xs uppercase tracking-wider text-slate-500">No teachers found matching criteria</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Overall qualification breakdown */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
            <CardHeader className="p-6 border-b dark:border-slate-700/50">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                Qualification Level Distribution
              </CardTitle>
              <CardDescription className="text-xs">Visual breakdown of all teachers' highest academic qualifications.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" style={{ fontSize: '10px', fontWeight: 'bold' }} stroke="#94a3b8" />
                  <YAxis style={{ fontSize: '10px', fontWeight: 'bold' }} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Card 2: Qualification upgrading trends over time */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
            <CardHeader className="p-6 border-b dark:border-slate-700/50">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Teacher Upgrade Rate Over Time
              </CardTitle>
              <CardDescription className="text-xs">The number of qualifications completed and logged per year.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.upgradesRate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUpgrade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" style={{ fontSize: '10px', fontWeight: 'bold' }} stroke="#94a3b8" />
                  <YAxis style={{ fontSize: '10px', fontWeight: 'bold' }} stroke="#94a3b8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorUpgrade)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'schools' && (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="p-6 border-b dark:border-slate-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-500" />
                  Degree Level Statistics by School
                </CardTitle>
                <CardDescription className="text-xs">Tracks the proportion of teachers holding a Bachelor's Degree or higher (Zambia mandate compliance).</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search school or district..." 
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  className="pl-9 rounded-xl text-xs h-9 border-slate-200 dark:border-slate-750"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700/50 text-[10px] font-black uppercase tracking-wider text-slate-450">
                    <th className="px-6 py-4">School</th>
                    <th className="px-6 py-4">School Type</th>
                    <th className="px-6 py-4">Location (Province / District)</th>
                    <th className="px-6 py-4 text-center">Total Staff</th>
                    <th className="px-6 py-4 text-center">Bachelors & Above</th>
                    <th className="px-6 py-4">Mandate Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                  {filteredSchoolStats.map((s, i) => {
                    const isSecondary = (s.schoolType || '').toLowerCase() === 'secondary school';
                    
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                        <td className="px-6 py-4 font-bold text-slate-950 dark:text-white text-sm">{s.name}</td>
                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-450">
                          <Badge variant="secondary" className="font-bold text-[10px]">{s.schoolType}</Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {s.province} • {s.district}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200">{s.totalTeachers}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200">{s.bachelorsAndAbove}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-800 dark:text-slate-200 w-8 shrink-0">{s.percentage}%</span>
                            <div className="w-24 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden shrink-0">
                              <div 
                                className={`h-full rounded-full ${s.percentage >= 80 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                style={{ width: `${s.percentage}%` }}
                              ></div>
                            </div>
                            {isSecondary && s.percentage < 100 ? (
                              <Badge className="bg-rose-50 dark:bg-rose-950/20 text-rose-500 border-rose-200 border text-[9px] font-black uppercase rounded-md shrink-0">
                                Mandate Gap
                              </Badge>
                            ) : isSecondary ? (
                              <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border-emerald-200 border text-[9px] font-black uppercase rounded-md shrink-0">
                                Fully Compliant
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSchoolStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-xs uppercase tracking-wider text-slate-500">No schools match search criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'alerts' && (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="p-6 border-b dark:border-slate-700/50 bg-gradient-to-r from-rose-50/20 to-transparent dark:from-rose-950/5">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-black uppercase tracking-tight text-rose-600 dark:text-rose-450 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                  Secondary School Upgrade Alerts
                </CardTitle>
                <CardDescription className="text-xs">
                  Active alerts for secondary school teachers who still hold a Diploma and have exceeded the government upgrade threshold (currently <strong>{upgradeAlertLimit} years</strong> of service).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700/50 text-[10px] font-black uppercase tracking-wider text-slate-450">
                    <th className="px-6 py-4">Teacher Name</th>
                    <th className="px-6 py-4">School & Region</th>
                    <th className="px-6 py-4">Active Qualification</th>
                    <th className="px-6 py-4">Years in Service</th>
                    <th className="px-6 py-4">Threshold Allowed</th>
                    <th className="px-6 py-4">Action Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                  {data.alerts.map((a, i) => (
                    <tr key={i} className="hover:bg-rose-50/10 dark:hover:bg-rose-950/5 transition-all">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-950 dark:text-white block text-sm">{a.fullName}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{a.teacherId.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-slate-700 dark:text-slate-300">
                          <span className="font-bold">{a.schoolName}</span>
                          <span className="text-[10px] text-slate-400">{a.province} • {a.district}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">
                        {a.qualification}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900 dark:text-white block text-sm">{a.tenureYears} yrs</span>
                        <span className="text-[9px] text-rose-500 font-bold block mt-0.5">Exceeded by {a.tenureYears - a.limit} yrs</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-bold">{a.limit} yrs max</td>
                      <td className="px-6 py-4">
                        <Badge className="bg-rose-100 hover:bg-rose-200 text-rose-700 border-none font-black px-2 py-0.5 text-[9px] uppercase rounded-md">
                          Upgrade Pending
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {data.alerts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-xs uppercase tracking-wider text-slate-500">Fully compliant. No upgrade alerts triggered.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

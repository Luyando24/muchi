import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings, Save, Loader2, Info, Activity, 
  Users, AlertTriangle, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface SettingsForm {
  gov_ptr_critical_threshold: number;
  gov_ptr_warning_threshold: number;
  gov_pass_rate_threshold: number;
  gov_attendance_threshold: number;
  gov_promotion_min_tenure: number;
  gov_promotion_min_qualification: string;
  gov_diploma_upgrade_years_threshold: number;
}

const defaultForm: SettingsForm = {
  gov_ptr_critical_threshold: 45,
  gov_ptr_warning_threshold: 35,
  gov_pass_rate_threshold: 40,
  gov_attendance_threshold: 75,
  gov_promotion_min_tenure: 3,
  gov_promotion_min_qualification: "Bachelor's Degree",
  gov_diploma_upgrade_years_threshold: 5
};

export default function GovernmentSettings() {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // For live preview calculations
  const [previewSchoolPassRate, setPreviewSchoolPassRate] = useState(38);
  const [previewSchoolAttendance, setPreviewSchoolAttendance] = useState(72);
  const [previewSchoolPTR, setPreviewSchoolPTR] = useState(42);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/government/settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      
      setForm({
        gov_ptr_critical_threshold: parseInt(data.gov_ptr_critical_threshold) || defaultForm.gov_ptr_critical_threshold,
        gov_ptr_warning_threshold: parseInt(data.gov_ptr_warning_threshold) || defaultForm.gov_ptr_warning_threshold,
        gov_pass_rate_threshold: parseInt(data.gov_pass_rate_threshold) || defaultForm.gov_pass_rate_threshold,
        gov_attendance_threshold: parseInt(data.gov_attendance_threshold) || defaultForm.gov_attendance_threshold,
        gov_promotion_min_tenure: parseInt(data.gov_promotion_min_tenure) || defaultForm.gov_promotion_min_tenure,
        gov_promotion_min_qualification: data.gov_promotion_min_qualification || defaultForm.gov_promotion_min_qualification,
        gov_diploma_upgrade_years_threshold: parseInt(data.gov_diploma_upgrade_years_threshold) || defaultForm.gov_diploma_upgrade_years_threshold
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error Loading Settings',
        description: err.message || 'Falling back to system defaults.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (form.gov_ptr_warning_threshold >= form.gov_ptr_critical_threshold) {
      toast({
        title: 'Validation Error',
        description: 'Warning staffing threshold (PTR) must be strictly less than the Critical threshold.',
        variant: 'destructive'
      });
      return;
    }

    // Validation complete

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found.');

      const res = await fetch('/api/government/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'Ministry parameters and system configurations have been updated successfully.'
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Failed to Save Settings',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Configurations...</p>
      </div>
    );
  }

  // Live preview alerts logic
  const isPassRateAlertActive = previewSchoolPassRate < form.gov_pass_rate_threshold;
  const isAttendanceAlertActive = previewSchoolAttendance < form.gov_attendance_threshold;
  const ptrAlertLevel = previewSchoolPTR >= form.gov_ptr_critical_threshold 
    ? 'Critical' 
    : previewSchoolPTR >= form.gov_ptr_warning_threshold 
      ? 'Warning' 
      : 'Stable';

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Portal Configuration</h2>
          <p className="text-slate-600 dark:text-slate-400">Configure alert thresholds, regional performance metrics, and feeding parameters.</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchSettings} 
          disabled={saving}
          className="h-10 w-10 rounded-full"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Form Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card 1: Academic Thresholds */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">
                <Activity className="h-5 w-5" />
                Performance Alert Thresholds
              </CardTitle>
              <CardDescription className="text-xs">Adjust triggers for underperforming schools and attendance drop warnings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              {/* Pass Rate Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Underperforming Pass Rate Limit</Label>
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-black">
                    {form.gov_pass_rate_threshold}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="80" 
                  value={form.gov_pass_rate_threshold}
                  onChange={(e) => setForm({ ...form, gov_pass_rate_threshold: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>20% (Relaxed)</span>
                  <span>50% (Standard)</span>
                  <span>80% (Strict)</span>
                </div>
              </div>

              {/* Attendance Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Minimum Student Attendance Limit</Label>
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-black">
                    {form.gov_attendance_threshold}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="95" 
                  value={form.gov_attendance_threshold}
                  onChange={(e) => setForm({ ...form, gov_attendance_threshold: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>50% (Critical)</span>
                  <span>75% (Standard)</span>
                  <span>95% (Excellent)</span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Card 2: Staffing / Workforce PTR */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-purple-600 dark:text-purple-400">
                <Users className="h-5 w-5" />
                Staffing & PTR Thresholds
              </CardTitle>
              <CardDescription className="text-xs">Define pupil-teacher ratio warning boundaries to isolate critical teacher shortages.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              {/* PTR Warning Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">PTR Warning Threshold</Label>
                  <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-black">
                    {form.gov_ptr_warning_threshold}:1
                  </span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="44" 
                  value={form.gov_ptr_warning_threshold}
                  onChange={(e) => setForm({ ...form, gov_ptr_warning_threshold: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>20:1 (Target)</span>
                  <span>35:1 (Warning Limit)</span>
                  <span>44:1 (High Warning)</span>
                </div>
              </div>

              {/* PTR Critical Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">PTR Critical Threshold</Label>
                  <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 px-3 py-1 rounded-full text-xs font-black">
                    {form.gov_ptr_critical_threshold}:1
                  </span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="70" 
                  value={form.gov_ptr_critical_threshold}
                  onChange={(e) => setForm({ ...form, gov_ptr_critical_threshold: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>40:1 (Overburdened)</span>
                  <span>45:1 (Critical Limit)</span>
                  <span>70:1 (Understaffed)</span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Card 3: Promotion & Qualifications Criteria */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-emerald-600 dark:text-emerald-400">
                <Settings className="h-5 w-5" />
                Promotion & Qualifications Criteria
              </CardTitle>
              <CardDescription className="text-xs">Configure career advancement benchmarks and qualification alerts thresholds.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Min Tenure Select/Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gov_promotion_min_tenure" className="text-sm font-bold text-slate-700 dark:text-slate-300">Min Years of Service for Promotion</Label>
                  <Input
                    id="gov_promotion_min_tenure"
                    type="number"
                    min="1"
                    max="20"
                    value={form.gov_promotion_min_tenure}
                    onChange={(e) => setForm({ ...form, gov_promotion_min_tenure: parseInt(e.target.value) || 3 })}
                    className="rounded-xl border-slate-200 dark:border-slate-700"
                  />
                  <p className="text-[10px] text-slate-400">Minimum consecutive years of service required to be considered eligible for role promotion.</p>
                </div>

                {/* Min Qualification Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="gov_promotion_min_qualification" className="text-sm font-bold text-slate-700 dark:text-slate-300">Min Qualification for Promotion</Label>
                  <select
                    id="gov_promotion_min_qualification"
                    value={form.gov_promotion_min_qualification}
                    onChange={(e) => setForm({ ...form, gov_promotion_min_qualification: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="Certificate">Certificate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="PhD">PhD</option>
                  </select>
                  <p className="text-[10px] text-slate-400">Minimum academic degree required for eligibility in standard promotions.</p>
                </div>
              </div>

              {/* Diploma Upgrade Years Threshold */}
              <div className="space-y-2">
                <Label htmlFor="gov_diploma_upgrade_years_threshold" className="text-sm font-bold text-slate-700 dark:text-slate-300">Secondary Diploma Holder Upgrade Threshold (Years)</Label>
                <Input
                  id="gov_diploma_upgrade_years_threshold"
                  type="number"
                  min="1"
                  max="15"
                  value={form.gov_diploma_upgrade_years_threshold}
                  onChange={(e) => setForm({ ...form, gov_diploma_upgrade_years_threshold: parseInt(e.target.value) || 5 })}
                  className="rounded-xl border-slate-200 dark:border-slate-700"
                />
                <p className="text-[10px] text-slate-400">Trigger warnings for secondary school teachers holding a Diploma who have served for this number of years or more without upgrading to a Bachelor's Degree.</p>
              </div>

            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saving} 
              className="px-8 h-12 rounded-xl bg-blue-600 text-white font-black uppercase tracking-wider text-xs hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Configuration...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Portal Settings
                </>
              )}
            </Button>
          </div>

        </div>

        {/* Live Preview Side Column */}
        <div className="space-y-8">
          
          <Card className="border-none shadow-md bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl overflow-hidden h-fit">
            <CardHeader className="border-b border-white/10 p-6">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-blue-400">
                <Activity className="h-5 w-5 animate-pulse" />
                Live Preview Widget
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Simulate metrics below to test how warnings will display on the national dashboards based on your active configuration.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Preview Sliders */}
              <div className="space-y-4 pt-2 border-b border-white/5 pb-6">
                
                {/* Sim: Pass Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Simulate School Pass Rate</span>
                    <span className="font-bold text-blue-400">{previewSchoolPassRate}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="90" 
                    value={previewSchoolPassRate}
                    onChange={(e) => setPreviewSchoolPassRate(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Sim: Attendance */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Simulate School Attendance</span>
                    <span className="font-bold text-amber-400">{previewSchoolAttendance}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="40" 
                    max="100" 
                    value={previewSchoolAttendance}
                    onChange={(e) => setPreviewSchoolAttendance(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Sim: PTR */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Simulate School PTR Ratio</span>
                    <span className="font-bold text-purple-400">{previewSchoolPTR}:1</span>
                  </div>
                  <input 
                    type="range" 
                    min="15" 
                    max="65" 
                    value={previewSchoolPTR}
                    onChange={(e) => setPreviewSchoolPTR(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

              </div>

              {/* Dynamic Outputs */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Triggered Dashboard Alerts</h4>
                
                {/* Pass Rate Alert Output */}
                <div className={cn(
                  "p-4 rounded-xl flex items-start gap-3 border transition-all duration-300",
                  isPassRateAlertActive 
                    ? "bg-rose-950/20 border-rose-900/50 text-rose-300"
                    : "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                )}>
                  {isPassRateAlertActive ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-wider">
                      {isPassRateAlertActive ? 'Underperforming Cluster Warning' : 'Stable Academic Cluster'}
                    </h5>
                    <p className="text-[10px] opacity-80 mt-1">
                      {isPassRateAlertActive 
                        ? `The simulated school's pass rate (${previewSchoolPassRate}%) is below your dynamic threshold limit (${form.gov_pass_rate_threshold}%).`
                        : `Pass rate (${previewSchoolPassRate}%) meets the target threshold of (${form.gov_pass_rate_threshold}%).`
                      }
                    </p>
                  </div>
                </div>

                {/* Attendance Alert Output */}
                <div className={cn(
                  "p-4 rounded-xl flex items-start gap-3 border transition-all duration-300",
                  isAttendanceAlertActive 
                    ? "bg-amber-950/20 border-amber-900/50 text-amber-300"
                    : "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                )}>
                  {isAttendanceAlertActive ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-wider">
                      {isAttendanceAlertActive ? 'Low Attendance Critical Alert' : 'Stable Attendance Record'}
                    </h5>
                    <p className="text-[10px] opacity-80 mt-1">
                      {isAttendanceAlertActive 
                        ? `The simulated attendance rate (${previewSchoolAttendance}%) has dropped below the threshold (${form.gov_attendance_threshold}%).`
                        : `Attendance rate (${previewSchoolAttendance}%) is in the safe zone (>= ${form.gov_attendance_threshold}%).`
                      }
                    </p>
                  </div>
                </div>

                {/* PTR Alert Output */}
                <div className={cn(
                  "p-4 rounded-xl flex items-start gap-3 border transition-all duration-300",
                  ptrAlertLevel === 'Critical' 
                    ? "bg-rose-950/20 border-rose-900/50 text-rose-300"
                    : ptrAlertLevel === 'Warning'
                      ? "bg-purple-950/20 border-purple-900/50 text-purple-300"
                      : "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                )}>
                  {ptrAlertLevel !== 'Stable' ? (
                    <AlertTriangle className={cn("h-5 w-5 shrink-0 mt-0.5", ptrAlertLevel === 'Critical' ? "text-rose-500" : "text-purple-500")} />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-wider">
                      {ptrAlertLevel === 'Critical' 
                        ? 'Critical Staffing Shortage' 
                        : ptrAlertLevel === 'Warning' 
                          ? 'Staffing Warning Level' 
                          : 'Optimal Staffing Ratio'}
                    </h5>
                    <p className="text-[10px] opacity-80 mt-1">
                      {ptrAlertLevel === 'Critical' 
                        ? `PTR Ratio (${previewSchoolPTR}:1) exceeds the Critical threshold limit (>= ${form.gov_ptr_critical_threshold}:1).`
                        : ptrAlertLevel === 'Warning'
                          ? `PTR Ratio (${previewSchoolPTR}:1) exceeds the Warning threshold limit (>= ${form.gov_ptr_warning_threshold}:1).`
                          : `PTR Ratio (${previewSchoolPTR}:1) is balanced (below ${form.gov_ptr_warning_threshold}:1).`
                      }
                    </p>
                  </div>
                </div>

              </div>

            </CardContent>
          </Card>
          
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2,
  Loader2,
  GraduationCap,
  DollarSign,
  Users,
  Building2,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Report } from '@shared/api';

const reportCategories = [
  { name: "Academic Reports", icon: GraduationCap, description: "Performance, grades, and exam results", type: "Academic" },
  { name: "Financial Reports", icon: DollarSign, description: "Income, expenses, and fee collection", type: "Financial" },
  { name: "Student Reports", icon: Users, description: "Enrollment, attendance, and demographics", type: "Student" },
  { name: "Staff Reports", icon: Building2, description: "Teaching load, attendance, and payroll", type: "Staff" },
];

export default function ReportsManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<{academic_year: string, current_term: string} | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    type: 'Academic' as 'Academic' | 'Financial' | 'Student' | 'Staff' | 'System',
    description: ''
  });

  const fetchSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const res = await fetch('/api/school/settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const settings = await res.json();
        setSchoolSettings(settings);
        return settings;
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
    return null;
  };

  const fetchReports = async (term?: string, year?: string) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let url = '/api/school/reports';
      const params = new URLSearchParams();
      if (term) params.append('term', term);
      if (year) params.append('academicYear', year);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const settings = await fetchSettings();
      if (settings) {
        // By default, filter by current academic year and term
        fetchReports(settings.current_term, settings.academic_year);
      } else {
        fetchReports();
      }
    };
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'Academic',
      description: ''
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }

      toast({
        title: "Success",
        description: "Report generated successfully",
      });

      setIsGenerateOpen(false);
      resetForm();
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete report');

      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = (report: Report) => {
    // Mock download
    toast({
      title: "Download Started",
      description: `Downloading ${report.title}...`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports Center</h2>
          <p className="text-slate-600 dark:text-slate-400">Generate and view system-wide reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter Reports
          </Button>
          <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <FileText className="h-4 w-4 mr-2" />
                Generate New Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
                <DialogDescription>
                  Select the type of report you want to generate.
                  {schoolSettings && (
                    <div className="mt-2 p-2 bg-muted rounded-md flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">Auto-set for:</span> 
                      {schoolSettings.current_term}, {schoolSettings.academic_year}
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Report Title</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="e.g., Q1 Financial Summary" 
                    value={formData.title} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Report Type</Label>
                  <Select 
                    name="type" 
                    value={formData.type} 
                    onValueChange={(val) => handleSelectChange('type', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Financial">Financial</SelectItem>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="System">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input 
                    id="description" 
                    name="description" 
                    placeholder="Brief description of the report..." 
                    value={formData.description} 
                    onChange={handleInputChange} 
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
                  <Button type="submit">Generate Report</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCategories.map((category, index) => (
          <Card key={index} className="cursor-pointer hover:border-indigo-500 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <category.icon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{category.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{category.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Recently generated documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                      <p className="mt-2 text-sm text-slate-500">Loading reports...</p>
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No reports found. Click "Generate New Report" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          {report.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'Ready' ? 'default' : 'secondary'} className={report.status === 'Ready' ? 'bg-green-500' : ''}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(report)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(report.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
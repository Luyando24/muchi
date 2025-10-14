import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { 
  FileText, 
  Download, 
  Eye, 
  Filter,
  Calendar,
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Printer,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  UserCheck,
  BookOpen,
  Target,
  Award,
  CreditCard,
  Banknote,
  Receipt,
  FileBarChart,
  Database,
  Globe,
  Settings
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  lastGenerated: string;
  status: 'ready' | 'generating' | 'error';
  size: string;
  format: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: string[];
  frequency: string;
  icon: React.ReactNode;
}

export default function ReportsManagement() {
  const [activeTab, setActiveTab] = useState('academic');
  const [selectedDateRange, setSelectedDateRange] = useState('current-term');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Mock data for recent reports
  const recentReports: Report[] = [
    {
      id: '1',
      name: 'Grade 12 Progress Report',
      description: 'Comprehensive academic progress for Grade 12 students',
      category: 'Academic',
      lastGenerated: '2024-01-15 14:30',
      status: 'ready',
      size: '2.4 MB',
      format: 'PDF'
    },
    {
      id: '2',
      name: 'Monthly Attendance Summary',
      description: 'Attendance statistics for December 2023',
      category: 'Attendance',
      lastGenerated: '2024-01-10 09:15',
      status: 'ready',
      size: '1.8 MB',
      format: 'Excel'
    },
    {
      id: '3',
      name: 'Fee Collection Report',
      description: 'Outstanding fees and payment tracking',
      category: 'Financial',
      lastGenerated: '2024-01-12 16:45',
      status: 'generating',
      size: '-',
      format: 'PDF'
    }
  ];

  // Report templates
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'student-progress',
      name: 'Student Progress Report',
      description: 'Individual student academic performance and progress tracking',
      category: 'Academic',
      parameters: ['Student', 'Term', 'Subjects'],
      frequency: 'Termly',
      icon: <GraduationCap className="h-5 w-5" />
    },
    {
      id: 'class-performance',
      name: 'Class Performance Analysis',
      description: 'Comparative analysis of class performance across subjects',
      category: 'Academic',
      parameters: ['Class', 'Term', 'Subjects'],
      frequency: 'Termly',
      icon: <BarChart3 className="h-5 w-5" />
    },
    {
      id: 'grade-distribution',
      name: 'Grade Distribution Report',
      description: 'Statistical breakdown of grades across all subjects',
      category: 'Academic',
      parameters: ['Grade Level', 'Term', 'Subject'],
      frequency: 'Termly',
      icon: <PieChart className="h-5 w-5" />
    },
    {
      id: 'attendance-summary',
      name: 'Attendance Summary',
      description: 'Daily, weekly, and monthly attendance statistics',
      category: 'Attendance',
      parameters: ['Date Range', 'Class', 'Student'],
      frequency: 'Daily/Weekly/Monthly',
      icon: <UserCheck className="h-5 w-5" />
    },
    {
      id: 'attendance-trends',
      name: 'Attendance Trends Analysis',
      description: 'Long-term attendance patterns and trend analysis',
      category: 'Attendance',
      parameters: ['Date Range', 'Grade Level'],
      frequency: 'Monthly',
      icon: <TrendingUp className="h-5 w-5" />
    },
    {
      id: 'fee-collection',
      name: 'Fee Collection Report',
      description: 'Comprehensive fee collection and outstanding balance report',
      category: 'Financial',
      parameters: ['Term', 'Fee Type', 'Class'],
      frequency: 'Monthly',
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      id: 'payment-tracking',
      name: 'Payment Tracking',
      description: 'Detailed payment history and transaction records',
      category: 'Financial',
      parameters: ['Date Range', 'Payment Method'],
      frequency: 'Weekly',
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      id: 'financial-summary',
      name: 'Financial Summary',
      description: 'Overall financial health and revenue analysis',
      category: 'Financial',
      parameters: ['Term', 'Financial Year'],
      frequency: 'Termly',
      icon: <Banknote className="h-5 w-5" />
    },
    {
      id: 'teacher-performance',
      name: 'Teacher Performance Report',
      description: 'Teacher effectiveness and student outcome correlation',
      category: 'Staff',
      parameters: ['Teacher', 'Subject', 'Term'],
      frequency: 'Termly',
      icon: <Award className="h-5 w-5" />
    },
    {
      id: 'staff-attendance',
      name: 'Staff Attendance Report',
      description: 'Staff attendance patterns and leave analysis',
      category: 'Staff',
      parameters: ['Date Range', 'Department'],
      frequency: 'Monthly',
      icon: <Clock className="h-5 w-5" />
    },
    {
      id: 'emis-export',
      name: 'EMIS Data Export',
      description: 'Ministry of Education EMIS compliant data export',
      category: 'Compliance',
      parameters: ['Academic Year', 'Data Type'],
      frequency: 'Annually',
      icon: <Database className="h-5 w-5" />
    },
    {
      id: 'exam-registration',
      name: 'Exam Council Registration',
      description: 'Candidate registration data for national examinations',
      category: 'Compliance',
      parameters: ['Exam Type', 'Grade Level'],
      frequency: 'Per Exam Session',
      icon: <FileBarChart className="h-5 w-5" />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'generating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4" />;
      case 'generating': return <Clock className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleGenerateReport = (templateId: string) => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate report generation
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const filterTemplatesByCategory = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'academic': 'Academic',
      'attendance': 'Attendance',
      'financial': 'Financial',
      'staff': 'Staff',
      'compliance': 'Compliance'
    };
    
    return reportTemplates.filter(template => 
      template.category === categoryMap[category]
    );
  };

  return (
    <DashboardLayout
      title="Reports Management"
      subtitle="Generate, view, and export comprehensive school reports"
      activeTab="reports"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">247</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Reports</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Active schedules</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Export</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">Files exported</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">EMIS Compliance</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98%</div>
              <p className="text-xs text-muted-foreground">Data completeness</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Generation Progress */}
        {isGenerating && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 animate-spin" />
                Generating Report...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={generationProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                Progress: {generationProgress}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          {/* Academic Reports */}
          <TabsContent value="academic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Academic Reports</CardTitle>
                <CardDescription>
                  Generate comprehensive academic performance and progress reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterTemplatesByCategory('academic').map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          {template.icon}
                          <CardTitle className="text-base">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {template.parameters.map((param) => (
                              <Badge key={param} variant="outline" className="text-xs">
                                {param}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{template.frequency}</span>
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1">
                                  <Settings className="h-4 w-4 mr-1" />
                                  Configure
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Configure {template.name}</DialogTitle>
                                  <DialogDescription>
                                    Set parameters for report generation
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Date Range</Label>
                                    <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="current-term">Current Term</SelectItem>
                                        <SelectItem value="previous-term">Previous Term</SelectItem>
                                        <SelectItem value="academic-year">Academic Year</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Class/Grade</Label>
                                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        <SelectItem value="grade-8">Grade 8</SelectItem>
                                        <SelectItem value="grade-9">Grade 9</SelectItem>
                                        <SelectItem value="grade-10">Grade 10</SelectItem>
                                        <SelectItem value="grade-11">Grade 11</SelectItem>
                                        <SelectItem value="grade-12">Grade 12</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Subject</Label>
                                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        <SelectItem value="mathematics">Mathematics</SelectItem>
                                        <SelectItem value="english">English</SelectItem>
                                        <SelectItem value="science">Science</SelectItem>
                                        <SelectItem value="social-studies">Social Studies</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      onClick={() => handleGenerateReport(template.id)}
                                      disabled={isGenerating}
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Generate Report
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Reports */}
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
                <CardDescription>
                  Track and analyze student attendance patterns and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterTemplatesByCategory('attendance').map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          {template.icon}
                          <CardTitle className="text-base">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {template.parameters.map((param) => (
                              <Badge key={param} variant="outline" className="text-xs">
                                {param}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{template.frequency}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleGenerateReport(template.id)}
                              disabled={isGenerating}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Reports */}
          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  Monitor fee collection, payments, and financial performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterTemplatesByCategory('financial').map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          {template.icon}
                          <CardTitle className="text-base">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {template.parameters.map((param) => (
                              <Badge key={param} variant="outline" className="text-xs">
                                {param}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{template.frequency}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleGenerateReport(template.id)}
                              disabled={isGenerating}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Reports */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Reports</CardTitle>
                <CardDescription>
                  Analyze teacher performance and staff management metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterTemplatesByCategory('staff').map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          {template.icon}
                          <CardTitle className="text-base">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {template.parameters.map((param) => (
                              <Badge key={param} variant="outline" className="text-xs">
                                {param}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{template.frequency}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleGenerateReport(template.id)}
                              disabled={isGenerating}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Reports */}
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Reports</CardTitle>
                <CardDescription>
                  Generate reports for Ministry of Education and exam council requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterTemplatesByCategory('compliance').map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          {template.icon}
                          <CardTitle className="text-base">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {template.parameters.map((param) => (
                              <Badge key={param} variant="outline" className="text-xs">
                                {param}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{template.frequency}</span>
                            <Badge variant="secondary" className="text-xs">
                              Official
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleGenerateReport(template.id)}
                              disabled={isGenerating}
                            >
                              <Globe className="h-4 w-4 mr-1" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Reports */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  View and download recently generated reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {report.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {report.lastGenerated}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(report.status)}
                              {report.status}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{report.format}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" disabled={report.status !== 'ready'}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={report.status !== 'ready'}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={report.status !== 'ready'}>
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
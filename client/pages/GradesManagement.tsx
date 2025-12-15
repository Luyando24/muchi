import { useState, useEffect } from 'react';
import {
  BarChart3,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Award,
  FileText,
  Calculator,
  Calendar,
  Users,
  BookOpen,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth, clearSession } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Api, Subject, Class } from '../../shared/api';

interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assessmentType: 'assignment' | 'test' | 'exam' | 'project' | 'quiz';
  assessmentName: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  term: string;
  academicYear: string;
  gradedDate: string;
  gradedBy: string;
  feedback?: string;
  status: 'draft' | 'published' | 'reviewed';
  createdAt: string;
  updatedAt: string;
}

interface GradeStats {
  totalGrades: number;
  averagePercentage: number;
  passRate: number;
  failRate: number;
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  subjectPerformance: {
    subject: string;
    average: number;
    count: number;
  }[];
  classPerformance: {
    class: string;
    average: number;
    count: number;
  }[];
}

interface Student {
  id: string;
  name: string;
  studentNumber: string;
  classId: string;
  className: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

export default function GradesManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [gradeStats, setGradeStats] = useState<GradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    assessmentType: 'assignment' as Grade['assessmentType'],
    assessmentName: '',
    marksObtained: '',
    totalMarks: '',
    term: '',
    academicYear: new Date().getFullYear().toString(),
    feedback: '',
    status: 'draft' as Grade['status']
  });

  // Mock data - replace with API calls
  // Load data from API
  useEffect(() => {
    if (user?.schoolId) {
      loadData();
    }
  }, [user?.schoolId]);

  const loadData = async () => {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const [gradesData, studentsData, subjectsData, classesData] = await Promise.all([
        Api.listTermGrades({ schoolId: user.schoolId }),
        Api.listStudents({ schoolId: user.schoolId }),
        Api.listSubjects(user.schoolId),
        Api.listClasses(user.schoolId)
      ]);

      // Map API grades to UI Grade interface
      const mappedGrades: Grade[] = gradesData.map((g: any) => ({
        id: g.id,
        studentId: g.student_id,
        studentName: `${g.student_first_name} ${g.student_last_name}`,
        studentNumber: 'N/A', // API might not return this in join, or add to query
        classId: g.class_id,
        className: 'N/A', // API join needed for class name?
        subjectId: g.subject_id,
        subjectName: g.subject_name,
        assessmentType: 'exam', // Default or need field in DB
        assessmentName: 'Term Assessment', // Default
        marksObtained: g.marks,
        totalMarks: 100, // Default
        percentage: g.marks, // Assuming marks is percentage or out of 100
        grade: g.grade,
        gradePoint: 0, // Calc
        term: g.term,
        academicYear: g.academic_year,
        gradedDate: g.created_at,
        gradedBy: 'Teacher',
        feedback: g.remarks,
        status: 'published', // Default
        createdAt: g.created_at,
        updatedAt: g.updated_at
      }));

      setGrades(mappedGrades);

      // Map students
      const mappedStudents: Student[] = studentsData.map((s: any) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        studentNumber: s.studentNumber || '',
        classId: s.classId || '',
        className: '' // Need class name join
      }));
      setStudents(mappedStudents);

      setSubjects(subjectsData);

      // Map classes
      const mappedClasses: Class[] = classesData.map((c: any) => ({
        id: c.id,
        name: c.className,
        grade: c.gradeLevel
      }));
      setClasses(mappedClasses);

      // Calculate stats
      calculateStats(mappedGrades);

      setLoading(false);
    } catch (error) {
      console.error("Failed to load grades data", error);
      setLoading(false);
    }
  };

  const calculateStats = (gradesList: Grade[]) => {
    if (gradesList.length === 0) {
      setGradeStats(null);
      return;
    }
    const total = gradesList.length;
    const totalPercentage = gradesList.reduce((acc, g) => acc + g.percentage, 0);
    const avg = totalPercentage / total;
    const passed = gradesList.filter(g => g.grade !== 'F').length;

    // Distribution
    const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    gradesList.forEach(g => {
      const l = g.grade.charAt(0) as keyof typeof dist;
      if (dist[l] !== undefined) dist[l]++;
    });

    setGradeStats({
      totalGrades: total,
      averagePercentage: avg,
      passRate: (passed / total) * 100,
      failRate: ((total - passed) / total) * 100,
      gradeDistribution: dist,
      subjectPerformance: [], // Todo: aggregate by subject
      classPerformance: [] // Todo: aggregate by class
    });
  };

  // Filter grades based on search and filters
  const filteredGrades = grades.filter(grade => {
    const matchesSearch = grade.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.assessmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || grade.classId === selectedClass;
    const matchesSubject = selectedSubject === 'all' || grade.subjectId === selectedSubject;
    const matchesTerm = selectedTerm === 'all' || grade.term === selectedTerm;
    const matchesAssessmentType = selectedAssessmentType === 'all' || grade.assessmentType === selectedAssessmentType;

    return matchesSearch && matchesClass && matchesSubject && matchesTerm && matchesAssessmentType;
  });

  // Calculate grade and percentage
  const calculateGrade = (marksObtained: number, totalMarks: number) => {
    const percentage = (marksObtained / totalMarks) * 100;
    let grade = 'F';
    let gradePoint = 0;

    if (percentage >= 90) {
      grade = 'A+';
      gradePoint = 4.0;
    } else if (percentage >= 80) {
      grade = 'A';
      gradePoint = 4.0;
    } else if (percentage >= 70) {
      grade = 'B';
      gradePoint = 3.0;
    } else if (percentage >= 60) {
      grade = 'C';
      gradePoint = 2.0;
    } else if (percentage >= 50) {
      grade = 'D';
      gradePoint = 1.0;
    }

    return { percentage, grade, gradePoint };
  };

  // Handle form submission
  const handleSubmit = () => {
    const marksObtained = parseFloat(formData.marksObtained);
    const totalMarks = parseFloat(formData.totalMarks);
    const student = students.find(s => s.id === formData.studentId);
    const subject = subjects.find(s => s.id === formData.subjectId);

    if (!student || !subject) return;

    const { percentage, grade, gradePoint } = calculateGrade(marksObtained, totalMarks);

    const newGrade: Grade = {
      id: Date.now().toString(),
      studentId: formData.studentId,
      studentName: student.name,
      studentNumber: student.studentNumber,
      classId: student.classId,
      className: student.className,
      subjectId: formData.subjectId,
      subjectName: subject.name,
      assessmentType: formData.assessmentType,
      assessmentName: formData.assessmentName,
      marksObtained,
      totalMarks,
      percentage,
      grade,
      gradePoint,
      term: formData.term,
      academicYear: formData.academicYear,
      gradedDate: new Date().toISOString().split('T')[0],
      gradedBy: user?.name || 'Unknown',
      feedback: formData.feedback,
      status: formData.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setGrades([...grades, newGrade]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      subjectId: '',
      assessmentType: 'assignment',
      assessmentName: '',
      marksObtained: '',
      totalMarks: '',
      term: '',
      academicYear: new Date().getFullYear().toString(),
      feedback: '',
      status: 'draft'
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-50';
      case 'B':
        return 'text-blue-600 bg-blue-50';
      case 'C':
        return 'text-yellow-600 bg-yellow-50';
      case 'D':
        return 'text-orange-600 bg-orange-50';
      case 'F':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Grades Management</h1>
              <p className="text-sm text-muted-foreground">Manage student grades and assessments</p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
              <Button variant="outline" onClick={() => setIsBulkEntryOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Entry
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="grades">Grades</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Grades</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{gradeStats?.totalGrades || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      +12% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{gradeStats?.averagePercentage.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      +2.1% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{gradeStats?.passRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      +5.2% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fail Rate</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{gradeStats?.failRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      -5.2% from last month
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Grade Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Grade Distribution</CardTitle>
                    <CardDescription>Distribution of grades across all assessments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gradeStats && Object.entries(gradeStats.gradeDistribution).map(([grade, count]) => (
                      <div key={grade} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getGradeColor(grade)}>{grade}</Badge>
                          <span className="text-sm">{count} students</span>
                        </div>
                        <Progress
                          value={(count / gradeStats.totalGrades) * 100}
                          className="w-24"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subject Performance</CardTitle>
                    <CardDescription>Average performance by subject</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gradeStats?.subjectPerformance.map((subject, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{subject.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{subject.average.toFixed(1)}%</span>
                          <Progress value={subject.average} className="w-20" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Grades Tab */}
            <TabsContent value="grades" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label>Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search students, subjects..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Term</Label>
                      <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Terms</SelectItem>
                          <SelectItem value="Term 1">Term 1</SelectItem>
                          <SelectItem value="Term 2">Term 2</SelectItem>
                          <SelectItem value="Term 3">Term 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assessment Type</Label>
                      <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="assignment">Assignment</SelectItem>
                          <SelectItem value="test">Test</SelectItem>
                          <SelectItem value="exam">Exam</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grades Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Grades ({filteredGrades.length})</CardTitle>
                  <CardDescription>Manage student grades and assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGrades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{grade.studentName}</div>
                              <div className="text-sm text-muted-foreground">{grade.studentNumber} • {grade.className}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{grade.subjectName}</div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{grade.assessmentName}</div>
                              <Badge variant="outline" className="text-xs">
                                {grade.assessmentType}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{grade.marksObtained}/{grade.totalMarks}</div>
                              <div className="text-sm text-muted-foreground">{grade.percentage.toFixed(1)}%</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getGradeColor(grade.grade)}>
                              {grade.grade}
                            </Badge>
                          </TableCell>
                          <TableCell>{grade.term}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(grade.status)}>
                              {grade.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
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

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Class Performance</CardTitle>
                    <CardDescription>Average performance by class</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gradeStats?.classPerformance.map((cls, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{cls.class}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{cls.average.toFixed(1)}%</span>
                          <Progress value={cls.average} className="w-20" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Assessment Types</CardTitle>
                    <CardDescription>Performance by assessment type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['assignment', 'test', 'exam', 'project', 'quiz'].map((type) => {
                        const typeGrades = grades.filter(g => g.assessmentType === type);
                        const average = typeGrades.length > 0
                          ? typeGrades.reduce((sum, g) => sum + g.percentage, 0) / typeGrades.length
                          : 0;

                        return (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium capitalize">{type}</span>
                              <span className="text-xs text-muted-foreground">({typeGrades.length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{average.toFixed(1)}%</span>
                              <Progress value={average} className="w-20" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Report Cards</CardTitle>
                    <CardDescription>Generate comprehensive report cards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report Cards
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Grade Analysis</CardTitle>
                    <CardDescription>Detailed grade analysis and trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analysis
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                    <CardDescription>Export grades in various formats</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Export CSV/PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>

      {/* Add Grade Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Grade</DialogTitle>
            <DialogDescription>
              Enter grade information for a student assessment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student">Student *</Label>
                <Select value={formData.studentId} onValueChange={(value) => setFormData({ ...formData, studentId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.studentNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subjectId} onValueChange={(value) => setFormData({ ...formData, subjectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assessmentType">Assessment Type *</Label>
                <Select value={formData.assessmentType} onValueChange={(value: Grade['assessmentType']) => setFormData({ ...formData, assessmentType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessmentName">Assessment Name *</Label>
                <Input
                  id="assessmentName"
                  value={formData.assessmentName}
                  onChange={(e) => setFormData({ ...formData, assessmentName: e.target.value })}
                  placeholder="e.g., Mid-term Exam"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marksObtained">Marks Obtained *</Label>
                <Input
                  id="marksObtained"
                  type="number"
                  value={formData.marksObtained}
                  onChange={(e) => setFormData({ ...formData, marksObtained: e.target.value })}
                  placeholder="e.g., 85"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalMarks">Total Marks *</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="term">Term *</Label>
                <Select value={formData.term} onValueChange={(value) => setFormData({ ...formData, term: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: Grade['status']) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                placeholder="Optional feedback for the student..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Add Grade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
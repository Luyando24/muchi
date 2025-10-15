import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar, 
  FileText, 
  BarChart3, 
  Users, 
  Clock, 
  Award, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  GraduationCap
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
import { Api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import type { Assignment, Grade, Subject, Class, Student } from '../../shared/api';

interface AssignmentFormData {
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  category: 'homework' | 'project' | 'test' | 'exam' | 'quiz';
  dueDate: string;
  totalMarks: number;
  instructions?: string;
}

interface GradeFormData {
  studentId: string;
  assignmentId: string;
  marksObtained: number;
  feedback?: string;
  gradedDate: string;
}

// Move AssignmentForm outside to prevent re-creation on every render
interface AssignmentFormProps {
  formData: AssignmentFormData;
  setFormData: (data: AssignmentFormData) => void;
  subjects: Subject[];
  classes: Class[];
}

const AssignmentForm = ({ formData, setFormData, subjects, classes }: AssignmentFormProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="title">Assignment Title *</Label>
      <Input
        id="title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Enter assignment title"
      />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="category">Category *</Label>
      <Select 
        value={formData.category} 
        onValueChange={(value: 'homework' | 'project' | 'test' | 'exam' | 'quiz') => 
          setFormData({ ...formData, category: value })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="homework">Homework</SelectItem>
          <SelectItem value="project">Project</SelectItem>
          <SelectItem value="test">Test</SelectItem>
          <SelectItem value="exam">Exam</SelectItem>
          <SelectItem value="quiz">Quiz</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="subjectId">Subject *</Label>
      <Select value={formData.subjectId} onValueChange={(value) => setFormData({ ...formData, subjectId: value })}>
        <SelectTrigger>
          <SelectValue placeholder="Select subject" />
        </SelectTrigger>
        <SelectContent>
          {(subjects || []).map(subject => (
            <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="classId">Class *</Label>
      <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
        <SelectTrigger>
          <SelectValue placeholder="Select class" />
        </SelectTrigger>
        <SelectContent>
          {(classes || []).map(cls => (
            <SelectItem key={cls.id} value={cls.id}>{cls.className}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="dueDate">Due Date *</Label>
      <Input
        id="dueDate"
        type="datetime-local"
        value={formData.dueDate}
        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
      />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="totalMarks">Total Marks *</Label>
      <Input
        id="totalMarks"
        type="number"
        value={formData.totalMarks}
        onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
        min="1"
      />
    </div>
    
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="description">Description *</Label>
      <Textarea
        id="description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Assignment description"
        rows={3}
      />
    </div>
    
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="instructions">Instructions</Label>
      <Textarea
        id="instructions"
        value={formData.instructions || ''}
        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
        placeholder="Detailed instructions for students"
        rows={4}
      />
    </div>
  </div>
);

export default function AcademicManagement() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  const [assignmentFormData, setAssignmentFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    subjectId: '',
    classId: '',
    category: 'homework',
    dueDate: '',
    totalMarks: 100,
    instructions: ''
  });

  const [gradeFormData, setGradeFormData] = useState<GradeFormData>({
    studentId: '',
    assignmentId: '',
    marksObtained: 0,
    feedback: '',
    gradedDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (session) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [session]);

  const loadData = async () => {
    if (!session?.schoolId) {
      console.log('No session or schoolId available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading academic data for school:', session.schoolId);
      
      // Load assignments
      const assignmentsResponse = await Api.listAssignments({
        schoolId: session?.schoolId,
        limit: 100
      });
      setAssignments(assignmentsResponse.items);
      
      // Load grades
      const gradesResponse = await Api.listGrades({
        schoolId: session?.schoolId,
        limit: 100
      });
      setGrades(gradesResponse.items);
      
      // Load subjects
      const subjectsResponse = await Api.listSubjects({
        schoolId: session?.schoolId
      });
      setSubjects(subjectsResponse.items);
      
      // Load classes
      const classesResponse = await Api.listClasses({
        schoolId: session?.schoolId
      });
      setClasses(classesResponse.items);
      
      // Load students
      const studentsResponse = await Api.listStudents({
        schoolId: session?.schoolId,
        limit: 100
      });
      setStudents(studentsResponse.items);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    try {
      const newAssignment = await Api.createAssignment({
        ...assignmentFormData,
        schoolId: session?.schoolId!,
        teacherId: session?.userId!,
        createdDate: new Date().toISOString(),
        isActive: true
      });
      
      setAssignments([...assignments, newAssignment]);
      setIsAssignmentDialogOpen(false);
      resetAssignmentForm();
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  const handleCreateGrade = async () => {
    try {
      const newGrade = await Api.createGrade({
        ...gradeFormData,
        schoolId: session?.schoolId!,
        teacherId: session?.userId!,
        percentage: (gradeFormData.marksObtained / getAssignmentTotalMarks(gradeFormData.assignmentId)) * 100
      });
      
      setGrades([...grades, newGrade]);
      setIsGradeDialogOpen(false);
      resetGradeForm();
    } catch (error) {
      console.error('Failed to create grade:', error);
    }
  };

  const getAssignmentTotalMarks = (assignmentId: string): number => {
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment?.totalMarks || 100;
  };

  const resetAssignmentForm = () => {
    setAssignmentFormData({
      title: '',
      description: '',
      subjectId: '',
      classId: '',
      category: 'homework',
      dueDate: '',
      totalMarks: 100,
      instructions: ''
    });
  };

  const resetGradeForm = () => {
    setGradeFormData({
      studentId: '',
      assignmentId: '',
      marksObtained: 0,
      feedback: '',
      gradedDate: new Date().toISOString().split('T')[0]
    });
  };

  const getSubjectName = (subjectId: string) => {
    return subjects?.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  };

  const getClassName = (classId: string) => {
    return classes?.find(c => c.id === classId)?.name || 'Unknown Class';
  };

  const getStudentName = (studentId: string) => {
    const student = students?.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
  };

  const getAssignmentStats = () => {
    const total = assignments?.length || 0;
    const overdue = assignments?.filter(a => new Date(a.dueDate) < new Date() && !a.isCompleted)?.length || 0;
    const completed = assignments?.filter(a => a.isCompleted)?.length || 0;
    const pending = total - completed;
    
    return { total, overdue, completed, pending };
  };

  const getGradeStats = () => {
    const totalGrades = grades?.length || 0;
    const averageGrade = grades?.length > 0 
      ? grades.reduce((sum, grade) => sum + grade.percentage, 0) / (grades?.length || 1)
      : 0;
    const passRate = grades?.length > 0 
      ? (grades?.filter(g => g.percentage >= 50)?.length / (grades?.length || 1)) * 100 
      : 0;
    
    return { totalGrades, averageGrade, passRate };
  };

  const filteredAssignments = (assignments || []).filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || assignment.subjectId === selectedSubject;
    const matchesClass = selectedClass === 'all' || assignment.classId === selectedClass;
    
    return matchesSearch && matchesSubject && matchesClass;
  });



  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    navigate('/login');
    return null;
  }

  const assignmentStats = getAssignmentStats();
  const gradeStats = getGradeStats();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Academic Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage assignments, assessments, and academic performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{session?.role}</Badge>
            <Badge variant="secondary">{session?.userId?.slice(0, 8) || 'USER-001'}</Badge>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Reports
            </Button>
          </div>
        </div>
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Assignments Overview</h2>
                <p className="text-sm text-muted-foreground">Track and manage academic assignments</p>
              </div>
              <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Assignment</DialogTitle>
                    <DialogDescription>
                      Create a new assignment for your students.
                    </DialogDescription>
                  </DialogHeader>
                  <AssignmentForm 
                    formData={assignmentFormData}
                    setFormData={setAssignmentFormData}
                    subjects={subjects || []}
                    classes={classes || []}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateAssignment}>
                      Create Assignment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignmentStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {assignmentStats.pending} pending
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{assignmentStats.overdue}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gradeStats.averageGrade.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Across all subjects
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gradeStats.passRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Students passing (≥50%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="gradebook">Grade Book</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assignments" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Management</CardTitle>
                <CardDescription>Create, manage, and track assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search assignments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {(subjects || []).map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {(classes || []).map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Assignments Table */}
            <Card>
              <CardHeader>
                <CardTitle>Assignments ({filteredAssignments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.title}</div>
                            <div className="text-sm text-muted-foreground">
                              <Badge variant="outline" className="mr-2">
                                {assignment.category}
                              </Badge>
                              {assignment.description.substring(0, 50)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getSubjectName(assignment.subjectId)}</TableCell>
                        <TableCell>{getClassName(assignment.classId)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(assignment.dueDate).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {new Date(assignment.dueDate).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{assignment.totalMarks}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(assignment.dueDate) < new Date() ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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
          
          <TabsContent value="gradebook" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Grade Book</CardTitle>
                    <CardDescription>Record and manage student grades</CardDescription>
                  </div>
                  <Button onClick={() => setIsGradeDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Grade
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Grade book interface will be implemented here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Academic Reports</CardTitle>
                <CardDescription>Generate comprehensive academic performance reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Academic reports interface will be implemented here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
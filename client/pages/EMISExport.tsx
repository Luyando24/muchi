import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Users,
  BookOpen,
  GraduationCap,
  Building,
  FileCheck,
  Clock,
  Globe
} from 'lucide-react';
import { Api } from '../../shared/api';

interface Student {
  id: string;
  name: string;
  // Add other student properties as needed
}

interface Teacher {
  id: string;
  name: string;
  // Add other teacher properties as needed
}

interface Class {
  id: string;
  name: string;
  // Add other class properties as needed
}

interface Subject {
  id: string;
  name: string;
  // Add other subject properties as needed
}

interface Attendance {
  id: string;
  status: string;
  // Add other attendance properties as needed
}

interface Grade {
  id: string;
  score: number;
  // Add other grade properties as needed
}

interface SchoolInfo {
  name: string;
  address: string;
  // Add other school info properties as needed
}

interface EMISExportData {
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
  attendance: Attendance[];
  grades: Grade[];
  school_info: SchoolInfo;
}

interface ExportStatus {
  status: 'idle' | 'preparing' | 'exporting' | 'completed' | 'error';
  progress: number;
  message: string;
  downloadUrl?: string;
}

export default function EMISExport() {
  const [exportData, setExportData] = useState<EMISExportData | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [selectedPeriod, setSelectedPeriod] = useState('current_term');
  const [schoolInfo, setSchoolInfo] = useState({
    school_code: '',
    school_name: '',
    district: '',
    province: '',
    school_type: 'primary',
    contact_person: '',
    phone: '',
    email: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadSchoolInfo();
  }, []);

  const loadSchoolInfo = async () => {
    try {
      // Load existing school information
      const info = await Api.getSchoolInfo();
      if (info) {
        setSchoolInfo(info);
      }
    } catch (error) {
      console.error('Failed to load school info:', error);
    }
  };

  const validateData = (): boolean => {
    const errors: string[] = [];
    
    if (!schoolInfo.school_code) errors.push('School EMIS code is required');
    if (!schoolInfo.school_name) errors.push('School name is required');
    if (!schoolInfo.district) errors.push('District is required');
    if (!schoolInfo.province) errors.push('Province is required');
    if (!schoolInfo.contact_person) errors.push('Contact person is required');
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const prepareExportData = async () => {
    if (!validateData()) return;

    setExportStatus({
      status: 'preparing',
      progress: 10,
      message: 'Preparing export data...'
    });

    try {
      // Fetch all required data
      setExportStatus(prev => ({ ...prev, progress: 20, message: 'Fetching student data...' }));
      const students = await Api.listStudents();
      
      setExportStatus(prev => ({ ...prev, progress: 40, message: 'Fetching teacher data...' }));
      const teachers = await Api.listTeachers();
      
      setExportStatus(prev => ({ ...prev, progress: 60, message: 'Fetching academic data...' }));
      const classes = await Api.listClasses();
      const subjects = await Api.listSubjects();
      
      setExportStatus(prev => ({ ...prev, progress: 80, message: 'Fetching attendance and grades...' }));
      const attendance = await Api.getAttendanceForPeriod(selectedPeriod);
      const grades = await Api.getGradesForPeriod(selectedPeriod);

      const exportData: EMISExportData = {
        students: students.map(student => ({
          emis_id: student.emisId,
          student_number: student.studentNumber,
          first_name: student.firstName,
          last_name: student.lastName,
          date_of_birth: student.dateOfBirth,
          gender: student.gender,
          grade_level: student.gradeLevel,
          enrollment_date: student.enrollmentDate,
          guardian_name: student.guardianName,
          guardian_phone: student.guardianPhone,
          address: student.address,
          special_needs: student.specialNeeds || false
        })),
        teachers: teachers.map(teacher => ({
          teacher_number: teacher.teacherNumber,
          first_name: teacher.firstName,
          last_name: teacher.lastName,
          qualification: teacher.qualification,
          subjects_taught: teacher.subjectsTaught,
          employment_date: teacher.employmentDate,
          phone: teacher.phone,
          email: teacher.email
        })),
        classes,
        subjects,
        attendance,
        grades,
        school_info: schoolInfo
      };

      setExportData(exportData);
      setExportStatus({
        status: 'prepared',
        progress: 100,
        message: 'Data prepared successfully. Ready for export.'
      });
    } catch (error) {
      setExportStatus({
        status: 'error',
        progress: 0,
        message: `Failed to prepare data: ${error.message}`
      });
    }
  };

  const exportToEMIS = async () => {
    if (!exportData) return;

    setExportStatus({
      status: 'exporting',
      progress: 0,
      message: 'Generating EMIS export file...'
    });

    try {
      // Generate EMIS-compliant XML/CSV format
      setExportStatus(prev => ({ ...prev, progress: 30, message: 'Formatting data for EMIS...' }));
      
      const emisData = {
        export_date: new Date().toISOString(),
        school_info: exportData.school_info,
        academic_year: new Date().getFullYear(),
        term: selectedPeriod,
        students: exportData.students,
        teachers: exportData.teachers,
        classes: exportData.classes,
        subjects: exportData.subjects,
        attendance_summary: generateAttendanceSummary(exportData.attendance),
        grade_summary: generateGradeSummary(exportData.grades)
      };

      setExportStatus(prev => ({ ...prev, progress: 60, message: 'Creating export file...' }));
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(emisData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      setExportStatus({
        status: 'completed',
        progress: 100,
        message: 'EMIS export completed successfully!',
        downloadUrl: url
      });

      // Also save export record
      await Api.saveExportRecord({
        export_type: 'EMIS',
        export_date: new Date().toISOString(),
        period: selectedPeriod,
        record_count: exportData.students.length + exportData.teachers.length
      });

    } catch (error) {
      setExportStatus({
        status: 'error',
        progress: 0,
        message: `Export failed: ${error.message}`
      });
    }
  };

  const generateAttendanceSummary = (attendance: Attendance[]) => {
    // Generate attendance statistics for EMIS
    const summary = attendance.reduce((acc, record) => {
      const key = `${record.studentId}_${record.date}`;
      acc[key] = {
        student_id: record.studentId,
        date: record.date,
        status: record.status,
        class_id: record.classId
      };
      return acc;
    }, {});
    
    return Object.values(summary);
  };

  const generateGradeSummary = (grades: Grade[]) => {
    // Generate grade statistics for EMIS
    return grades.map(grade => ({
      student_id: grade.studentId,
      subject_id: grade.subjectId,
      assessment_type: grade.assessmentType,
      score: grade.score,
      max_score: grade.maxScore,
      grade: grade.grade,
      term: grade.term,
      academic_year: grade.academicYear
    }));
  };

  const downloadExport = () => {
    if (exportStatus.downloadUrl) {
      const link = document.createElement('a');
      link.href = exportStatus.downloadUrl;
      link.download = `EMIS_Export_${schoolInfo.school_code}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            EMIS Export
          </h1>
          <p className="text-muted-foreground mt-2">
            Export school data to Education Management Information System (EMIS) for Ministry of Education compliance
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Ministry Compliant
        </Badge>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors:
            <ul className="list-disc list-inside mt-2">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="school-info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="school-info">School Information</TabsTrigger>
          <TabsTrigger value="export-data">Export Data</TabsTrigger>
          <TabsTrigger value="export-history">Export History</TabsTrigger>
        </TabsList>

        <TabsContent value="school-info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                School Information
              </CardTitle>
              <CardDescription>
                Configure school details required for EMIS compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school_code">EMIS School Code *</Label>
                  <Input
                    id="school_code"
                    value={schoolInfo.school_code}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, school_code: e.target.value }))}
                    placeholder="e.g., 12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school_name">School Name *</Label>
                  <Input
                    id="school_name"
                    value={schoolInfo.school_name}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, school_name: e.target.value }))}
                    placeholder="e.g., Lusaka Primary School"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    value={schoolInfo.district}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="e.g., Lusaka"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province *</Label>
                  <Select value={schoolInfo.province} onValueChange={(value) => setSchoolInfo(prev => ({ ...prev, province: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Central</SelectItem>
                      <SelectItem value="copperbelt">Copperbelt</SelectItem>
                      <SelectItem value="eastern">Eastern</SelectItem>
                      <SelectItem value="luapula">Luapula</SelectItem>
                      <SelectItem value="lusaka">Lusaka</SelectItem>
                      <SelectItem value="muchinga">Muchinga</SelectItem>
                      <SelectItem value="northern">Northern</SelectItem>
                      <SelectItem value="north-western">North-Western</SelectItem>
                      <SelectItem value="southern">Southern</SelectItem>
                      <SelectItem value="western">Western</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school_type">School Type</Label>
                  <Select value={schoolInfo.school_type} onValueChange={(value) => setSchoolInfo(prev => ({ ...prev, school_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary School</SelectItem>
                      <SelectItem value="secondary">Secondary School</SelectItem>
                      <SelectItem value="combined">Combined School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    id="contact_person"
                    value={schoolInfo.contact_person}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, contact_person: e.target.value }))}
                    placeholder="Head Teacher Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={schoolInfo.phone}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+260 XXX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={schoolInfo.email}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="school@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Export Configuration
              </CardTitle>
              <CardDescription>
                Configure and generate EMIS export data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Export Period</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_term">Current Term</SelectItem>
                      <SelectItem value="term_1">Term 1</SelectItem>
                      <SelectItem value="term_2">Term 2</SelectItem>
                      <SelectItem value="term_3">Term 3</SelectItem>
                      <SelectItem value="academic_year">Full Academic Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {exportStatus.status !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Export Progress</span>
                      <span className="text-sm text-muted-foreground">{exportStatus.progress}%</span>
                    </div>
                    <Progress value={exportStatus.progress} className="w-full" />
                    <p className="text-sm text-muted-foreground">{exportStatus.message}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    onClick={prepareExportData}
                    disabled={exportStatus.status === 'preparing' || exportStatus.status === 'exporting'}
                    className="flex items-center gap-2"
                  >
                    <FileCheck className="h-4 w-4" />
                    Prepare Export Data
                  </Button>
                  
                  {exportData && exportStatus.status === 'prepared' && (
                    <Button 
                      onClick={exportToEMIS}
                      disabled={exportStatus.status === 'exporting'}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Generate EMIS Export
                    </Button>
                  )}
                  
                  {exportStatus.status === 'completed' && exportStatus.downloadUrl && (
                    <Button 
                      onClick={downloadExport}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Export File
                    </Button>
                  )}
                </div>

                {exportStatus.status === 'completed' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      EMIS export completed successfully! The file is ready for submission to the Ministry of Education.
                    </AlertDescription>
                  </Alert>
                )}

                {exportStatus.status === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {exportStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {exportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">{exportData.students.length}</div>
                      <div className="text-sm text-muted-foreground">Students</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <GraduationCap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">{exportData.teachers.length}</div>
                      <div className="text-sm text-muted-foreground">Teachers</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold">{exportData.classes.length}</div>
                      <div className="text-sm text-muted-foreground">Classes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                      <div className="text-2xl font-bold">{exportData.subjects.length}</div>
                      <div className="text-sm text-muted-foreground">Subjects</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export-history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Export History
              </CardTitle>
              <CardDescription>
                View previous EMIS exports and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No export history available yet.</p>
                <p className="text-sm">Export records will appear here after your first EMIS export.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
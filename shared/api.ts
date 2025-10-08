/**
 * Shared types for the School Management System (SMS)
 */

export type UUID = string;
export type StudentNumber = string;
export type TeacherNumber = string;
export type NRC = string; // Zambian National Registration Card number
export type PassportNumber = string;
export type EMIS_ID = string; // Education Management Information System ID

export type UserRole =
  | "admin"
  | "headteacher"
  | "teacher"
  | "accountant"
  | "parent"
  | "student";

export interface School {
  id: UUID;
  name: string;
  code: string; // unique EMIS school code
  address: string;
  district?: string;
  province?: string;
  phone?: string;
  email?: string;
  headteacherId?: UUID; // teacher in charge
  schoolType: "primary" | "secondary" | "combined";
  isGovernment: boolean; // true for government schools, false for private
  emisId?: EMIS_ID; // Ministry of Education ID
  createdAt: string;
  updatedAt: string;
}

export interface Campus {
  id: UUID;
  schoolId: UUID;
  name: string;
  code: string; // unique short code per campus
  address: string;
  district?: string;
  province?: string;
  phone?: string;
  principalId?: UUID; // teacher in charge of campus
  isMainCampus?: boolean; // true if this is the main campus
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: UUID;
  schoolId?: UUID; // for school teachers
  campusId?: UUID; // for teachers at a specific campus
  email: string;
  passwordHash?: string; // never sent to clients
  role: Exclude<UserRole, "student" | "parent">;
  firstName: string;
  lastName: string;
  teacherNumber: TeacherNumber;
  qualification?: string;
  subjects?: string[]; // subjects they can teach
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: UUID;
  schoolId: UUID;
  campusId?: UUID;
  studentNumber: StudentNumber;
  emisId?: EMIS_ID; // Ministry of Education student ID
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  nrcNumber?: NRC;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  address?: string;
  district?: string;
  province?: string;
  currentGrade?: string;
  currentClass?: string;
  enrollmentDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: UUID;
  assignmentNumber: string;
  teacherId?: UUID; // assigned teacher
  classId: UUID;
  subjectId: UUID;
  title: string;
  description: string;
  category: "homework" | "project" | "test" | "exam" | "quiz" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "assigned" | "in_progress" | "submitted" | "graded" | "returned";
  dueDate?: string; // ISO datetime
  totalMarks?: number;
  relatedFiles?: string[]; // file URLs
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string; // short-lived JWT
  refreshToken?: string; // optional if using refresh flow
  expiresInSec: number;
}

export interface AuthSession {
  userId: UUID;
  role: UserRole;
  schoolId?: UUID; // for school users
  campusId?: UUID; // for users at a specific campus
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterTeacherRequest {
  schoolName?: string; // for school teachers
  campusName?: string; // for teachers at a specific campus
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  teacherNumber: TeacherNumber;
  qualification?: string;
  role?: Exclude<UserRole, "student" | "parent">; // default teacher
}

export interface RegisterTeacherResponse {
  userId: UUID;
  schoolId?: UUID;
  campusId?: UUID;
}

export interface DemoResponse {
  message: string;
}

// Additional School Management Interfaces

export interface Class {
  id: UUID;
  schoolId: UUID;
  campusId?: UUID;
  name: string; // e.g., "Grade 7A", "Form 1B"
  grade: string; // e.g., "7", "10", "12"
  section?: string; // e.g., "A", "B", "C"
  classTeacherId?: UUID; // main teacher for the class
  capacity?: number;
  currentEnrollment?: number;
  academicYear: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: UUID;
  schoolId: UUID;
  name: string; // e.g., "Mathematics", "English", "Science"
  code: string; // e.g., "MATH", "ENG", "SCI"
  description?: string;
  grade?: string; // specific grade or "all"
  isCore: boolean; // true for core subjects, false for electives
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: UUID;
  studentId: UUID;
  classId: UUID;
  schoolId: UUID;
  academicYear: string;
  enrollmentDate: string;
  status: "active" | "transferred" | "graduated" | "dropped";
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: UUID;
  studentId: UUID;
  classId: UUID;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
  recordedById: UUID; // teacher who recorded attendance
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: UUID;
  studentId: UUID;
  subjectId: UUID;
  classId: UUID;
  assignmentId?: UUID; // if grade is for a specific assignment
  examType?: "quiz" | "test" | "midterm" | "final" | "assignment" | "project";
  marks: number;
  totalMarks: number;
  percentage: number;
  grade?: string; // A, B, C, D, F or 1-9 scale
  term: string; // "Term 1", "Term 2", "Term 3"
  academicYear: string;
  gradedById: UUID; // teacher who graded
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: UUID;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  nrcNumber?: NRC;
  address?: string;
  occupation?: string;
  relationship: "father" | "mother" | "guardian" | "other";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentParent {
  id: UUID;
  studentId: UUID;
  parentId: UUID;
  isPrimary: boolean; // primary contact
  createdAt: string;
  updatedAt: string;
}

// EMIS Export interfaces
export interface EMISExportRecord {
  id: UUID;
  exportType: string;
  exportDate: string;
  period: string;
  recordCount: number;
  status: "pending" | "completed" | "failed";
  filePath?: string;
  createdAt: string;
}

export interface SchoolInfo {
  school_code: string;
  school_name: string;
  district: string;
  province: string;
  school_type: "primary" | "secondary" | "combined";
  contact_person: string;
  phone?: string;
  email?: string;
}

// API Class with all methods
export class Api {
  // Student methods
  static async listStudents(): Promise<Student[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async createStudent(student: Partial<Student>): Promise<Student> {
    // Implementation would create student
    return {} as Student;
  }

  static async updateStudent(id: UUID, student: Partial<Student>): Promise<Student> {
    // Implementation would update student
    return {} as Student;
  }

  static async deleteStudent(id: UUID): Promise<void> {
    // Implementation would delete student
  }

  // Teacher methods
  static async listTeachers(): Promise<Teacher[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async createTeacher(teacher: Partial<Teacher>): Promise<Teacher> {
    // Implementation would create teacher
    return {} as Teacher;
  }

  static async updateTeacher(id: UUID, teacher: Partial<Teacher>): Promise<Teacher> {
    // Implementation would update teacher
    return {} as Teacher;
  }

  static async deleteTeacher(id: UUID): Promise<void> {
    // Implementation would delete teacher
  }

  // Class methods
  static async listClasses(): Promise<Class[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async createClass(classData: Partial<Class>): Promise<Class> {
    // Implementation would create class
    return {} as Class;
  }

  static async updateClass(id: UUID, classData: Partial<Class>): Promise<Class> {
    // Implementation would update class
    return {} as Class;
  }

  static async deleteClass(id: UUID): Promise<void> {
    // Implementation would delete class
  }

  // Subject methods
  static async listSubjects(): Promise<Subject[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async createSubject(subject: Partial<Subject>): Promise<Subject> {
    // Implementation would create subject
    return {} as Subject;
  }

  static async updateSubject(id: UUID, subject: Partial<Subject>): Promise<Subject> {
    // Implementation would update subject
    return {} as Subject;
  }

  static async deleteSubject(id: UUID): Promise<void> {
    // Implementation would delete subject
  }

  // Assignment methods
  static async listAssignments(): Promise<Assignment[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async getAssignmentStats(): Promise<any> {
    // Implementation would get assignment statistics
    return {};
  }

  static async createAssignment(assignment: Partial<Assignment>): Promise<Assignment> {
    // Implementation would create assignment
    return {} as Assignment;
  }

  static async updateAssignment(id: UUID, assignment: Partial<Assignment>): Promise<Assignment> {
    // Implementation would update assignment
    return {} as Assignment;
  }

  static async deleteAssignment(id: UUID): Promise<void> {
    // Implementation would delete assignment
  }

  // Attendance methods
  static async listAttendance(): Promise<Attendance[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async getAttendanceForPeriod(period: string): Promise<Attendance[]> {
    // Implementation would fetch attendance for specific period
    return [];
  }

  static async markAttendance(attendance: Partial<Attendance>): Promise<Attendance> {
    // Implementation would mark attendance
    return {} as Attendance;
  }

  static async bulkMarkAttendance(attendanceRecords: Partial<Attendance>[]): Promise<Attendance[]> {
    // Implementation would mark bulk attendance
    return [];
  }

  // Grade methods
  static async listGrades(): Promise<Grade[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async getGradesForPeriod(period: string): Promise<Grade[]> {
    // Implementation would fetch grades for specific period
    return [];
  }

  static async createGrade(grade: Partial<Grade>): Promise<Grade> {
    // Implementation would create grade
    return {} as Grade;
  }

  static async updateGrade(id: UUID, grade: Partial<Grade>): Promise<Grade> {
    // Implementation would update grade
    return {} as Grade;
  }

  static async deleteGrade(id: UUID): Promise<void> {
    // Implementation would delete grade
  }

  // Parent methods
  static async listParents(): Promise<Parent[]> {
    // Implementation would fetch from backend
    return [];
  }

  static async createParent(parent: Partial<Parent>): Promise<Parent> {
    // Implementation would create parent
    return {} as Parent;
  }

  static async updateParent(id: UUID, parent: Partial<Parent>): Promise<Parent> {
    // Implementation would update parent
    return {} as Parent;
  }

  static async deleteParent(id: UUID): Promise<void> {
    // Implementation would delete parent
  }

  // EMIS methods
  static async getSchoolInfo(): Promise<SchoolInfo | null> {
    // Implementation would fetch school information
    return null;
  }

  static async saveSchoolInfo(info: SchoolInfo): Promise<SchoolInfo> {
    // Implementation would save school information
    return info;
  }

  static async saveExportRecord(record: Partial<EMISExportRecord>): Promise<EMISExportRecord> {
    // Implementation would save export record
    return {} as EMISExportRecord;
  }

  static async getExportHistory(): Promise<EMISExportRecord[]> {
    // Implementation would fetch export history
    return [];
  }

  // Finance methods
  static async getFinanceStats(): Promise<any> {
    // Implementation would get finance statistics
    return {};
  }

  static async listInvoices(): Promise<any[]> {
    // Implementation would fetch invoices
    return [];
  }

  static async createInvoice(invoice: any): Promise<any> {
    // Implementation would create invoice
    return {};
  }

  static async processPayment(payment: any): Promise<any> {
    // Implementation would process payment
    return {};
  }

  // Communication methods
  static async sendMessage(message: any): Promise<any> {
    // Implementation would send message
    return {};
  }

  static async getMessages(): Promise<any[]> {
    // Implementation would fetch messages
    return [];
  }

  // Report methods
  static async generateReport(type: string, params: any): Promise<any> {
    // Implementation would generate report
    return {};
  }

  static async exportToEMIS(data: any): Promise<string> {
    // Implementation would export to EMIS format
    return "";
  }
}

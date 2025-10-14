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
  | "student"
  | "superadmin";

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
  studentId?: UUID; // for student users
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface StudentLoginRequest {
  studentId: string;
}

export interface StudentAlternativeLoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterStaffRequest {
  schoolName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Exclude<UserRole, "student" | "parent">; // default admin
}

export interface RegisterStaffResponse {
  userId: UUID;
  schoolId: UUID;
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

export interface Invoice {
  // Define invoice properties
}

export interface Payment {
  // Define payment properties
}

export interface Message {
  // Define message properties
}

export interface ReportParams {
  // Define report params properties
}

// API Class with all methods
export class Api {
  // Student methods
  static async listStudents(params?: { schoolId?: UUID; campusId?: UUID; grade?: string; isActive?: boolean }): Promise<Student[]> {
    const queryParams = new URLSearchParams();
    if (params?.schoolId) queryParams.append('schoolId', params.schoolId);
    if (params?.campusId) queryParams.append('campusId', params.campusId);
    if (params?.grade) queryParams.append('grade', params.grade);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    
    const response = await fetch(`/api/students?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch students');
    const data = await response.json();
    return data.students;
  }

  static async getStudent(id: UUID): Promise<Student> {
    const response = await fetch(`/api/students/${id}`);
    if (!response.ok) throw new Error('Failed to fetch student');
    const data = await response.json();
    return data.student;
  }

  static async createStudent(student: Partial<Student>): Promise<Student> {
    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    if (!response.ok) throw new Error('Failed to create student');
    const data = await response.json();
    return data.student;
  }

  static async updateStudent(id: UUID, student: Partial<Student>): Promise<Student> {
    const response = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    if (!response.ok) throw new Error('Failed to update student');
    const data = await response.json();
    return data.student;
  }

  static async deleteStudent(id: UUID): Promise<void> {
    const response = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete student');
  }

  static async searchStudents(params: { query?: string; studentNumber?: string; nrcNumber?: string; schoolId?: UUID }): Promise<Student[]> {
    const response = await fetch('/api/students/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to search students');
    const data = await response.json();
    return data.students;
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
    return {
      totalRevenue: 125000,
      pendingPayments: 45000,
      overduePayments: 12000,
      collectionRate: 87.5,
      monthlyRevenue: [10000, 12000, 15000, 18000, 20000, 22000],
      paymentMethods: [
        { method: 'Mobile Money', amount: 75000, count: 150 },
        { method: 'Bank Transfer', amount: 35000, count: 45 },
        { method: 'Cash', amount: 15000, count: 80 }
      ]
    };
  }

  static async listInvoices(): Promise<any[]> {
    // Implementation would fetch invoices
    return [
      {
        id: '1',
        invoiceNumber: 'INV-2024-001',
        studentId: '1',
        studentName: 'John Mwanza',
        class: 'Grade 10A',
        amount: 2500,
        dueDate: '2024-02-15',
        status: 'pending',
        items: [
          { id: '1', description: 'Tuition Fee', quantity: 1, unitPrice: 2000, total: 2000, category: 'tuition' },
          { id: '2', description: 'Books', quantity: 1, unitPrice: 500, total: 500, category: 'books' }
        ],
        createdDate: '2024-01-15'
      },
      {
        id: '2',
        invoiceNumber: 'INV-2024-002',
        studentId: '2',
        studentName: 'Mary Banda',
        class: 'Grade 11B',
        amount: 2800,
        dueDate: '2024-02-10',
        status: 'paid',
        items: [
          { id: '3', description: 'Tuition Fee', quantity: 1, unitPrice: 2200, total: 2200, category: 'tuition' },
          { id: '4', description: 'Transport', quantity: 1, unitPrice: 600, total: 600, category: 'transport' }
        ],
        createdDate: '2024-01-10',
        paidDate: '2024-02-08',
        paymentMethod: 'mobile_money'
      }
    ];
  }

  static async listPayments(): Promise<any[]> {
    // Implementation would fetch payments
    return [
      {
        id: '1',
        invoiceId: '2',
        amount: 2800,
        method: 'mobile_money',
        reference: 'MM240208001',
        status: 'completed',
        date: '2024-02-08',
        notes: 'Payment via MTN Mobile Money'
      },
      {
        id: '2',
        invoiceId: '3',
        amount: 1500,
        method: 'bank_transfer',
        reference: 'BT240210001',
        status: 'pending',
        date: '2024-02-10',
        notes: 'Bank transfer pending verification'
      }
    ];
  }

  static async listFeeStructures(): Promise<any[]> {
    // Implementation would fetch fee structures
    return [
      {
        id: '1',
        grade: 'Grade 8',
        term: 'Term 1',
        tuitionFee: 1800,
        booksFee: 400,
        uniformFee: 300,
        transportFee: 500,
        mealsFee: 600,
        activitiesFee: 200,
        totalFee: 3800
      },
      {
        id: '2',
        grade: 'Grade 9',
        term: 'Term 1',
        tuitionFee: 2000,
        booksFee: 450,
        uniformFee: 300,
        transportFee: 500,
        mealsFee: 600,
        activitiesFee: 250,
        totalFee: 4100
      },
      {
        id: '3',
        grade: 'Grade 10',
        term: 'Term 1',
        tuitionFee: 2200,
        booksFee: 500,
        uniformFee: 350,
        transportFee: 600,
        mealsFee: 700,
        activitiesFee: 300,
        totalFee: 4650
      }
    ];
  }

  static async createInvoice(invoice: Invoice): Promise<Invoice> {
    // Implementation would create invoice
    return {} as Invoice;
  }

  static async processPayment(payment: Payment): Promise<Payment> {
    // Implementation would process payment
    return {} as Payment;
  }

  // Communication methods
  static async sendMessage(message: Message): Promise<Message> {
    // Implementation would send message
    return {} as Message;
  }

  static async getMessages(): Promise<Message[]> {
    // Implementation would fetch messages
    return [];
  }

  // Report methods
  static async generateReport(type: string, params: ReportParams): Promise<any> {
    // Implementation would generate report
    return {};
  }

  static async exportToEMIS(data: any): Promise<string> {
    // Implementation would export to EMIS format
    return "";
  }
}

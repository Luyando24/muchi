// Shared API Types and Interfaces

// Generic Response Wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface ApiError {
  message: string;
  code?: string;
  status: 'error';
}

// --- Auth Types ---
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'school_admin' | 'system_admin';
  school?: string;
  avatar?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// --- School Types ---
export interface School {
  id: string;
  name: string;
  slug?: string;
  plan: 'Standard' | 'Premium' | 'Enterprise';
  students: number;
  status: 'Active' | 'Suspended' | 'Pending';
  renewalDate: string;
  logo?: string;
  // Settings
  academic_year?: string;
  current_term?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  signature_url?: string;
  seal_url?: string;
}

// --- Student Types ---
export interface Student {
  id: string;
  name: string;
  grade: string;
  gender: 'Male' | 'Female';
  guardian: string;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  status: 'Active' | 'Inactive';
  schoolId: string;
}

// --- Teacher Types ---
export interface Teacher {
  id: string;
  name: string;
  subject: string;
  classes: string[];
  status: 'Active' | 'On Leave';
  schoolId: string;
}

// --- Infrastructure Types ---
export interface ServerNode {
  name: string;
  region: string;
  cpu: number;
  memory: number;
  disk: number;
  status: 'Operational' | 'Warning' | 'Critical';
}

// --- School Dashboard Types ---
export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority?: 'High' | 'Normal' | 'Low';
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface SchoolDashboardStats {
  overview: {
    totalStudents: { value: number; trend: string; status: 'up' | 'down' };
    totalTeachers: { value: number; trend: string; status: 'up' | 'down' };
    revenue: { value: string; trend: string; status: 'up' | 'down' };
    attendanceRate: { value: string; trend: string; status: 'up' | 'down' };
  };
  recentActivities: {
    id: string | number;
    user: string;
    action: string;
    time: string;
    type: 'academic' | 'finance' | 'admin' | 'system';
  }[];
  financialSummary: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  pendingApprovals: {
    id: string | number;
    type: string;
    applicant: string;
    department: string;
    date: string;
    status: string;
  }[];
  announcements: Announcement[];
  academicPerformance: {
    term: string;
    average: number;
  }[];
  enrollmentDistribution: {
    grade: string;
    count: number;
  }[];
  financeTrends: {
    month: string;
    income: number;
    expense: number;
  }[];
}

// --- Finance Types ---
export interface FinanceRecord {
  id: string;
  school_id?: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  term?: string;
  academic_year?: string;
  created_at?: string;
  // status: 'Completed' | 'Pending'; // Not in current DB schema, can be added later
}

export interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

// --- Report Types ---
export interface Report {
  id: string;
  school_id?: string;
  title: string;
  type: 'Academic' | 'Financial' | 'Student' | 'Staff' | 'System';
  generated_by?: string;
  status: 'Ready' | 'Processing' | 'Failed';
  file_url?: string;
  created_at: string;
  size?: string; // Optional: for display purposes
  academic_year?: string;
  term?: string;
}

// --- Calendar Types ---
export interface CalendarEvent {
  id: string;
  school_id?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  type: 'Academic' | 'Administrative' | 'Staff' | 'Extracurricular' | 'Holiday' | 'Other';
  location: string;
  created_by?: string;
  created_at?: string;
}

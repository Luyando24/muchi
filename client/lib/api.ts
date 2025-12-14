import { db } from "./db";
import { sha256Hex } from "./crypto";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "./utils";
import {
  AuthResponse,
  CreateStudentRequest,
  CreateStudentResponse,
  ListStudentsResponse,
  CreateTaskRequest,
  CreateTaskResponse,
  ListTasksResponse,
  LoginRequest,
  School,
  SchoolUser,
  AuthSession,
  Assignment,
  Subject,
  Class,
  Student,
  Grade,
} from "@shared/api";
import Dexie from "dexie";
import {
  NetworkError,
  AuthError,
  validateStudentData,
} from "./errors";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    });

    if (!res.ok) {
      let rawText = "";
      try {
        rawText = await res.text();
      } catch (_) {
        // ignore
      }

      // Attempt to parse JSON error body
      let parsed: any = null;
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch (_) {
          parsed = null;
        }
      }

      const message = (parsed && (parsed.error || parsed.message || parsed.details))
        || rawText
        || `HTTP ${res.status}`;

      if (res.status === 401) {
        throw new AuthError(message || "Authentication failed");
      }

      const err: any = new Error(message);
      err.status = res.status;
      err.body = rawText;
      err.data = parsed;
      throw err;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError("Unable to connect to server");
    }
    throw error;
  }
}

export const Api = {
  // Generic HTTP methods
  async get<T>(path: string): Promise<T> {
    return http<T>(path);
  },
  
  async post<T>(path: string, data?: any): Promise<T> {
    return http<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  async put<T>(path: string, data?: any): Promise<T> {
    return http<T>(path, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  async delete<T>(path: string): Promise<T> {
    return http<T>(path, {
      method: "DELETE",
    });
  },

  async login(payload: LoginRequest & { userType?: string }): Promise<AuthSession> {
    if (USE_MOCK) return mock.login(payload);
    return http<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  
  async createTask(payload: CreateTaskRequest): Promise<CreateTaskResponse> {
    if (USE_MOCK) return mock.createTask(payload);
    return http<CreateTaskResponse>("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async listTasks(assigneeId?: string): Promise<ListTasksResponse> {
    if (USE_MOCK) return mock.listTasks(assigneeId);
    const url = assigneeId ? `/tasks?assigneeId=${assigneeId}` : '/tasks';
    return http<ListTasksResponse>(url);
  },
  async getSchoolById(schoolId: string): Promise<School> {
    return http<School>(`/schools/${schoolId}`);
  },
  
  async getClassStats(): Promise<{
    total: number;
    active: number;
    gradeLevels: number;
    subjects: number;
    averageEnrollment: number;
    totalEnrollment: number;
    averageCapacity: number;
    totalCapacity: number;
  }> {
    return http<any>('/classes/stats');
  },

  // Assignments
  async listAssignments(params?: {
    schoolId?: string;
    classId?: string;
    subjectId?: string;
    teacherId?: string;
    status?: Assignment["status"];
    category?: Assignment["category"];
    limit?: number;
  }): Promise<{ items: Assignment[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (params?.classId) query.set("classId", params.classId);
    if (params?.subjectId) query.set("subjectId", params.subjectId);
    if (params?.teacherId) query.set("teacherId", params.teacherId);
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.limit) query.set("limit", String(params.limit));
    const url = `/assignments${query.toString() ? `?${query.toString()}` : ''}`;
    const items = await http<Assignment[]>(url);
    return { items };
  },
  async getAssignmentStats(params?: { schoolId?: string }): Promise<{ total: number; overdue: number; completed: number; pending: number }> {
    const url = params?.schoolId ? `/assignments/stats?schoolId=${params.schoolId}` : '/assignments/stats';
    return http(url);
  },
  async createAssignment(payload: Partial<Assignment> & { schoolId: string; teacherId?: string; instructions?: string }): Promise<Assignment> {
    return http<Assignment>("/assignments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async updateAssignment(id: string, payload: Partial<Assignment> & { instructions?: string }): Promise<Assignment> {
    return http<Assignment>(`/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async deleteAssignment(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/assignments/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      let raw = '';
      try { raw = await res.text(); } catch (_) {}
      throw new Error(raw || `HTTP ${res.status}`);
    }
  },

  // Subjects
  async listSubjects(params?: { schoolId?: string; isActive?: boolean }): Promise<{ items: Subject[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (typeof params?.isActive === 'boolean') query.set("isActive", String(params.isActive));
    const url = `/subjects${query.toString() ? `?${query.toString()}` : ''}`;
    const items = await http<Subject[]>(url);
    return { items };
  },

  // Classes
  async listClasses(params?: { schoolId?: string; gradeLevel?: string; subject?: string; teacherId?: string; academicYear?: string }): Promise<{ items: Class[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (params?.gradeLevel) query.set("gradeLevel", params.gradeLevel);
    if (params?.subject) query.set("subject", params.subject);
    if (params?.teacherId) query.set("teacherId", params.teacherId);
    if (params?.academicYear) query.set("academicYear", params.academicYear);
    const url = `/classes${query.toString() ? `?${query.toString()}` : ''}`;
    const items = await http<Class[]>(url);
    return { items };
  },

  // Students
  async listStudents(params?: { schoolId?: string; campusId?: string; grade?: string; isActive?: boolean; limit?: number }): Promise<{ items: Student[] }> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.set("schoolId", params.schoolId);
    if (params?.campusId) query.set("campusId", params.campusId);
    if (params?.grade) query.set("grade", params.grade);
    if (typeof params?.isActive === 'boolean') query.set("isActive", String(params.isActive));
    if (params?.limit) query.set("limit", String(params.limit));
    const url = `/students${query.toString() ? `?${query.toString()}` : ''}`;
    const resp = await http<{ students: Student[] }>(url);
    return { items: resp.students };
  },

  // Grades (no backend available yet) — provide safe stubs
  async listGrades(): Promise<{ items: Grade[] }> {
    return { items: [] };
  },
  async createGrade(grade: Partial<Grade>): Promise<Grade> {
    const now = new Date().toISOString();
    const totalMarks = grade.totalMarks ?? 100;
    const percentage = grade.marks && totalMarks ? Math.round((grade.marks / totalMarks) * 100) : 0;
    return {
      id: uuidv4(),
      studentId: grade.studentId!,
      subjectId: grade.subjectId!,
      classId: grade.classId!,
      assignmentId: grade.assignmentId,
      examType: grade.examType ?? "assignment",
      marks: grade.marks ?? 0,
      totalMarks,
      percentage,
      grade: grade.grade,
      term: grade.term ?? "Term 1",
      academicYear: grade.academicYear ?? new Date().getFullYear().toString(),
      gradedById: grade.gradedById ?? "",
      createdAt: now,
      updatedAt: now,
    };
  },

  async registerSchool(payload: {
    schoolName: string;
    schoolType: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: string;
  }): Promise<{ userId: string; schoolId: string }> {
    if (USE_MOCK) return mock.registerSchool(payload);
    return http<{ userId: string; schoolId: string }>("/auth/register-school", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// Lightweight in-browser mock for development and offline demo
import QRCode from "qrcode";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 20);
}

function generateNationalCardId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const mock = {
  async login({ email, password, userType }: LoginRequest & { userType?: string }): Promise<AuthSession> {
    const user = await db.staffUsers.where({ email }).first();
    if (!user) throw new Error("Account not found. Please register.");
    const hash = await sha256Hex(password);
    if (user.passwordHash !== hash) throw new Error("Invalid credentials");
    
    // Determine role based on userType if provided
    const role = userType ? userType : user.role;
    
    return {
      userId: user.id,
      role: role,
      schoolId: user.schoolId,
      tokens: { accessToken: uuidv4(), expiresInSec: 3600 },
     };
  },
  async registerSchool(payload: {
    schoolName: string;
    schoolType: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: string;
  }): Promise<{ userId: string; schoolId: string }> {
    const existing = await db.schoolUsers
      .where({ email: payload.email })
      .first();
    if (existing) throw new Error("Email already registered");
    
    const now = new Date().toISOString();
    
    // Create school
    const schoolId = uuidv4();
    const school = {
      id: schoolId,
      name: payload.schoolName,
      type: payload.schoolType,
      code: slugify(payload.schoolName),
      address: "",
      phone: payload.phoneNumber,
      createdAt: now,
      updatedAt: now,
    };
    await db.schools.put(school);
    
    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      schoolId,
      email: payload.email,
      passwordHash: await sha256Hex(payload.password),
      role: payload.role || "admin",
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.staffUsers.put(user);
    
    return { userId, schoolId };
  },
  async createTask(req: CreateTaskRequest): Promise<CreateTaskResponse> {
    const now = new Date().toISOString();
    const taskRecord = {
      id: uuidv4(),
      assigneeId: req.assigneeId,
      schoolId: req.schoolId,
      taskNumber: `TASK-${Date.now()}`,
      title: req.title,
      description: req.description,
      category: req.category,
      priority: req.priority,
      status: "assigned" as const,
      createdAt: now,
      updatedAt: now,
    };
    await db.tasks.put(taskRecord);
    return { task: taskRecord };
  },
  async listTasks(assigneeId?: string): Promise<ListTasksResponse> {
    let query = db.tasks.orderBy('updatedAt').reverse();
    if (assigneeId) {
      query = db.tasks.where({ assigneeId }).reverse().sortBy('updatedAt');
    }
    const items = await query.toArray();
    return { items };
  },
};
export async function enqueueSync(op: Parameters<typeof db.syncQueue.add>[0]) {
  await db.syncQueue.add(op as any);
}

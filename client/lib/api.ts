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
      const text = await res.text();
      if (res.status === 401) {
        throw new AuthError(text || "Authentication failed");
      }
      throw new Error(text || `HTTP ${res.status}`);
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

  async registerPersonnel(
    payload: RegisterPersonnelRequest,
  ): Promise<RegisterPersonnelResponse> {
    // This function is deprecated - military personnel registration removed
    throw new Error("Military personnel registration is no longer supported");
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

async function createCardQr(resident: Resident): Promise<string> {
  // In production, backend signs payload; here we encode opaque data for demo only
  return QRCode.toDataURL(JSON.stringify({ cardId: resident.cardId }));
}

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

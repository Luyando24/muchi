import { db } from "./db";
import Dexie from "dexie";
import {
  NetworkError,
  AuthError,
  validatePersonnelData,
} from "./errors";
import type {
  AuthSession,
  CreateTaskRequest,
  CreateTaskResponse,
  ListTasksResponse,
  LoginRequest,
  RegisterPersonnelRequest,
  RegisterPersonnelResponse,
  MilitaryUnit,
  MilitaryBase,
  Personnel,
} from "@shared/api";

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
  async login(payload: LoginRequest): Promise<AuthSession> {
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
  async registerPersonnel(
    payload: RegisterPersonnelRequest,
  ): Promise<RegisterPersonnelResponse> {
    validatePersonnelData({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
    });
    if (USE_MOCK) return mock.registerPersonnel(payload);
    return http<RegisterPersonnelResponse>("/auth/register-personnel", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// Lightweight in-browser mock for development and offline demo
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";

async function createCardQr(resident: Resident): Promise<string> {
  // In production, backend signs payload; here we encode opaque data for demo only
  return QRCode.toDataURL(JSON.stringify({ cardId: resident.cardId }));
}

import { sha256Hex } from "@/lib/crypto";

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
  async login({ email, password }: LoginRequest): Promise<AuthSession> {
    const user = await db.personnel.where({ email }).first();
    if (!user) throw new Error("Account not found. Please register.");
    const hash = await sha256Hex(password);
    if (user.passwordHash !== hash) throw new Error("Invalid credentials");
    return {
      userId: user.id,
      role: user.role,
      unitId: user.unitId,
      baseId: user.baseId,
      tokens: { accessToken: uuidv4(), expiresInSec: 3600 },
     };
  },
  async registerPersonnel(
    payload: RegisterPersonnelRequest,
  ): Promise<RegisterPersonnelResponse> {
    const existing = await db.personnel
      .where({ email: payload.email })
      .first();
    if (existing) throw new Error("Email already registered");
    
    const now = new Date().toISOString();
    let unitId: string | undefined;
    let baseId: string | undefined;
    
    if (payload.unitName) {
      let unit = await db.militaryUnits
        .where({ name: payload.unitName })
        .first();
      if (!unit) {
        unit = {
          id: uuidv4(),
          name: payload.unitName!,
          code: slugify(payload.unitName!),
          address: "",
          createdAt: now,
          updatedAt: now,
        } as MilitaryUnit;
        await db.militaryUnits.put(unit);
      }
      unitId = unit.id;
    } else if (payload.baseName) {
      let base = await db.militaryBases
        .where({ name: payload.baseName })
        .first();
      if (!base) {
        base = {
          id: uuidv4(),
          name: payload.baseName!,
          code: slugify(payload.baseName!),
          address: "",
          createdAt: now,
          updatedAt: now,
        } as MilitaryBase;
        await db.militaryBases.put(base);
      }
      baseId = base.id;
    }
    
    const user: Personnel = {
      id: uuidv4(),
      unitId,
      baseId,
      email: payload.email,
      passwordHash: await sha256Hex(payload.password),
      role: payload.role || "personnel",
      firstName: payload.firstName,
      lastName: payload.lastName,
      serviceNumber: payload.serviceNumber,
      rank: payload.rank,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.personnel.put(user);
    return { userId: user.id, unitId, baseId };
  },
  async createTask(req: CreateTaskRequest): Promise<CreateTaskResponse> {
    const now = new Date().toISOString();
    const taskRecord = {
      id: uuidv4(),
      assigneeId: req.assigneeId,
      unitId: req.unitId,
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

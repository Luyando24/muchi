import { useEffect, useState } from "react";
import type { AuthSession } from "@shared/api";

const KEY = "ipims_auth_session";

export function saveSession(s: AuthSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("auth:changed"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("auth:changed"));
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(getSession());
  useEffect(() => {
    const onStorage = () => setSession(getSession());
    const onCustom = () => setSession(getSession());
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onCustom as EventListener);
    };
  }, []);
  return { session, setSession } as const;
}

// Role-based helper functions for School Management System
export function isSchoolAdmin(session: AuthSession | null): boolean {
  return session?.role === 'admin' || session?.role === 'super_admin';
}

export function isTeacher(session: AuthSession | null): boolean {
  return session?.role === 'teacher' || isSchoolAdmin(session);
}

export function isParent(session: AuthSession | null): boolean {
  return session?.role === 'parent';
}

export function isStudent(session: AuthSession | null): boolean {
  return session?.role === 'student';
}

export function isHeadteacher(session: AuthSession | null): boolean {
  return session?.role === 'headteacher';
}

export function isAccountant(session: AuthSession | null): boolean {
  return session?.role === 'accountant';
}

export function canAccessAcademicPortal(session: AuthSession | null): boolean {
  return isTeacher(session) || isSchoolAdmin(session) || isHeadteacher(session);
}

// Dashboard Module Access Control
export function canAccessStudentManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessTeacherManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session);
}

export function canAccessAcademicManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessClassesManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessSubjectsManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessAttendanceTracking(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessGradesManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessTimetableManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessFinanceManagement(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isAccountant(session);
}

export function canAccessCommunications(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

export function canAccessReports(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isAccountant(session);
}

export function canAccessSchoolSettings(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session);
}

export function canAccessEMISExport(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session);
}

export function canAccessParentPortal(session: AuthSession | null): boolean {
  return isSchoolAdmin(session) || isHeadteacher(session) || isTeacher(session);
}

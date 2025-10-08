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

// Role-based helper functions for IPIMS - TESTING MODE: ALL ACCESS GRANTED
export function isMilitaryPersonnel(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function isImmigrationOfficer(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function isSupervisor(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function isAdmin(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function isAuditor(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function isResident(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function canAccessMilitaryPortal(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function canAccessImmigrationPortal(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function canManageCases(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function canManagePermits(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function canAccessAuditLogs(session: AuthSession | null): boolean {
  return true; // Testing: Allow all access
}

export function getOfficerStation(session: AuthSession | null): string | null {
  return session?.stationId || null;
}

export function getOfficerImmigrationOffice(session: AuthSession | null): string | null {
  return session?.immigrationOfficeId || null;
}

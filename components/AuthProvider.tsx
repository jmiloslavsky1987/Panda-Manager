"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { SessionExpiredModal } from "./SessionExpiredModal";

interface AuthContextValue {
  triggerSessionExpired: () => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Stable reference for fetchWithAuth to call without importing React hooks
let _triggerSessionExpired: (() => void) | null = null;
export function getAuthContext() {
  return _triggerSessionExpired ? { triggerSessionExpired: _triggerSessionExpired } : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionExpired, setSessionExpired] = useState(false);
  const triggerSessionExpired = useCallback(() => setSessionExpired(true), []);
  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  // Keep stable ref for fetchWithAuth utility
  _triggerSessionExpired = triggerSessionExpired;

  return (
    <AuthContext.Provider value={{ triggerSessionExpired, clearSessionExpired }}>
      {children}
      {sessionExpired && <SessionExpiredModal onSuccess={clearSessionExpired} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
